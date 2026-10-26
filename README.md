# Mosaic

Mosaic is a static capability atlas: experiences connect to capabilities, principles, and time. This increment implements Phase 0 and a small Phase 1 proof of concept from [issue #3](https://github.com/gomercin/mosaic/issues/3).

The default dataset contains **three invented projects**, clearly labeled in the app. It proves the publication pipeline without making career claims or publishing private interviews. The existing constellation, timeline, principles view, and local Studio are retained.

## Develop and verify

Use Node.js 22, matching CI:

```bash
npm ci
npm test
npm run build
npm run preview
```

`npm test` typechecks the app, checks deterministic generation, validates the public model, and runs importer, projection, inventory, loader, and deploy-audit tests. `npm run build` validates the generated data before compiling and audits the actual `dist/` tree afterward. CI, Pages, and release packaging explicitly audit that tree before uploading it. Merging into `main` runs CI validation; it no longer automatically publishes changes to GitHub Pages.

## Merging, artifacts, and public deployment

| Action | Trigger | Result |
| --- | --- | --- |
| Code merge | Owner-approved PR merge into `main` | Updates the code and starts CI; does not deploy Pages. |
| CI validation | Pull requests targeting `main`, pushes to `main` or `codex-implementation`, or manual CI dispatch | Installs Node 22 dependencies, tests, builds, audits `dist/`, verifies both browser viewports, and uploads Actions build/browser artifacts. |
| Release packaging | A pushed `v*.*.*` tag or manual Release dispatch | Tests/builds/audits the static ZIP, uploads an Actions artifact, and creates a GitHub Release with the ZIP. This is a separate release action and does not deploy Pages. A merge does not create a version tag. |
| Public Pages deployment | Manual dispatch of `Deploy GitHub Pages` only | Tests/builds/audits the selected ref, uploads its Pages artifact, and deploys through the `github-pages` environment. |

The Pages workflow has no automatic push-to-`main` trigger. GitHub Pages remains available, but deployment is an explicit owner-authorized action until real public content is approved. Creating a release makes its ZIP available through GitHub Releases; uploading an Actions artifact or building `dist/` is not a website deployment.

When the owner explicitly requests deployment, open the repository's **Actions → Deploy GitHub Pages → Run workflow**, select the approved ref (normally `main`), then select **Run workflow**. Alternatively, from an authenticated GitHub CLI:

```sh
gh workflow run pages.yml --repo gomercin/mosaic --ref main
```

That command deploys the selected ref after validation; do not run it merely to verify a merge or generate artifacts. Review the workflow run and any `github-pages` environment approval before checking the published site. Node configuration, Pages permissions/configuration, environment, artifact handling and privacy audits remain intact.

A read-only GitHub settings check during this change reported Pages `build_type: workflow` and the three registered workflows listed above. Repository files cannot prove the absence of external app/webhook deployments, organization-level automation, or future settings changes. Hosting settings have not been changed and no deployment has been initiated. The manual-only policy takes effect when this change reaches `main`; it does not remove an existing site or cancel previously queued deployment runs.

## Repeatable browser verification

Use Node 22, install the lockfile dependencies with `npm ci`, then run:

```sh
npx playwright install chromium
npm run browser:test
```

This builds and audits the production artifact, starts a fresh loopback preview, and runs Chromium at 1440×1000 and 390×844. It checks capability selection, complete project evidence and attribution, Timeline, Enter/Space, Close/Escape focus restoration, wheel/PageDown detail scrolling, and responsive geometry. Screenshots, measurements, asset hashes and the tested Git revision are written under ignored `test-results/`. CI runs the same browser suite after its audited build. See [the verification report](docs/phase1-verification.md) for retained before/after screenshots, the verified implementation commit, and limitations.

## Evidence and publication workflow

```text
Private source exports
  -> inventory and normalized evidence with source hashes / JSON pointers
  -> editorial publication manifest with explicit approvals
  -> generated public/data/mosaic.json
  -> validated static app and audited dist/
```

`_interview_raw_extracts/` and `.private-evidence/` are ignored. Never commit them, copy them into `public/`, or bundle them in application imports. The original exports stay where supplied and are read without modification. Detailed census metadata includes source names and project IDs, so it remains local too.

To inventory the supplied exports, from this checkout:

```bash
npm run inventory:interviews -- --input /absolute/path/to/_interview_raw_extracts
```

The command prints aggregate counts and writes the detailed, deterministic census to `.private-evidence/interview-inventory.json`. It enumerates JSON and ancillary files, source versions, missing keys, field shapes, duplicate records, confidentiality flags, and cross-project references. The inventory does not approve publication.

The PoC builds only the fixed, synthetic inputs in `fixtures/synthetic/`. It never discovers or consumes the real source directory as a build input:

```bash
npm run generate:data
npm run generate:data -- --check
npm run validate:data
npm run build
npm run validate:dist
```

Generation retains normalized evidence and an integrity report locally under `.private-evidence/`. The checked-in public JSON contains only reviewed presentation fields plus episodes and explainable relationships. The editorial manifest is tied to a normalized source digest; source changes require renewed review. Missing approval, unknown format/version, dangling references, unexpected fields, and stale generation fail closed. `visibility` and historical source approval flags are not publication approval.

The release loader fetches `data/mosaic.json` relative to the hosting base path, validates the same contract used by the CLI, and displays actionable errors. It never falls back to sample data. The old public sample has been removed so it cannot accidentally ship beside the new projection.

## Inspect the proof of concept

Choose a capability in Overview, then choose a connected project. Its story shows an evidence episode, personal contribution, team or existing work, AI assistance, delivered result or stop, limitations, and the explanation for each capability connection. Confidence and confirmation are visible. The shared capability has independent links across distinct projects; repetition is not a proficiency score. Timeline offers a reading path over the same projects.

Studio is available only during `npm run dev` and excluded from production JavaScript. It exports private authoring drafts; the former direct public-export button has been removed. Drafts require the reviewed publication pipeline before use in a release.

## Contracts and review

- [Phase 0 census, decisions, exclusions, and Phase 2 plan](docs/consolidation-review.md)
- [Interview mapping and representation gaps](docs/interview-mapping.md)
- [Local verification and browser checks](docs/phase1-verification.md)
- [Consolidated evidence schema](schemas/normalized-evidence.v1.schema.json)
- [Public presentation schema](schemas/public-mosaic.v1.schema.json)

The earlier design handoffs in `docs/` still guide the constellation. Their older examples that put raw narratives or private notes in public JSON are superseded by this publication contract and issue #3.

The deploy audit allows only the app entry, compiled JS/CSS, and the exact validated public projection. It rejects extra JSON, source archives, source maps, symlinks, private paths, and declared canaries. These checks enforce the construction boundary; they cannot decide whether arbitrary editorial prose is confidential or semantically justified. Human review remains necessary.

Review meaning, attribution, and information density with the owner before expanding beyond this slice. Full consolidation, broader taxonomy, broad UI redesign, and backend work remain later steps. Code merge and publication are separate owner decisions. After the foundation is approved and merged, the next development activity can be Phase 2 evidence consolidation and cross-project synthesis from issue #3; this change does not begin that work or approve real public content.
