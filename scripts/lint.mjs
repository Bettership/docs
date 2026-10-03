#!/usr/bin/env node
// Help center lint.
//
//   node scripts/lint.mjs [--root <dir>] [paths...]
//
// Checks the mechanical half of the help center style guide (section 11,
// "Script"). Prints one `path:line: rule: message` line per finding and exits
// 1, or prints nothing and exits 0. With no paths it lints every .mdx page
// under the root except _templates/, drafts/, scripts/, node_modules/, dot
// folders, and *.draft.mdx. Paths are relative to the root, which is the
// current directory unless --root says otherwise.
//
// Rule names are a contract: the help center skills quote them. Keep them.
//
//   header-missing-key         a required header key is absent
//   header-bad-kind            kind is not one of the five
//   header-bad-check           checked_against is malformed or lacks the entry the kind needs
//   header-placeholder         a header value still holds a template <placeholder>
//   header-description-length  description is over 110 characters
//   title-pattern              the title does not follow its kind's pattern
//   link-text                  link or card text does not carry the target page's title
//   next-line                  not exactly one **Next:** line, or it is not last
//   word-limit                 body is over the kind's word limit
//   image-count                more pictures than the kind allows
//   image-unlogged             a picture is not in the header's images list
//   banned-word                a word the style guides ban
//   em-dash                    an em dash
//   semicolon                  a semicolon in prose

import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

// ---------------------------------------------------------------------------
// Settings a writer may need to extend
// ---------------------------------------------------------------------------

// A task title starts with one of these. A fix title must not.
const TASK_VERBS = [
  'Add', 'Save', 'Capture', 'Follow', 'Organize', 'Read', 'Explore', 'Run',
  'Set', 'Make', 'Use', 'Change', 'See', 'Delete', 'Reset', 'Contact',
  'Install', 'Review', 'Open', 'Find', 'Choose', 'Start', 'Finish',
  'Download', 'Export', 'Turn', 'Check',
];

// An agent page takes the name of its page in the app.
const AGENT_TITLES = ['Learn with Scout', 'Practice with Coach', 'Apply with Maker', 'Ask Steward'];

const KINDS = ['task', 'idea', 'lookup', 'fix', 'agent'];
const REQUIRED_KEYS = ['title', 'description', 'kind', 'checked_against', 'checked_on'];
const DESCRIPTION_MAX = 110;

// Help center style guide section 2: "Under 450 words" and "Under 500 words".
// A page fails at the limit itself. Lookup pages have no limit.
const WORD_LIMITS = { task: 450, fix: 450, agent: 450, idea: 500 };

// Task pages may have one picture. Every other kind has none.
const IMAGE_LIMITS = { task: 1, idea: 0, lookup: 0, fix: 0, agent: 0 };

// Pages with no kind: the landing page and What's new. They get only the
// prose rules (link-text, banned-word, em-dash, semicolon) and a description
// length check when they carry a description.
const NO_KIND_PAGES = new Set(['index.mdx', 'whats-new.mdx']);

// Folders never linted or treated as published pages.
const SKIP_DIRS = new Set(['_templates', 'drafts', 'scripts', 'node_modules']);

// ---------------------------------------------------------------------------
// banned-word
//
// Sources, quoted so each entry can be traced:
//
// Bettership style guide (docs/product/style-guide.md), "Words to avoid":
//   revolutionary, game-changing, cutting-edge / leverage, utilize /
//   unlock, supercharge, turbocharge / seamless, frictionless / journey /
//   empower / solution / substrate, spine / moat
//   ("content" as a mass noun is also listed there. It is left out here
//   because "content" has honest uses a word match cannot tell apart.)
// Bettership style guide, "Product names and formatting":
//   Bare "your team" / "the team" remain banned in learner-facing copy.
//   Steward, Scout, Coach, and Maker are proper names. Capitalize them.
// Help center style guide (docs/product/help-center-style-guide.md) section 6:
//   Hype words, "journey," "seamless," "leverage," "unlock," and "empower"
//   are banned here as everywhere. Add "simply" and "just".
//   Never mix "can't" and "cannot" on one page without that reason.
// Repo terminology: "learner", never "user". The retired descriptor is
//   "a personal learning workspace with a team of AI agents".
//
// "just" is matched in every position, so "just now" and "just as" also
// fail. That false-positive risk is accepted: the word is almost always
// filler on a help page, and rewording costs little.
//
// Matching skips front matter, code spans, fenced code, link targets, URLs,
// file paths, and component attributes other than a card's title.
// ---------------------------------------------------------------------------

