# Bettership help center

Source for [docs.bettership.ai](https://docs.bettership.ai), hosted by Mintlify.

## Preview and verify

Install the official Mintlify CLI (`npm install -g mint`), then run:

```sh
mint dev
mint validate
mint broken-links
```

`docs.json` lives at the root. The landing page is `index.mdx`; each topic has its own directory. The starter set contains 20 articles: three introductions, five concept pages, four agent guides, and eight task guides. Detailed practice and application walkthroughs, roadmap, feedback, and changelog pages belong to follow-up work.

## Verification

The September 25 article set has been checked against product documents, shipped agent prompts and tools, the installed staging.12 app, and a local app built from IntoPractice main at `84f9904`. Each article records its evidence in `verified_against`; task pages also state the limits in `verification_status`. A date records the check performed, not proof of every possible input or operating-system state.

- Note, text-file, book, and public-link creation were exercised in staging. Current main was used again for note creation, processing, collection creation and filing, Settings, support chat entry, and the permission-settings link.
- An unreachable link exposed the Article error and Retry action. The retry returned the same error, as expected for an unavailable address. A separate 404 URL saved as a page, so the guide warns that a summary does not prove full text was retrieved.
- An 11-second docked capture on current main was paused and finished. Saved notes, the no-speech summary, search, and detail views were inspected. The disposable capture was deleted in the app and both local audio files removed. No recording remains active from this verification.
- Desktop and mobile previews, image loading, navigation, build validation, and broken-link checks were exercised. File testing covered text, not every listed media format. Clean installation, permission revocation, update restart, speech accuracy, and Watch window capture were not exercised.

### Known product and policy issues

[PRO-1658](https://linear.app/bettership/issue/PRO-1658) tracks pause state changing or disagreeing when a capture panel is moved between windows. The capture guide warns about that behavior and tells readers to finish when done. The docked capture check does not claim the bug is fixed.

The live privacy policy dated August 30 differs from current app behavior and the repository policy on audio retention, account exports, and diagnostics. Those differences are recorded on the existing [GTM-119 legal-review issue](https://linear.app/bettership/issue/GTM-119). The help article describes current storage and available controls. It does not assert that legal review is complete or repeat older promises from the public policy.

## Deployment

Mintlify workspace: `bettership-d7b13161`.

GitHub integration: `Bettership/docs`, branch `main`, with subdirectory mode off. Mintlify builds commits pushed to `main`. Use a feature branch and review changes before merging. Verify the resulting deployment in Mintlify Activity and on the public domain.

The branded scaffold was deployed and verified on September 25, 2026. The starter articles are delivered through the GTM-8 publication PR. Check the merged commit and Mintlify Activity for deployment status.

## Search and plan

Use ordinary search on Mintlify Starter. The trial Assistant was disabled and its removal verified on the public site on September 25, 2026. Do not enable it or upgrade the plan without Jesse's approval.

Follow `AGENTS.md` for terminology, sources, and page verification.
