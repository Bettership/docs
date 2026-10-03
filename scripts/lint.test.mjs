// Tests for scripts/lint.mjs. Run with `npm test`.
//
// The fixtures under scripts/fixtures/ are a small site. Pages outside bad/
// must pass every rule. Each page in bad/ fails for exactly one rule. The
// whole fixture site is linted once and every test reads that one result.

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const lint = path.join(here, 'lint.mjs');
const fixtures = path.join(here, 'fixtures');
const repoRoot = path.dirname(here);

const RULES = [
  'header-missing-key',
  'header-bad-kind',
  'header-bad-check',
  'header-placeholder',
  'header-description-length',
  'title-pattern',
  'link-text',
  'next-line',
  'word-limit',
  'image-count',
  'image-unlogged',
  'banned-word',
  'em-dash',
  'semicolon',
];

const PASSING = [
  'index.mdx',
  'learn/add-a-resource.mdx',
  'learn/focus-areas.mdx',
  'fix/a-resource-didnt-process.mdx',
  'fix/install-update-and-permission-problems.mdx',
  'agents/learn-with-scout.mdx',
  'plans/plans-and-whats-included.mdx',
];

// Each failing fixture, the one rule it fails, and words its message must carry.
const FAILING = {
  'bad/header-missing-key.mdx': { rule: 'header-missing-key', says: 'checked_on' },
  'bad/header-bad-kind.mdx': { rule: 'header-bad-kind', says: 'guide' },
  'bad/header-bad-check-prefix.mdx': { rule: 'header-bad-check', says: 'entry "note from a conversation" must start with' },
  'bad/header-bad-check-task-no-app.mdx': { rule: 'header-bad-check', says: 'needs an "app <version>" entry' },
  'bad/header-bad-check-agent-no-file.mdx': { rule: 'header-bad-check', says: 'needs a "file <path>" entry' },
  'bad/header-placeholder.mdx': { rule: 'header-placeholder', says: '<version>' },
  'bad/header-description-length.mdx': { rule: 'header-description-length', says: '110' },
  'bad/title-pattern-task.mdx': { rule: 'title-pattern', says: 'Adding' },
  'bad/title-pattern-fix.mdx': { rule: 'title-pattern', says: 'Install' },
  'bad/title-pattern-agent.mdx': { rule: 'title-pattern', says: 'Scout' },
  'bad/link-text-overlap.mdx': { rule: 'link-text', says: 'link text "Add resources"' },
  'bad/link-text-partial-word.mdx': { rule: 'link-text', says: 'link text "Add a resources"' },
  'bad/link-text-no-page.mdx': { rule: 'link-text', says: 'no page at /learn/nowhere' },
  'bad/link-text-card.mdx': { rule: 'link-text', says: 'Adding things' },
  'bad/next-line-not-last.mdx': { rule: 'next-line', says: 'last' },
  'bad/next-line-missing.mdx': { rule: 'next-line', says: 'Next' },
  'bad/word-limit.mdx': { rule: 'word-limit', says: '450' },
  'bad/image-count-idea.mdx': { rule: 'image-count', says: 'idea' },
  'bad/image-count-task.mdx': { rule: 'image-count', says: 'task' },
  'bad/image-unlogged.mdx': { rule: 'image-unlogged', says: 'images/learn/unlogged.png' },
  'bad/banned-word-hype.mdx': { rule: 'banned-word', says: 'seamless' },
  'bad/banned-word-user.mdx': { rule: 'banned-word', says: 'users' },
  'bad/banned-word-agent-lowercase.mdx': { rule: 'banned-word', says: 'scout' },
  'bad/banned-word-team.mdx': { rule: 'banned-word', says: 'your team' },
  'bad/banned-word-just.mdx': { rule: 'banned-word', says: 'just' },
  'bad/banned-word-simply.mdx': { rule: 'banned-word', says: 'simply' },
  'bad/banned-word-cannot.mdx': { rule: 'banned-word', says: 'cannot' },
  'bad/banned-word-descriptor.mdx': { rule: 'banned-word', says: 'retired descriptor' },
  'bad/banned-word-control-verbs.mdx': { rule: 'banned-word', says: 'say "choose"' },
  'bad/em-dash.mdx': { rule: 'em-dash', says: 'em dash' },
  'bad/semicolon.mdx': { rule: 'semicolon', says: 'semicolon' },
};

function run(args, opts = {}) {
  const res = spawnSync(process.execPath, [lint, ...args], { encoding: 'utf8', ...opts });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

// `path:line: rule: message` -> { file, line, rule, message }
function parse(stdout) {
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?):(\d+): ([a-z-]+): (.*)$/);
      assert.ok(m, `finding is not in path:line: rule: message form: ${line}`);
      return { file: m[1], line: Number(m[2]), rule: m[3], message: m[4] };
    });
}

let full;
let findings;
// A missing or crashing script prints nothing, which would let every "no
// findings" assertion pass. Each test that asserts an absence calls this first.
function lintRan() {
  assert.equal(full.stderr, '', 'lint wrote to stderr');
  assert.ok(findings.length > 0, 'lint reported nothing for the fixture site');
}
const forFile = (file) => {
  lintRan();
  return findings.filter((f) => f.file === file);
};

before(() => {
  full = run(['--root', fixtures]);
  findings = parse(full.stdout);
});

describe('whole fixture site', () => {
  test('exits 1 because the bad pages fail', () => {
    lintRan();
    assert.equal(full.code, 1, full.stderr);
  });

  test('prints nothing on stderr', () => {
    assert.equal(full.stderr, '');
  });

  test('every finding belongs to a known fixture', () => {
    lintRan();
    const known = new Set([...PASSING, ...Object.keys(FAILING)]);
    for (const f of findings) assert.ok(known.has(f.file), `unexpected file in output: ${f.file}`);
  });
});

