---
name: bump-version
description: >-
  Mandatory version-bump workflow for every conversation that changes code,
  data, styles, assets, or configuration in this repository. Use before
  wrapping up any conversation with edits so package.json (displayed in the
  footer via Vite __APP_VERSION__) is incremented once per conversation.
---

# Bump WODROLL App Version

`package.json` is the single source of truth for the WODROLL version. `vite.config.js` injects it as `__APP_VERSION__`, and `UI.renderAppVersion()` displays it in the `#appVersionBadge` pill in the page footer.

## Rules

1. **Bump once per conversation with repository edits.**
   - Skip bumping only for purely read-only Q&A conversations where no files are modified.
   - In multi-turn conversations, check `git diff package.json` first: if `package.json` already has an uncommitted version bump from an earlier turn in this conversation, do **not** bump it again.
2. **Choose the SemVer increment:**
   - `patch` (default, `X.Y.Z+1`): bug fixes, UI tweaks, movement/animation updates, refactors, or small improvements.
   - `minor` (`X.Y+1.0`): notable new user-facing features or capabilities.
   - `major` (`X+1.0.0`): breaking architectural or UX overhauls (only when clearly warranted or requested).

## Workflow

1. Check whether `package.json` was already bumped in the current conversation:
   ```sh
   git diff package.json
   ```
2. Run the bump helper (updates both `package.json` and `package-lock.json`):
   ```sh
   node .agents/skills/bump-version/scripts/bump_version.mjs patch
   ```
   *(Pass `minor`, `major`, or an explicit `X.Y.Z` instead of `patch` when appropriate.)*
3. Verify the build (and kinematics suite when code/data changed):
   ```sh
   npm test && npm run build
   ```
