# Mosaic Implementation Tasks

This tracker keeps the next implementation slice bite-sized and handoff-friendly for agents.

Reference inputs:

- `docs/CODEX_HANDOFF.md` is the product north star.
- `docs/mockup.png` is visual inspiration, not a pixel-perfect specification.

Constraints for every task:

- Keep the app static-first with JSON from `public/data`.
- Do not add major dependencies.
- Do not add a backend, auth, database, CMS, analytics, or hosted Studio behavior.
- Keep `privateNotes` local-only and never render it in public UI.

Status values: `todo`, `in-progress`, `done`.

| Task | Status | Commit | Verification | Notes |
| --- | --- | --- | --- | --- |
| T0 - Add implementation tracker and mockup reference | in-progress | pending | `git status --short` | Commit `docs/mockup.png` intentionally. |
| T1 - Add Principles and Patterns public lens | todo | pending | `npm test` | Add a lightweight `principles` view mode. |
| T2 - Add shared graph/relationship helpers | todo | pending | `npm test` | Keep helpers pure and dependency-free. |
| T3 - Lightweight mockup-inspired overview refresh | todo | pending | `npm test`, `npm run build` | Use CSS/SVG only. |
| T4 - Strengthen detail panel storytelling | todo | pending | `npm test` | Make revealed patterns prominent; never render `privateNotes`. |
| T5 - Timeline lightweight ribbon pass | todo | pending | `npm test`, `npm run build` | Prepare for future morph, do not implement it yet. |
| T6 - Studio workflow light staging | todo | pending | `npm test` | Preserve local import/export and validation. |
| T7 - Visual token and mockup hook cleanup | todo | pending | `npm test`, `npm run build` | Create hooks for later ChatGPT-guided polish. |
| T8 - Final verification and review commit | todo | pending | `npm ci`, `npm test`, `npm run build` | Update this tracker with final commit hashes. |

## ChatGPT Collaboration Checkpoints

- After T1/T3: ask ChatGPT whether the information architecture reads as a capability atlas within 10 seconds.
- After T4/T5: ask ChatGPT which story sections and timeline moments should be emphasized.
- After T7: ask ChatGPT for visual critique around color balance, density, constellation atmosphere, and reducing dashboard feel.

## Final Acceptance Checklist

- [ ] `npm ci` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] No new major dependencies are added.
- [ ] Static JSON architecture remains intact.
- [ ] Overview, timeline, and principles views share selected experience/filter state.
- [ ] Visitors can explore by capability, principle, timeline, and revealed pattern.
- [ ] Detail panel emphasizes what experiences reveal.
- [ ] Mockup-inspired visual direction exists as lightweight structure and CSS hooks.
