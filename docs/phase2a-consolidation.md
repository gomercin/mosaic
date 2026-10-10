# Private Phase 2A consolidation

Phase 2A implements the internal evidence and review work in [Issue #3](https://github.com/gomercin/mosaic/issues/3). It does not generate a résumé, approve a capability taxonomy, select real public claims, or adapt the visualization. This branch starts from the verified Phase 0/1 foundation while PR #4 remains open; it neither changes that branch nor touches unfinished V2 work.

## Construction boundary

The public build still reads only the three fixed synthetic fixtures and the existing publication manifest. The private consolidation command is absent from the build, CI and Pages execution paths. It reads source exports without modification and writes only inside an ignored `.private-evidence` directory, using restrictive permissions. Detailed filenames, project identities, source claims, candidate labels, provenance, and review questions must remain there. Commit only generic implementation, schemas, synthetic tests and documentation.

The source contract remains `0.2`. Lossless normalized evidence remains `1.0`; Phase 2A adds private analysis version `2A.1.0`. Original bytes, parsed envelopes, source hashes and JSON pointers allow every derived item to be checked against its original location. Nullable values, empty arrays, textual confidence, source confirmation, historical confidentiality, and export-level context remain intact. Unsupported formats and unknown fields fail closed; record their anomalies privately rather than loosening validation.

Source claims are reported occurrences, not independently verified facts. The original source separates personal contributions from team/existing contributions. AI attribution, proposed versus implemented work, reported outcomes, constraints and retrospective lessons still require contextual reading. No algorithm can infer individual ownership, causal impact, scientific correctness or publication approval from a source signal.

## Run locally

Use Node.js 22 and the locked dependencies:

```sh
npm ci
npm run consolidate:interviews -- --input /absolute/path/to/_interview_raw_extracts --output /absolute/path/to/.private-evidence/phase-2a/v1
```

For reviewed candidate proposals, add `--review /absolute/path/to/.private-evidence/phase-2a/review-input.json`. The private editorial input is bound to the normalized source digest; changing source bytes invalidates it. Running without review input produces a complete evidence foundation and an explicit unresolved synthesis state rather than fabricated groupings. The CLI prints aggregate counts only. Failures do not echo source content; inspect the private report for detailed anomalies.

Use versioned output directories for retained review runs. Repeat the command with the same source bytes and editorial input to reproduce the six artifacts byte for byte; it adds no clock-based IDs or timestamps. Reversing input discovery order must not change output.

## Private editorial input

The [editorial review schema](../schemas/editorial-review.v2a.schema.json) requires `schemaVersion`, `sourceDigest`, `reviewStatus: proposed`, a reviewer/revision identifier, candidates, relationships, episode candidates, identity review groups and grouped review questions. Optional classification definitions, rejected groupings and synthesis notes explain the proposed structure. The identifiers designate a proposal revision; they do not imply owner confirmation.

Each candidate supplies an explicit type, meaning, reasons, confidence, alternatives and adverse evidence. Its supporting project IDs must match its specific source signal, observation or JSON-pointer evidence references. A project name alone cannot add support. New types remain possible when their definition and interpretation justify them. Each grouping retains the original signal labels, evidence, confidence and source confirmation separately from its own unconfirmed state.

Episode proposals identify a project, source locations, reported contribution/outcome basis, limitations and a boundary rationale. Explicit field references select only those claims; a whole-record occurrence reference deliberately selects project-sized support. Candidate-to-episode associations must overlap the selected claims or source signals. Relationships between classifications remain proposed and cannot silently confer evidence or proficiency on a broader label.

## Six private outputs

| Artifact | Purpose |
| --- | --- |
| `consolidated-evidence.json` | Lossless source model, project-sized evidence units, pointer-backed source claims, proposed episode boundaries, and original uncertainty/attribution. |
| `capability-candidates.json` | Provisional capabilities, sub-skills, their meaning, original signal support, evidence references, and proposed relationships. |
| `cross-project-patterns.json` | Provisional patterns, principles, working conditions, domain/tool classifications or other justified types; alternative readings and adverse cases. |
| `consolidation-decisions.json` | Exact duplicate storage decisions, unresolved semantic identity groups, proposed/rejected relationships and a focused review queue. |
| `source-coverage.json` | Per-source accounting of every original project occurrence, signal, observation, classification suggestion, profile context and export note. Canonical and occurrence counts stay separate. |
| `consolidation-review.md` | Readable local review of classifications, supporting contexts, uncertainty, contradictions and recommended human decisions. |

Candidate labels, meanings and hierarchy are editorial proposals rather than outputs of label concatenation. One evidence unit may support several interpretations. Classification types are open to justified additions; a capability hierarchy is not imposed on patterns, principles or working conditions. Original signals that do not fit a proposed grouping remain visible and unresolved. Omission from a grouping is not deletion from the foundation.

## Evidence units and independence

Default evidence units are project-sized canonical records. A source field becomes an observation for traceability, not another independent demonstration. Exact duplicate records retain all source references while sharing canonical storage. Multiple descriptions of the same event, different episodes, related projects and conflicting accounts remain separate until human review; similar wording never causes an automatic semantic merge.

Episode boundaries are proposals tied to specific claims, not sentence-level splits. Ambiguous boundaries retain project-level evidence and review questions. Splitting a project does not increase its independent demonstration count. Distinct records with the same original project ID remain distinct versions, sharing the project context for counting.

Candidate counts distinguish observed project contexts from conservative independence. Explicit unresolved shared-event or shared-program review groups can reduce the conservative count without merging identities or deleting details. A research program with many lab records must not outweigh several independent professional contexts simply because its export is longer. Counts describe support, not proficiency, and remain provisional pending review of actual event independence.

A failed experiment can support interpretations of experimental practice, hypothesis revision or stopping behavior. It does not establish the hypothesis it tested. An AI-assisted implementation can support question framing, direction or evaluation when the source supports those actions; it does not establish unaided coding skill or domain expertise. Historical quantities remain source reports rather than audited impact measurements. Compare work with responsibilities and experience at the time, preserving chronology uncertainty.

## Review and next stage

Group human questions around decisions that change identity, attribution, independence, classification boundaries, adverse evidence or confidentiality. Record recommendations separately from confirmation. Review contradictory cases alongside apparent strengths, and distinguish changes over time from stable universal traits. The next meaningful step is a small owner review of the most consequential candidate groups and ambiguous evidence boundaries, followed by a new digest-bound private revision.

Curating public wording and publication approvals is a later, separate action. This command never updates the public publication manifest, marks private records approved, or writes to `public/` or `dist/`. Historical `publicUseApproved` and source `confirmedByUser` values cannot promote a new interpretation. Pages remains manual-only on this branch; merging code does not dispatch publication through the repository workflows.

## Verification

The synthetic tests exercise complete coverage, stable IDs, byte determinism, pointer integrity, duplicate versus retelling handling, unknown/null preservation, candidate relationships and unconfirmed states, publication blocking, secure output paths and sanitized CLI behavior. Existing TypeScript, synthetic regeneration, loader, deployment/privacy and browser checks remain required:

```sh
npm test
npm run build
npm run validate:dist
npm run browser:test
```

Local source processing is deliberately excluded from hosted CI. Hosted checks run synthetic fixtures only. The PR description records the exact verified commit and hosted check result; private source counts and interpretations belong in the local review artifacts. Build auditing can enforce file and field boundaries but cannot certify whether arbitrary editorial prose is confidential or semantically justified.
