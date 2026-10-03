# Bettership help center

The source of [docs.bettership.ai](https://docs.bettership.ai), the help center for Bettership learners. It is built by Mintlify from MDX pages in this repository. Contributors, human or agent, should start with [AGENTS.md](AGENTS.md).

## Structure

- `index.mdx` is the landing page.
- Seven sections hold the articles, one directory each: `get-started`, `learn`, `practice`, `apply`, `focus`, `account`, and `fix`. `docs.json` lists them in sidebar order and holds the redirects from older addresses.
- `_templates/` holds a skeleton for each of the five page kinds. Mintlify ignores it.
- `scripts/` holds the lint script, its tests, and the old-address redirect check. Mintlify ignores it.
- `images/` holds screenshots. Each picture is listed, with the app version it was shot on, in the header of the page that uses it.
- `logo/` and `favicon.svg` hold the brand assets.

## Run it locally

Install the dependencies and the official Mintlify CLI, then preview:

```sh
npm ci
npm install -g mint
mint dev
```

To check your work the way CI does:

```sh
npm test
node scripts/lint.mjs
npx mint validate
npx mint broken-links
```

After a deploy, `bash scripts/check-redirects.sh` confirms that the old addresses still reach their new pages.

## What CI checks

`.github/workflows/checks.yml` runs on every pull request and on pushes to `main`. It runs the lint script's tests, the lint on every page, `mint validate`, and `mint broken-links`. The lint checks each page's header, its title against its kind, link text, the ending, length, pictures, and the style guides' word rules.

## How changes publish

Mintlify is connected to `Bettership/docs`, branch `main`, with subdirectory mode off. Merging to `main` deploys the site. Work on a feature branch and open a pull request, and never push to `main`. Verify a deploy in Mintlify Activity and on the public domain.

Every pull request carries `new` or `update`, plus `hold-for-release` when the feature has not reached learners. [AGENTS.md](AGENTS.md) has the details.

- `new`: a new article or idea page. Jesse merges it after review.
- `update`: a factual update to an existing page. It auto-merges when the checks are green and the body records the walk or evidence in a `## Walk` or `## Evidence` section, as long as it changes only pages, `docs.json`, and images.
- `hold-for-release`: the feature is not yet in a release. The release step merges it.

## Search and plan

The site uses Mintlify's ordinary search on the Starter plan. The AI Assistant is off. Do not enable it or upgrade the plan without Jesse's approval.