const HYPE = [
  'revolutionary', 'game-changing', 'cutting-edge',
  'leverage', 'leverages', 'leveraged', 'leveraging',
  'utilize', 'utilizes', 'utilized', 'utilizing',
  'unlock', 'unlocks', 'unlocked', 'unlocking',
  'supercharge', 'supercharges', 'supercharged', 'supercharging',
  'turbocharge', 'turbocharges', 'turbocharged', 'turbocharging',
  'seamless', 'seamlessly', 'frictionless',
  'journey', 'journeys',
  'empower', 'empowers', 'empowered', 'empowering', 'empowerment',
  'solution', 'solutions',
  'substrate', 'spine',
  'moat',
];

const BANNED = [
  { re: /\busers?\b/gi, why: 'say "learner"' },
  { re: /\b(?:steward|scout|coach|maker)\b/g, why: 'agent names are capitalized' },
  { re: /\b(?:your|the) team\b/gi, why: 'say "the Bettership agents"' },
  { re: /\bsimply\b/gi, why: 'drop "simply"' },
  { re: /\bjust\b/gi, why: 'drop "just"' },
  { re: /\ba personal learning workspace with a team of AI agents\b/gi, why: 'is the retired descriptor' },
  { re: new RegExp(`\\b(?:${HYPE.join('|')})\\b`, 'gi'), why: 'is a banned hype word' },
];
const CANNOT = /\bcannot\b/gi;
const CANT = /\bcan['’]t\b/i;

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  let root = process.cwd();
  const paths = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') {
      i += 1;
      if (argv[i] === undefined) fail('--root needs a directory');
      root = path.resolve(argv[i]);
    } else {
      paths.push(argv[i]);
    }
  }
  return { root, paths };
}

function fail(message) {
  process.stderr.write(`lint: ${message}\n`);
  process.exit(2);
}

const withArticle = (kind) => `${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind}`;
const toPosix = (p) => p.split(path.sep).join('/');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (entry.name.endsWith('.mdx') && !entry.name.endsWith('.draft.mdx')) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reading a page
// ---------------------------------------------------------------------------

const TOP_KEY = /^([A-Za-z_][\w-]*)\s*:/;

function readPage(root, file) {
  const rel = toPosix(path.relative(root, file));
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const page = { rel, header: null, headerError: null, fmLines: [], body: text, bodyLine: 1 };
  if (lines[0].trim() !== '---') return page;
  const close = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (close === -1) {
    page.headerError = 'the header has no closing ---';
    return page;
  }
  page.fmLines = lines.slice(1, close);
  page.body = lines.slice(close + 1).join('\n');
  page.bodyLine = close + 2;
  try {
    const parsed = parseYaml(page.fmLines.join('\n'));
    page.header = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    page.headerError = `the header is not valid YAML: ${err.message.split('\n')[0]}`;
  }
  return page;
}

// Line number of a top-level header key, or 1 when it is not there.
function keyLine(page, key) {
  const i = page.fmLines.findIndex((l) => {
    const m = l.match(TOP_KEY);
    return m && m[1] === key;
  });
  return i === -1 ? 1 : i + 2;
}

// Line number of the first line under a key that contains `needle`.
function valueLine(page, key, needle) {
  const start = keyLine(page, key);
  if (start === 1) return 1;
  for (let i = start - 2; i < page.fmLines.length; i += 1) {
    const l = page.fmLines[i];
    if (i > start - 2 && TOP_KEY.test(l)) break;
    if (l.trimStart().startsWith('#')) continue;
    if (l.includes(needle)) return i + 2;
  }
  return start;
}

// ---------------------------------------------------------------------------
// Masking. Each mask swaps a span for spaces of the same length and keeps
// newlines, so an index into the masked text is an index into the body.
// ---------------------------------------------------------------------------

