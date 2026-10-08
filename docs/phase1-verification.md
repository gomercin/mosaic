# Phase 1 verification

Verified on 9 October 2026 using Node.js 22.23.3 against the main-branch foundation, in an isolated worktree. The original checkout's unfinished V2 UI changes are outside this PR.

## Local checks

- `npm ci`: lockfile dependencies installed under Node 22.
- `npm test`: typecheck, deterministic public regeneration, public validation, and 66 tests passed (16 pipeline, 6 inventory, 3 loader, 41 deploy audit).
- `npm run build`: generated-data check, public validation, TypeScript, Vite production compilation, and actual deploy-tree audit passed.
- Public artifacts: exactly `index.html`, one compiled JS file, one CSS file, and `data/mosaic.json`; no sample, sources, source maps, extra JSON, symlinks, or private canaries. Deployed JSON matches the generated projection byte for byte. Production JavaScript excludes Studio and private narrative fields.
- Read-only source schema check: all 25 supplied JSON exports passed the proposed `0.2` shape. Real exports were inventoried, never normalized into the PoC or copied into assets/Git.
- `git diff --check`: passed.

## Production browser check

Served the audited `dist/` using Vite preview. Verified:

1. The app visibly identifies the dataset and person as synthetic.
2. Feedback inspection opens two distinct connected projects; selecting the engineering project reveals contribution, team/AI attribution, result, limitation, link explanation, confidence, and confirmation.
3. The stakeholder project retains a stopped outcome and absent adoption evidence.
4. Keyboard selection opens the research project, which displays an unrun idea, low-confidence candidate, and awaiting-confirmation status.
5. Timeline provides a readable path to the same evidence stories.
6. Long evidence stories scroll within the overview drawer. Project labels no longer overlap capability labels in this small slice.
7. Browser console had no errors or warnings during the exercised path.

Two existing layout limitations exposed by the slice were fixed narrowly: the drawer now constrains and scrolls its story, and project placement separates labels from capability anchors. This is a three-project usability check, not a large-corpus layout/performance certificate or a full accessibility/mobile audit.

Hosted CI, merge, and deployment are separate states. The PR workflow will run the same validation and build audit. No merge or deployment is performed for this preparatory change. Owner review of meaning and information density is still required before expanding to real content or phase 2.