describe('passing pages have no findings at all', () => {
  for (const file of PASSING) {
    test(file, () => {
      assert.deepEqual(forFile(file), []);
    });
  }
});

describe('each failing page fails for its one rule alone', () => {
  for (const [file, { rule, says }] of Object.entries(FAILING)) {
    test(`${file} -> ${rule}`, () => {
      const mine = forFile(file);
      assert.ok(mine.length > 0, `${file} produced no findings`);
      for (const f of mine) assert.equal(f.rule, rule, `${file} also failed ${f.rule}: ${f.message}`);
      assert.ok(
        mine.some((f) => f.message.includes(says)),
        `${file}: no ${rule} message mentions "${says}". Got: ${mine.map((f) => f.message).join(' | ')}`,
      );
    });
  }
});

describe('every rule is named in the output for a failing page and absent for passing pages', () => {
  for (const rule of RULES) {
    test(rule, () => {
      const failing = Object.entries(FAILING).filter(([, v]) => v.rule === rule).map(([k]) => k);
      assert.ok(failing.length > 0, `no failing fixture for ${rule}`);
      for (const file of failing) {
        assert.ok(forFile(file).some((f) => f.rule === rule), `${rule} missing for ${file}`);
      }
      for (const file of PASSING) {
        assert.ok(!forFile(file).some((f) => f.rule === rule), `${rule} fired on passing ${file}`);
      }
    });
  }
});

describe('review focus cases', () => {
  test('a title with an apostrophe passes title-pattern and link-text', () => {
    assert.deepEqual(forFile('fix/a-resource-didnt-process.mdx'), []);
    // The comma page links to the apostrophe page by its exact title.
    assert.deepEqual(forFile('fix/install-update-and-permission-problems.mdx'), []);
  });

  test('a fix title with commas passes because its first word is "Install,"', () => {
    assert.ok(!forFile('fix/install-update-and-permission-problems.mdx').some((f) => f.rule === 'title-pattern'));
    assert.ok(forFile('bad/title-pattern-fix.mdx').some((f) => f.rule === 'title-pattern'));
  });

  test('link text that contains the title as a whole phrase passes', () => {
    assert.ok(!forFile('learn/focus-areas.mdx').some((f) => f.rule === 'link-text'));
  });

  test('link text that only overlaps the title fails', () => {
    const hit = forFile('bad/link-text-overlap.mdx').find((f) => f.rule === 'link-text');
    assert.ok(hit, 'no link-text finding');
    assert.equal(hit.line, 10, 'the finding is not on the overlapping link');
  });

  test('a title that runs into a longer word is not a whole phrase', () => {
    // "Add a resources" contains "Add a resource", but a letter follows it.
    const hits = forFile('bad/link-text-partial-word.mdx').filter((f) => f.rule === 'link-text');
    assert.equal(hits.length, 1, 'expected exactly one link-text finding');
    assert.equal(hits[0].line, 10, 'the finding is not on the partial-word link');
  });

  test('each control word the style guide replaces is caught, and only those', () => {
    const words = forFile('bad/banned-word-control-verbs.mdx').map((f) => f.message.match(/^"([^"]+)"/)[1]);
    // "clickable", "blog in", "catalog in", and "stapler" on the same page must not fire.
    assert.deepEqual(words, ['Click', 'tap', 'clicked', 'log in', 'Enable', 'disable', 'toggle', 'changelog']);
  });

  test('findings carry the line of the offending text', () => {
    const [dash] = forFile('bad/em-dash.mdx');
    assert.equal(dash.line, 10);
    const [key] = forFile('bad/header-description-length.mdx');
    assert.equal(key.line, 3);
    const [placeholder] = forFile('bad/header-placeholder.mdx');
    assert.equal(placeholder.line, 6);
  });
});

describe('command line', () => {
  test('passing pages given as paths: exit 0 and no output', () => {
    const res = run(['--root', fixtures, ...PASSING]);
    assert.equal(res.stdout, '');
    assert.equal(res.stderr, '');
    assert.equal(res.code, 0);
  });

  test('a failing page given as a path: exit 1 and only that page reported', () => {
    const res = run(['--root', fixtures, 'bad/em-dash.mdx']);
    assert.equal(res.code, 1);
    const out = parse(res.stdout);
    assert.ok(out.length > 0);
    for (const f of out) assert.equal(f.file, 'bad/em-dash.mdx');
  });

  test('with no paths it skips _templates/ and drafts/', () => {
    lintRan();
    assert.ok(!findings.some((f) => f.file.startsWith('_templates/') || f.file.startsWith('drafts/')));
    // The skipped pages would fail if linted, so the skip is what keeps them out.
    const res = run(['--root', fixtures, '_templates/skipped.mdx', 'drafts/skipped.mdx']);
    assert.equal(res.code, 1);
  });

  test('without --root it lints the current directory', () => {
    lintRan();
    const res = run([], { cwd: fixtures });
    assert.equal(res.code, full.code);
    assert.equal(res.stdout, full.stdout);
  });

  test('the real page templates fail header-placeholder', () => {
    const kinds = ['task', 'fix', 'idea', 'lookup', 'agent'];
    const res = run(['--root', repoRoot, ...kinds.map((k) => `_templates/${k}.mdx`)]);
    const out = parse(res.stdout);
    for (const k of kinds) {
      assert.ok(
        out.some((f) => f.file === `_templates/${k}.mdx` && f.rule === 'header-placeholder'),
        `_templates/${k}.mdx did not fail header-placeholder`,
      );
    }
  });
});
