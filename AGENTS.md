# Bettership help center

This repository publishes to https://docs.bettership.ai through Mintlify. Content is MDX. `docs.json` is at the repository root. Changes merged into `main` deploy automatically.

## Writing

- Write for learners, not students. Use active voice, second person, and sentence case headings.
- Bettership is a personal AI workspace for ambitious professionals leveling up with online learning.
- Steward, Scout, Coach, and Maker are proper names. Collectively use “the Bettership agents” or “your Bettership agents,” never “your team.”
- Use resource, Focus Area, practice plan, and capture. Recording means literal audio collection.
- Say “the Bettership desktop app,” not “the Mac app.”
- Read the current `docs/product/style-guide.md`, `docs/product/messaging-bank.md`, and `docs/product/voice/bettership-voice.md` in Bettership/IntoPractice before authoring. Those files are the writing authorities.
- Concept pages draw from current product documents. Agent capability pages draw from shipped prompts and tools. Task guides must be walked in the running app. Specs and plans are not evidence that a feature works.
- Keep `title`, `tier`, `verified_against`, and `last_verified` frontmatter. Do not display verification metadata in page content or invent a verification date.

## Scope and validation

The section pages currently reserve places for articles. Replace their preparation notices when verified guides are ready. Do not present placeholders as instructions.

Keep ordinary search working on Mintlify Starter. AI Assistant is a paid feature after the trial. Do not enable paid features or upgrade the plan without Jesse's approval.

Work on a feature branch. Run `mint validate` and `mint broken-links`, then inspect `mint dev` at desktop and mobile widths before proposing publication. Never push directly to `main`.
