# Bettership help center

Source for [docs.bettership.ai](https://docs.bettership.ai), hosted by Mintlify.

## Preview and verify

Install the official Mintlify CLI (`npm install -g mint`), then run:

```sh
mint dev
mint validate
mint broken-links
```

`docs.json` lives at the root. The landing page is `index.mdx`; each topic has its own directory. The section pages are scaffolding for the article-writing task, not finished guides. Add articles to the existing sections and update `docs.json` as they are ready. Roadmap, feedback, and changelog pages belong to their follow-up tasks.

## Deployment

Mintlify workspace: `bettership-d7b13161`.

GitHub integration: `Bettership/docs`, branch `main`, with subdirectory mode off. Mintlify builds commits pushed to `main`. Use a feature branch and review changes before merging. Verify the resulting deployment in Mintlify Activity and on the public domain.

On September 25, 2026, the dashboard showed the custom domain connected and the GitHub app installed. The live domain served the starter template before this change. A new deployment has not yet been verified for this branch.

## Search and plan

Use ordinary search on the free Starter plan. Mintlify's current pricing excludes AI Assistant from Starter; Pro is $450 per month. The dashboard showed an Assistant trial through October 5, 2026. The original issue's “Hobby, 5K credits/month” acceptance is outdated. See [Mintlify pricing](https://www.mintlify.com/pricing).

Follow `AGENTS.md` for terminology, sources, and page verification.