const blank = (s) => s.replace(/[^\n]/g, ' ');

function maskFences(text) {
  let open = null;
  return text
    .split('\n')
    .map((line) => {
      const fence = line.match(/^\s*(`{3,}|~{3,})/);
      if (open) {
        if (fence && fence[1][0] === open[0] && fence[1].length >= open.length) open = null;
        return blank(line);
      }
      if (fence) {
        open = fence[1];
        return blank(line);
      }
      return line;
    })
    .join('\n');
}

// Code, comments, and import or export lines. Nothing in these is prose.
function maskCode(text) {
  return maskFences(text)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/^(?:import|export)\s.*$/gm, blank)
    .replace(/(`+)[^`\n][\s\S]*?\1/g, (m) => (m.includes('\n\n') ? m : blank(m)));
}

const TAG = /<\/?[A-Za-z][^>]*>/g;
const LINK_TARGET = /(\]\()([^)\n]*)(\))/g;
const URL = /\b(?:https?:\/\/|mailto:)\S+/g;
const PATH = /[^\s()[\]"'`*]*\/[^\s()[\]"'`*]*/g;
const FILE_NAME = /\b[\w.-]+\.(?:mdx?|tsx?|jsx?|mjs|py|json|ya?ml|png|jpe?g|svg|gif|pdf)\b/g;
const ENTITY = /&(?:#\d+|#x[\da-f]+|\w+);/gi;
const EXPRESSION = /\{[^{}\n]*\}/g;

// A tag with everything blanked except the value of its title attribute.
function maskTagKeepTitle(tag) {
  const m = tag.match(/\btitle=(["'])(.*?)\1/);
  if (!m) return blank(tag);
  const start = m.index + m[0].indexOf(m[1]) + 1;
  const end = start + m[2].length;
  return blank(tag.slice(0, start)) + tag.slice(start, end) + blank(tag.slice(end));
}

// Prose as the reader sees it. keepTitles leaves card titles visible.
function maskProse(codeMasked, { keepTitles = false } = {}) {
  return codeMasked
    .replace(TAG, keepTitles ? maskTagKeepTitle : blank)
    .replace(LINK_TARGET, (m, a, target, c) => a + blank(target) + c)
    .replace(URL, blank)
    .replace(PATH, blank)
    .replace(FILE_NAME, blank)
    .replace(ENTITY, blank)
    .replace(EXPRESSION, blank);
}

function lineAt(page, text, index) {
  let n = 0;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) n += 1;
  return page.bodyLine + n;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function checkHeader(page, report) {
  const isNoKind = NO_KIND_PAGES.has(page.rel);
  if (page.headerError) {
    if (!isNoKind) report(1, 'header-missing-key', page.headerError);
    return;
  }
  const h = page.header;
  if (isNoKind) {
    if (h) checkDescription(page, report);
    return;
  }
  if (!h) {
    report(1, 'header-missing-key', 'the page has no header');
    return;
  }

  for (const key of REQUIRED_KEYS) {
    if (h[key] === undefined || h[key] === null || h[key] === '') {
      // An empty key reports on its own line. An absent one reports line 1.
      report(keyLine(page, key), 'header-missing-key', `the header has no "${key}"`);
    }
  }

  if (h.kind != null && !KINDS.includes(h.kind)) {
    report(keyLine(page, 'kind'), 'header-bad-kind', `kind "${h.kind}" is not one of ${KINDS.join(', ')}`);
  }

  checkChecks(page, report);
  checkPlaceholders(page, report);
  checkDescription(page, report);
  checkTitle(page, report);
}

function checkDescription(page, report) {
  const d = page.header.description;
  if (typeof d === 'string' && d.length > DESCRIPTION_MAX) {
    report(
      keyLine(page, 'description'),
      'header-description-length',
      `description is ${d.length} characters, keep it to ${DESCRIPTION_MAX}`,
    );
  }
}

function checkChecks(page, report) {
  const h = page.header;
  const checks = h.checked_against;
  if (checks == null) return; // header-missing-key already said so
  const line = keyLine(page, 'checked_against');
  if (!Array.isArray(checks)) {
    report(line, 'header-bad-check', 'checked_against must be a list');
    return;
  }
  if (checks.length === 0) {
    report(line, 'header-bad-check', 'checked_against lists nothing');
    return;
  }
  for (const entry of checks) {
    if (typeof entry !== 'string' || !/^(?:app|file|doc) \S/.test(entry)) {
      const shown = typeof entry === 'string' ? entry : JSON.stringify(entry);
      report(
        valueLine(page, 'checked_against', String(shown)),
        'header-bad-check',
        `entry "${shown}" must start with "app ", "file ", or "doc "`,
      );
    }
  }
  const has = (prefix) => checks.some((e) => typeof e === 'string' && e.startsWith(`${prefix} `));
  if ((h.kind === 'task' || h.kind === 'fix') && !has('app')) {
    report(line, 'header-bad-check', `${withArticle(h.kind)} page needs an "app <version>" entry`);
  }
  if (h.kind === 'agent' && !has('file')) {
    report(line, 'header-bad-check', 'an agent page needs a "file <path>" entry for its prompt');
  }
}

function checkPlaceholders(page, report) {
  const visit = (key, value) => {
    if (typeof value === 'string') {
      const m = value.match(/<[^<>\n]+>/);
      if (m) {
        report(valueLine(page, key, m[0]), 'header-placeholder', `${key} still holds the placeholder "${m[0]}"`);
      }
    } else if (Array.isArray(value)) {
      value.forEach((v) => visit(key, v));
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach((v) => visit(key, v));
    }
  };
  for (const [key, value] of Object.entries(page.header)) visit(key, value);
}

function checkTitle(page, report) {
  const { title, kind } = page.header;
  if (typeof title !== 'string' || !KINDS.includes(kind)) return;
  const line = keyLine(page, 'title');
  // The first whitespace-delimited word, trailing punctuation included, so
  // "Install," in "Install, update, and permission problems" is not "Install".
  const first = title.trim().split(/\s+/)[0];
  if (kind === 'task' && !TASK_VERBS.includes(first)) {
    report(line, 'title-pattern', `task title "${title}" should start with a verb such as Add or Save ("${first}" is not on the list in scripts/lint.mjs)`);
  }
  if (kind === 'fix' && TASK_VERBS.includes(first)) {
    report(line, 'title-pattern', `fix title "${title}" reads as a command, name the symptom instead`);
  }
  if (kind === 'agent' && !AGENT_TITLES.includes(title)) {
    report(line, 'title-pattern', `agent title "${title}" must be one of: ${AGENT_TITLES.join(', ')}`);
  }
}

// --- link-text -------------------------------------------------------------

// Address of a page: its path from the root without .mdx, where
// section/index is also the section's own address.
function addressOf(rel) {
  const noExt = rel.replace(/\.mdx$/, '');
  if (noExt === 'index') return '';
  return noExt.endsWith('/index') ? noExt.slice(0, -'/index'.length) : noExt;
}

function buildTitles(pages) {
  const titles = new Map();
  for (const p of pages) {
    const title = p.header && typeof p.header.title === 'string' ? p.header.title : null;
    titles.set(addressOf(p.rel), title);
  }
  return titles;
}

const isLetter = (ch) => ch !== undefined && /\p{L}/u.test(ch);

// The title appears in the text as a whole phrase: not part of a longer word.
function containsPhrase(text, title) {
  if (!title) return false;
  let from = 0;
  for (;;) {
    const i = text.indexOf(title, from);
    if (i === -1) return false;
    if (!isLetter(text[i - 1]) && !isLetter(text[i + title.length])) return true;
    from = i + 1;
  }
}

function checkLinks(page, titles, codeMasked, report) {
  const links = [];
  const md = /(?<!!)\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const m of codeMasked.matchAll(md)) links.push({ index: m.index, text: m[1], href: m[2] });
  for (const m of codeMasked.matchAll(/<Card\b[^>]*>/g)) {
    const title = m[0].match(/\btitle=(["'])(.*?)\1/);
    const href = m[0].match(/\bhref=(["'])(.*?)\1/);
    if (href) links.push({ index: m.index, text: title ? title[2] : '', href: href[2] });
  }
  for (const link of links) {
    if (!link.href.startsWith('/') || link.href.startsWith('//')) continue;
    const address = link.href.replace(/[#?].*$/, '').replace(/^\/+|\/+$/g, '');
    if (/\.[A-Za-z0-9]+$/.test(address)) continue; // a file such as an image, not a page
    const line = lineAt(page, codeMasked, link.index);
    const shownAddress = `/${address}`;
    if (!titles.has(address)) {
      report(line, 'link-text', `no page at ${shownAddress}`);
      continue;
    }
    const title = titles.get(address);
    if (!title) {
      report(line, 'link-text', `the page at ${shownAddress} has no title to match`);
      continue;
    }
    const text = link.text.replace(/\*\*|__|`/g, '').trim();
    if (text !== title && !containsPhrase(text, title)) {
      report(line, 'link-text', `link text "${text}" does not carry the title of ${shownAddress}, "${title}"`);
    }
  }
}

// --- next-line -------------------------------------------------------------

function checkNext(page, codeMasked, report) {
  const lines = codeMasked.split('\n');
  const nextLines = [];
  lines.forEach((l, i) => {
    if (l.includes('**Next:** [')) nextLines.push(i);
  });
  let last = lines.length - 1;
  while (last > 0 && lines[last].trim() === '') last -= 1;
  if (nextLines.length === 0) {
    report(page.bodyLine + last, 'next-line', 'the page has no "**Next:** [" line');
    return;
  }
  if (nextLines.length > 1) {
    for (const i of nextLines.slice(1)) {
      report(page.bodyLine + i, 'next-line', `${nextLines.length} **Next:** lines, keep exactly one`);
    }
    return;
  }
  if (nextLines[0] !== last) {
    report(page.bodyLine + nextLines[0], 'next-line', 'the **Next:** line must be the last line of the page');
  }
}

// --- word-limit ------------------------------------------------------------

// Body words only: components, link targets, comments, and the Next line do
// not count. Code does, since the reader reads it. A word is any
// whitespace-separated token with a letter or digit in it, so markdown marks
// such as "##", "1.", "|", and "```" are not words.
function checkWords(page, kind, codeMasked, report) {
  const limit = WORD_LIMITS[kind];
  if (!limit) return;
  const nextLines = codeMasked.split('\n').map((l) => l.includes('**Next:** ['));
  const counted = page.body
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/^(?:import|export)\s.*$/gm, blank)
    .replace(TAG, blank)
    .replace(LINK_TARGET, (m, a, target, c) => a + blank(target) + c)
    .replace(EXPRESSION, blank)
    .split('\n')
    .map((l, i) => (nextLines[i] ? blank(l) : l))
    .join('\n');
  let count = 0;
  let limitAt = 0;
  for (const m of counted.matchAll(/\S+/g)) {
    if (!/[\p{L}\p{N}]/u.test(m[0])) continue;
    count += 1;
    if (count === limit) limitAt = m.index;
  }
  if (count >= limit) {
    report(lineAt(page, counted, limitAt), 'word-limit', `${count} words, ${withArticle(kind)} page must stay under ${limit}`);
  }
}

// --- pictures --------------------------------------------------------------

const normalizeImage = (src) => src.trim().replace(/^\.?\/+/, '');

function findImages(codeMasked) {
  const images = [];
  for (const m of codeMasked.matchAll(/<img\b[^>]*>/g)) {
    const src = m[0].match(/\bsrc=(["'])(.*?)\1/);
    images.push({ index: m.index, src: src ? src[2] : null });
  }
  for (const m of codeMasked.matchAll(/!\[[^\]\n]*\]\(([^)\s]+)[^)]*\)/g)) {
    images.push({ index: m.index, src: m[1] });
  }
  return images.sort((a, b) => a.index - b.index);
}

function checkImages(page, kind, codeMasked, report) {
  const images = findImages(codeMasked);
  const allowed = IMAGE_LIMITS[kind];
  if (allowed !== undefined && images.length > allowed) {
    const message =
      allowed === 0
        ? `a picture on ${withArticle(kind)} page, only task pages may have one`
        : `${images.length} pictures on ${withArticle(kind)} page, at most ${allowed}`;
    for (const img of images.slice(allowed)) {
      report(lineAt(page, codeMasked, img.index), 'image-count', message);
    }
  }

  const logged = new Set();
  const entries = page.header.images;
  if (entries != null) {
    const list = Array.isArray(entries) ? entries : [entries];
    for (const entry of list) {
      if (typeof entry !== 'string' || !/^\S+ app \S+$/.test(entry.trim())) {
        const shown = typeof entry === 'string' ? entry : JSON.stringify(entry);
        report(
          valueLine(page, 'images', String(shown)),
          'image-unlogged',
          `images entry "${shown}" must be "<path> app <version>"`,
        );
      }
      if (typeof entry === 'string') logged.add(normalizeImage(entry.trim().split(/\s+/)[0]));
    }
  }
  for (const img of images) {
    if (img.src === null) {
      report(lineAt(page, codeMasked, img.index), 'image-unlogged', 'a picture with no src');
      continue;
    }
    const src = normalizeImage(img.src);
    if (!logged.has(src)) {
      report(lineAt(page, codeMasked, img.index), 'image-unlogged', `picture ${src} is not in the header's images list`);
    }
  }
}

// --- prose -----------------------------------------------------------------

function checkBanned(page, codeMasked, report) {
  const prose = maskProse(codeMasked, { keepTitles: true });
  const rules = [...BANNED];
  if (CANT.test(prose)) rules.push({ re: CANNOT, why: 'on a page that also says "can\'t", pick one' });
  const hits = [];
  for (const { re, why } of rules) {
    for (const m of prose.matchAll(re)) hits.push({ index: m.index, message: `"${m[0]}": ${why}` });
  }
  hits.sort((a, b) => a.index - b.index);
  for (const hit of hits) report(lineAt(page, prose, hit.index), 'banned-word', hit.message);
}

function checkDashes(page, report) {
  for (const m of page.body.matchAll(/—/g)) {
    report(lineAt(page, page.body, m.index), 'em-dash', 'em dash, use a comma, colon, period, or parentheses');
  }
}

function checkSemicolons(page, codeMasked, report) {
  const prose = maskProse(codeMasked);
  for (const m of prose.matchAll(/;/g)) {
    report(lineAt(page, prose, m.index), 'semicolon', 'semicolon in prose, split the sentence or use a comma');
  }
}

// ---------------------------------------------------------------------------

function lintPage(page, titles) {
  const findings = [];
  const report = (line, rule, message) => findings.push({ line, rule, message });
  const codeMasked = maskCode(page.body);
  const isNoKind = NO_KIND_PAGES.has(page.rel);

  checkHeader(page, report);

  const kind = page.header && KINDS.includes(page.header.kind) ? page.header.kind : null;
  if (!isNoKind) {
    checkNext(page, codeMasked, report);
    if (kind) {
      checkWords(page, kind, codeMasked, report);
    }
    if (page.header) checkImages(page, kind, codeMasked, report);
  }
  checkLinks(page, titles, codeMasked, report);
  checkBanned(page, codeMasked, report);
  checkDashes(page, report);
  checkSemicolons(page, codeMasked, report);

  return findings.sort((a, b) => a.line - b.line);
}

function main() {
  const { root, paths } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) fail(`no directory at ${root}`);

  const site = walk(root).map((f) => readPage(root, f));
  const titles = buildTitles(site);

  let targets;
  if (paths.length === 0) {
    targets = site;
  } else {
    const files = [];
    for (const p of paths) {
      const full = path.resolve(root, p);
      if (!fs.existsSync(full)) fail(`no such file: ${p}`);
      if (fs.statSync(full).isDirectory()) files.push(...walk(full));
      else files.push(full);
    }
    targets = files.map((f) => readPage(root, f));
  }
  targets.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

  const out = [];
  for (const page of targets) {
    for (const f of lintPage(page, titles)) out.push(`${page.rel}:${f.line}: ${f.rule}: ${f.message}`);
  }
  if (out.length > 0) {
    process.stdout.write(`${out.join('\n')}\n`);
    process.exitCode = 1;
  }
}

main();
