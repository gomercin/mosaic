# Interview consolidation review · phases 0 and 1

This is the review checkpoint for [issue #3](https://github.com/gomercin/mosaic/issues/3), measured on 9 October 2026. Phase 0 has a local census and a proposed mapping. Phase 1 proves the path with synthetic evidence. Real interview content remains unapproved for this change and is excluded from the public dataset, repository, and deployment.

The product boundary follows the initial handoff and constellation specifications: static JSON, local authoring, shared experience IDs across views, and a capability atlas whose connections explain the person through experiences. This PR does not complete the real-content consolidation or start phase 2.

## Reproducible census

Run the inventory from the repository root:

```sh
node scripts/inventory-interviews.mjs --input /absolute/path/to/_interview_raw_extracts --output .private-evidence/interview-inventory.json
```

The command prints an aggregate summary and writes a detailed report only beneath `.private-evidence/`. That directory and the raw input directory are ignored by Git. The report is local evidence, not a deployable asset. It contains relative filenames, byte lengths, SHA-256 hashes, project IDs and pointers, canonical record hashes, duplicate groups, missing-key findings, observed schema shapes, confidentiality flags, and project-reference findings. Ancillary files are counted and hashed without parsing. Symbolic links are recorded without following them. Parser failures are retained without printing source fragments.

The committed census intentionally contains counts only. Filenames, IDs, hashes, source text, confidentiality notes, and client names belong in the local report.

| Check | Observed count |
| --- | ---: |
| All input files | 27 |
| JSON files / successfully parsed | 25 / 25 |
| Ancillary files, left unparsed | 2 |
| Schema `0.2` envelopes / accepted by proposed source schema | 25 / 25 |
| JSON parse errors / skipped links | 0 / 0 |
| Project occurrences / distinct project IDs | 46 / 45 |
| Distinct canonical project records | 45 |
| Byte-identical duplicate groups / extra occurrences | 1 / 1 |
| Canonical project duplicate groups / extra occurrences | 1 / 1 |
| Duplicate project ID groups / conflicting record groups | 1 / 0 |
| Expected-key findings / missing or invalid project IDs | 0 / 0 |
| Distinct source status values | 8 |
| Source `publicUseApproved: true` / `false` project occurrences | 6 / 40 |
| Project occurrences with confidentiality notes | 39 |
| Missing or invalid approval flags | 0 |
| Provisional signals | 244 |
| Source-confirmed / unconfirmed provisional signals | 144 / 100 |
| Cross-project observations | 41 |
| Source-confirmed / unconfirmed cross-project observations | 13 / 28 |
| Suggested classification entries | 61 |
| String / object classification entries | 60 / 1 |
| Export notes | 158 |
| Supporting-project reference occurrences | 113 |
| Dangling / invalid reference occurrences | 0 / 0 |
| Paths with more than one observed type | 5 |

Counts above use source occurrences, including the duplicate. The 113 references include 112 in cross-project observations and one in the object found in suggested classifications. A key being present and a reference resolving do not establish factual accuracy or publication suitability. Source confirmation and source approval flags are retained metadata; they do not approve a new public projection.

## Deduplication and exclusion decisions

1. **Byte duplicates:** preserve every filename/hash occurrence in the local ledger. Read identical bytes once where useful, without losing the second source location.
2. **Canonical project duplicates:** compare SHA-256 of recursively key-sorted JSON while preserving array order and all scalar values. One extra occurrence is an exact record duplicate; one canonical record may have multiple provenance pointers. This is storage deduplication only.
3. **Project ID collisions:** the observed repeated ID has the same canonical record. Any future repeated ID with different records remains as distinct occurrences with unresolved independence in the merge report; review is required before publication. Do not select the latest file or merge fields silently.
4. **Similar stories or related projects:** no semantic merge is authorized by this census. Similar titles, tags, organizations, or signal labels do not prove two experiences are the same. Retain separate records until reviewed.
5. **Public exclusion:** all 25 real JSON files, all 46 project occurrences representing 45 distinct records, all real signals/observations/notes, and both ancillary files are excluded at the PoC publication boundary. None is silently dropped from the census. Historical approval flags do not override this exclusion.

No filenames are renamed and no interview source is rewritten by the inventory or importer.

## Gaps the contract must preserve

- All records have the expected keys, but seven start dates and eighteen end dates are null. Twenty-two organization fields and four role fields are null. Missing time/attribution must remain unknown rather than becoming an invented year, employer, or role.
- One suggested-classification item is an observation-shaped object instead of a string. Preserve the object locally and mark its classification unresolved; do not coerce it to text or silently move it into confirmed patterns.
- Projects contain narrative arrays and project-wide outcomes. They do not contain explicit episode IDs or per-episode results, limitations, team attribution, or AI attribution. Those links require editorial review rather than automatic sentence slicing.
- A provisional signal has a type, interpretation, textual evidence, confidence, and source confirmation. Its label is not automatically a capability and its evidence text is not automatically a URL or independently checked evidence.
- Eight project status strings must be reviewed against the narrower public episode status vocabulary. A project status cannot safely classify every outcome. Stopped work and ideas remain visible with their limitations.
- Taxonomy is unresolved: skills, tools, capabilities, principles, patterns, and traits must not be collapsed into a single tag list. Normalization preserves the input distinction; reviewed publication decides the public relationships.
- Confidentiality notes and unapproved source material stay internal. Public wording must be written and reviewed independently, with attention to organizations, names, links, dates, and implied claims.

## Phase 1 proof and traceability boundary

The public `1.0` contract separates experiences, evidence episodes, and capability-to-episode links. The synthetic PoC proves this path:

```text
capability → related experience → evidence episode
           → my / team / AI contribution
           → result and limitation → reason for the capability link
```

Links carry `signalType`, `confidence`, and `confirmedByUser`; these remain visible to distinguish a candidate interpretation from a reviewed demonstration. Episodes carry `delivered`, `stopped`, or `idea` outcome status. The richer source remains internal, while the static site receives only a strict public projection.

Internal normalized records retain original source hashes, JSON pointers, canonical project identity, every duplicate occurrence, and unapproved publication state. A separate editorial manifest holds the public wording and explicit reviewed record IDs, bound to the normalized digest. Changing the normalized evidence invalidates the old review binding. Import does not infer publication permission from a source confidentiality flag, and projection rejects unreviewed records.

Public JSON excludes raw narratives, private notes, source paths/hashes, interview metadata, and source confidentiality prose. The source loader and local authoring code stay outside the public build path. Deploy auditing checks the built artifacts; UI visibility is not the privacy boundary.

See [interview-mapping.md](interview-mapping.md) for the source/UI/contract map. Synthetic fixtures and tests exercise exact deduplication, source changes, disallowed private keys, dangling references, contribution separation, and the public projection. They establish pipeline behavior, not the truth of real interview claims.

## Review decisions before full consolidation

| Decision | Required review result |
| --- | --- |
| Experience boundaries | Decide whether related source records stay separate or share an experience; retain all source pointers. |
| Evidence episode selection | Identify the particular action, decision, constraint, result, and limitation that support each link. |
| Contribution attribution | Separate personal work, team/existing work, and AI assistance; explicitly record unknown attribution. |
| Taxonomy | Choose a small capability vocabulary and separately review principles/patterns; tools remain tools. |
| Signal promotion | Decide candidate/demonstrated/strengthened and confidence with an explanation tied to an episode. |
| Confirmation | Review source confirmation claims and publish only wording explicitly approved in the current manifest. |
| Outcomes | Keep delivered results, stopped work, and ideas distinct; do not turn unfinished experiments into wins. |
| Missing dates | Choose an honest display and ordering rule for unknown/approximate periods before real timeline import. |
| Confidentiality | Review every public field and relationship; approve identities and wording separately from private extraction. |
| Misclassified suggestion | Resolve the single observation-shaped classification item explicitly in the local review ledger. |
| Ancillary material | Decide later whether it supplies useful evidence; no binary/document content was parsed in this phase. |

Full consolidation should proceed as a reviewed local batch: retain source inventory, normalize without publication, review one small representative set, write safe episode/relationship wording, bind the manifest to the normalized digest, project and audit, then inspect meaning and graph density. Track every excluded or unresolved record in the private ledger. This plan is a reviewable next step, not an automatic successor.

Phase 2 remains gated on human review of whether the PoC explains the capability links and whether real-content density will stay usable. Census completion does not provide that product or semantic approval.
