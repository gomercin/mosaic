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
| T0 - Add implementation tracker and mockup reference | done | `3812565` | `git status --short` | `docs/mockup.png` committed as inspiration, not pixel-perfect spec. |
| T1 - Add Principles and Patterns public lens | done | `96d112c` | `npm test` | Added shared `principles` view mode with principle-to-experience pattern exploration. |
| T2 - Add shared graph/relationship helpers | done | `10c35d3` | `npm test` | Added pure helpers for capability, principle, pattern, category, and filter relationships. |
| T3 - Lightweight mockup-inspired overview refresh | done | `7d25ac6` | `npm test`, `npm run build` | Added discover rail, category filter, legend, and hover-highlighted connected nodes. |
| T4 - Strengthen detail panel storytelling | done | `42bd66d` | `npm test` | Moved revealed patterns/principles higher and added evidence links. |
| T5 - Timeline lightweight ribbon pass | done | `aa42a7b` | `npm test`, `npm run build` | Added simple SVG ribbon and category-colored timeline markers. |
| T6 - Studio workflow light staging | done | `d2a5b50` | `npm test` | Grouped Studio into raw story, structured signals, and preview/export stages. |
| T7 - Visual token and mockup hook cleanup | done | `61d7037` | `npm test`, `npm run build` | Added named visual tokens for rails, category glows, selected paths, and muted states. |
| T8 - Final verification and review commit | done | this final docs commit | `npm ci`, `npm test`, `npm run build` | Exact hash is reported in the final response after commit creation. |

## ChatGPT Collaboration Checkpoints

- After T1/T3: ask ChatGPT whether the information architecture reads as a capability atlas within 10 seconds.
- After T4/T5: ask ChatGPT which story sections and timeline moments should be emphasized.
- After T7: ask ChatGPT for visual critique around color balance, density, constellation atmosphere, and reducing dashboard feel.

## Final Acceptance Checklist

- [x] `npm ci` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] No new major dependencies are added.
- [x] Static JSON architecture remains intact.
- [x] Overview, timeline, and principles views share selected experience/filter state.
- [x] Visitors can explore by capability, principle, timeline, and revealed pattern.
- [x] Detail panel emphasizes what experiences reveal.
- [x] Mockup-inspired visual direction exists as lightweight structure and CSS hooks.

## Final Verification Notes

- `npm ci` passed locally with the expected engine warning because the shell is Node `26.3.0` while the project targets Node `22.x`.
- `npm test` passed after `npm ci`.
- `npm run build` passed after `npm ci`.
- Top-level dependencies remain React, React DOM, Vite, TypeScript, and React/Vite type tooling only.
- Static JSON loading remains under `public/data`; no backend, auth, database, CMS, or analytics path was introduced.
- `privateNotes` appears only in Studio authoring, validation, types, and docs; it is not rendered by public discovery/detail components.

## Remaining UX/Aesthetic Questions For ChatGPT

- Does the new Principles lens read as a discovery path rather than another project list?
- Does the overview communicate “capability atlas” quickly enough, or should the center/rail language change?
- Should the timeline emphasize years, experience types, or capability categories more strongly?
- Which revealed-pattern cards feel most human, and which still read like project-report text?
- Does the mockup-inspired dark luminous direction feel personal enough, or still too dashboard-like?
