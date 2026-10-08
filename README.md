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

`npm test` typechecks the app, checks deterministic generation, validates the public model, and runs importer, projection, inventory, loader, and deploy-audit tests. `npm run build` validates the generated data before compiling and audits the actual `dist/` tree afterward. CI, Pages, and release packaging explicitly audit that tree before uploading it. This PR does not deploy or change hosting.

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

Review meaning, attribution, and information density with the owner before expanding beyond this slice. Full consolidation, broader taxonomy, UI redesign, deployment, and backend work remain later steps.
