# Phase 1 verification

Bounded review-readiness pass on 10 October 2026 for PR #4. Verified implementation commit: **e898b0192ef1f322fe643dbc602ed9b02d3bed72**. The retained browser provenance identifies this exact clean source revision and SHA-256 hashes of the audited production assets. The subsequent report/screenshot commit changes documentation only; the PR description records the final verified head separately. The original checkout's unfinished V2 UI work remains outside this PR.

## Reproduced findings

Baseline commit: `b4abc5149db50e6cb097f0019c1b881a06148fc3`. Both production viewports were reproduced with Chromium: 1440×1000 and 390×844. Baseline images are full-page captures at those viewport widths; retained post-change images are exactly the requested viewport sizes.

| Finding | 1440×1000 baseline | 390×844 baseline |
| --- | --- | --- |
| Projects overlap Feedback inspection | No overlap in the exercised states | Checkpoint overlap 85.5×10.9 px; Handoff overlap 81.7×48 px |
| Rightmost capability clipped by canvas | No clipping | Experiment framing extends 28.2 px beyond the stage's right edge |
| Center bubble text collision | None in the exercised states | Default title/label rows overlap by 12.8 px; capability focus also collides |

[Desktop baseline](screenshots/phase1/baseline-desktop-overview.png), [mobile baseline](screenshots/phase1/baseline-mobile-overview.png), and [baseline measurements](screenshots/phase1/baseline-metrics.json) retain the adverse case. The mobile document itself was 390 px wide; the clipping occurred inside the canvas. The earlier label-spacing verification applied to the desktop slice and did not establish mobile readiness.

## Targeted changes

At widths up to 760 px, the constellation is replaced by a normal reading view with complete, wrapping capability and project labels. Choosing a capability opens the existing connected-project inspector and filters the reading list to the related projects. Selecting a project opens the existing evidence story. The narrow view avoids both canvas overlap/clipping and the compressed center bubble; it does not revise the desktop layout algorithm or the unfinished V2 design.

Both views preserve capability → project → personal contribution → team/existing work and AI assistance → result/limitation → evidence explanation. The stopped stakeholder proposal and the unrun research idea retain their outcome status. Candidate status, low confidence and awaiting confirmation remain visible rather than becoming proficiency claims. No public data, taxonomy, source normalization, or publication approvals changed.

The mobile drawer now has a definite viewport-bounded height and its own scroll area. Close stays visible. Opening a story focuses Close and resets detail scroll; Escape and Close return focus to the stable opener. Returning from Timeline to Overview uses the persistent Overview navigation button, and Escape with no open drawer does not move focus. A hidden/disconnected opener falls back to the active view button. Navigation/filter controls wrap at narrow widths.

## Repeatable verification

Use Node.js 22.23.3 and the committed lockfile:

```sh
npm ci
npm test
npx playwright install chromium
npm run browser:test
```

`browser:test` first builds and audits `dist/`, then starts a fresh Vite preview at `http://127.0.0.1:4178`. It refuses an existing server. The two Playwright projects use Chromium 156.0.8078.4, device scale factor 1 and reduced motion, at 1440×1000 and 390×844; the narrow project emulates mobile/touch. Generated screenshots, geometry, browser version, Git revision and deploy-asset hashes live under ignored `test-results/`. CI installs Chromium and runs the same suite after its production build/audit, retaining browser artifacts. No browser dependencies or screenshots enter `dist/`.

Both browser journeys passed:

1. Confirm the synthetic notice and exact validated dataset response.
2. Check overview, selected capability and tentative-project geometry: no intersecting capability/project controls, no controls outside their container, no mobile label fragments outside their buttons, no desktop center-text collisions, and no horizontal document overflow (1 px tolerance).
3. Activate Feedback inspection using Enter; open its engineering project using Space. Verify personal/team/AI attribution, delivered result, limitation, link explanation, confidence and confirmation against the public dataset.
4. Scroll details using wheel and PageDown, independently of the document; reach the evidence explanation. Escape closes the drawer and restores the capability opener.
5. Open the stopped proposal; retain the rejected outcome and limitation. Close restores focus. Open the research idea; retain candidate/low/awaiting-confirmation interpretation and reset detail scroll.
6. Use Timeline and keyboard activation to reach the same engineering evidence. Return to Overview and exercise Escape/focus restoration; Escape after closure leaves the current focus in place.
7. No browser page errors during these paths.

| Retained state | Desktop, 1440×1000 | Mobile, 390×844 |
| --- | --- | --- |
| Overview | [Screenshot](screenshots/phase1/desktop-overview.png) | [Screenshot](screenshots/phase1/mobile-overview.png) |
| Capability selection | [Screenshot](screenshots/phase1/desktop-capability.png) | [Screenshot](screenshots/phase1/mobile-capability.png) |
| Scrolled engineering evidence | [Screenshot](screenshots/phase1/desktop-engineering-scrolled.png) | [Screenshot](screenshots/phase1/mobile-engineering-scrolled.png) |
| Tentative interpretation | [Screenshot](screenshots/phase1/desktop-tentative.png) | [Screenshot](screenshots/phase1/mobile-tentative.png) |
| Timeline | [Screenshot](screenshots/phase1/desktop-timeline.png) | [Screenshot](screenshots/phase1/mobile-timeline.png) |

The mobile overview screenshot is scrolled to the reading controls; other long content is reached through ordinary page/detail scrolling. [Desktop provenance and geometry](screenshots/phase1/desktop-verification.json) and [mobile provenance and geometry](screenshots/phase1/mobile-verification.json) bind the images to the verified implementation and public build.

## Existing validation and privacy boundary

- `npm ci`: locked dependencies installed under Node 22.
- `npm test`: TypeScript, deterministic public regeneration, public validation, and all 66 existing tests passed (16 pipeline, 6 inventory, 3 loader, 41 deploy audit).
- `npm run build` / `validate:dist`: generated-data freshness, public validation, TypeScript, Vite and actual deploy-tree audit passed.
- Deploy tree contains only `index.html`, one compiled JS file, one CSS file and the unchanged `data/mosaic.json`. No source maps, extra JSON, source archives, symlinks, Studio/private narrative fields or private canaries. Deployed JSON matches the generated projection byte for byte.
- Dependency audit is a separate result: `npm audit` reports three high-severity development dependency findings (`nanoid`, `postcss`, `source-map-js`). Their locked versions are identical to the baseline; adding Playwright did not introduce them. No dependency-upgrade work is included in this bounded pass.
- `git diff --check`: passed. No raw interview or private inventory file is tracked. No raw interview was read or consolidated in this review pass; the earlier Phase 0 census remains local. Public fixture/projection content is unchanged from the baseline.

## Limits and publication decision

This is a three-project synthetic check in one Chromium build at two fixed viewports. It does not certify a large corpus, all intermediate widths, physical mobile browsers, screen readers, or a complete accessibility audit. The desktop graph retains compact/ellipsized project previews; full stories and mobile reading labels remain available. Phase 2, capability taxonomy decisions and real public content remain outside this pass. Owner review of meaning and information density is still needed before expansion.

**Merging to `main` triggers the current Pages deployment workflow** (`.github/workflows/pages.yml`, push to `main`, plus manual dispatch). A successful workflow publishes the synthetic demo. Before merge, the owner must decide to **publish this synthetic demo through the existing workflow**, or **approve a separate change that separates merge from publication**. This pass does not change Pages/deployment settings. Repository-external Pages/environment approval rules were not inspected.

Local verification, hosted CI, merge and deployment are distinct states. The exact source revision and local checks are recorded above; consult PR #4 checks for the final hosted head. This pass performs no merge, deployment, or publication-policy change.
