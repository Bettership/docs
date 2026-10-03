# Contributing to the Bettership help center

This repository is the source of https://docs.bettership.ai, built by Mintlify. This file is for agents and people alike. It says where the rules live and how the repository works. It does not restate the rules.

## Where the rules live

The writing rules are in the `Bettership/IntoPractice` repository, which is private. A writer needs access to it.

- `docs/product/help-center-style-guide.md` is the authority for help center pages: the five kinds, names and addresses, words, endings, pictures, formatting, the page header, and the checklists.
- `docs/product/style-guide.md` is the general style guide that the help center guide builds on.

Read both before writing or editing a page. If a rule is not in them, it is not a rule.

In this repository:

- `_templates/` holds one skeleton per kind. Copy the one you need and fill it in.
- `scripts/lint.mjs` holds the mechanical checks. It enforces the style guides' word rules and formatting rules, so you do not need to memorize them.

## The five kinds

Every page is exactly one kind. Pick the kind first, then copy its template from `_templates/`.

- `task`: walk one job to its result.
- `idea`: explain one thing and why it is shaped that way.
- `lookup`: facts to look up, mostly tables.
- `fix`: take a symptom to a remedy.
- `agent`: what to ask one of the Bettership agents, where it is, and what it can and cannot do.

## The page header

Every page opens with a header that nothing renders. The keys, in order:

1. `title`
2. `description`
3. `kind`
4. `checked_against`
5. `checked_on`
6. `images` (leave it out when the page has no pictures)

Each `checked_against` entry starts with a prefix: `app` and a desktop version, `file` and a path in `IntoPractice`, or `doc` and a path under `docs/` in `IntoPractice`. Section 10 of the help center style guide says which kinds need which entries.

## Pull requests and labels

Work on a feature branch and open a pull request. Never push to `main`. Merging to `main` publishes the site.

Label every pull request with one of three labels:

- `new`: a new article or idea page. Jesse merges after his review.
- `update`: a factual update to an existing page. It auto-merges when the checks are green.
- `hold-for-release`: the feature is not yet in a release. The release step merges it, and nobody merges it early.

A page for a feature that has not reached learners is opened on a `hold-for-release` pull request. Do not merge it early.

## Commands

Run these from the repository root.

```sh
npm ci                              # install, once
npm test                            # test the lint script
node scripts/lint.mjs               # lint every page
node scripts/lint.mjs path/to.mdx   # lint only the pages you name
npx mint validate                   # validate the site
npx mint broken-links               # check links
npx mint dev                        # preview locally
bash scripts/check-redirects.sh     # after a deploy, check the old addresses redirect
```

`.github/workflows/checks.yml` runs `npm test`, the lint, `mint validate`, and `mint broken-links` on every pull request. A pull request does not merge until they pass.

## Repository rules

- Edit content through git only. Never use the Mintlify web editor.
- Do not enable paid Mintlify features or change the plan without Jesse's approval.
- This repository is public. Do not put Linear issue ids, secrets, staging addresses, or anything that identifies a learner in a page, a commit message, or a pull request.
