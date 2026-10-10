# Interview `0.2` → internal evidence → public atlas

This map supports [issue #3](https://github.com/gomercin/mosaic/issues/3). It uses the observed schema shapes and the main branch's static UI contract, without copying interview text, filenames, IDs, or client names. The accompanying [consolidation review](consolidation-review.md) records safe census counts and unresolved decisions.

## Observed envelope and project shape

Every parsed input has these six top-level keys:

| Interview `0.2` field | Observed type | Internal handling / public decision |
| --- | --- | --- |
| `schemaVersion` | String, `0.2` | Validate version; do not pass the source envelope to the browser. |
| `profileContext` | Object with `education: string` | Preserve privately. Public `profile` needs independently reviewed name/title/tagline/summary; education alone cannot construct it. |
| `projects` | Array of project objects | Retain canonical IDs and all original source pointers; publish curated experiences/episodes separately. |
| `crossProjectObservations` | Array of observation objects | Preserve interpretation and supporting references; promote into public patterns/principles only after review. |
| `suggestedClassificationTypes` | 60 string entries, one observation-shaped object | Preserve original types. Suggestions propose taxonomy; the object is an unresolved classification anomaly. |
| `exportNotes` | Array of strings | Local extraction/editorial guidance, excluded from public data. |

Every project occurrence has all 23 expected top-level fields. Observed shape differences are confined to nullable period/context fields and the suggested-classification entry type. Presence of fields does not mean all public data is available.

| Source project field | Observed shape | Existing main UI | Internal evidence / proposed public `1.0` |
| --- | --- | --- | --- |
| `id` | String | `experience.id` bridges selections across views | Stable canonical source identity retained in the PoC public experience ID; any later anonymized ID mapping needs a reviewed deterministic alias table. Preserve each original JSON pointer. |
| `title` | String | Experience labels and detail title | Review public title; source title is not publication permission. |
| `period` | `{start: string\|null, end: string\|null, label: string}` | Timeline sorts by numeric `start`, displays `label` | Preserve nulls internally. Curate a truthful public display/order; do not manufacture dates. |
| `context` | `{type, organization, roleAtTime, careerStage, collaboration}`; organization/role may be null, others strings | Only `type` and optional `company` fit directly | Preserve role/career/collaboration internally. Review organization disclosure and derive public contribution wording per episode. |
| `confidentiality` | `{level: string, publicUseApproved: boolean, notes: string[]}` | Main had `visibility`; it cannot protect content already served as JSON | Keep all source flags/notes local. New publication starts unapproved and requires a separate digest-bound manifest. |
| `status` | String; eight distinct values | No outcome state in legacy detail view | Review per episode into `delivered`, `stopped`, or `idea`; retain source status internally. |
| `summary` | String | `summary` | Explicitly curate public summary rather than copy the source. |
| `motivation` | String array | No dedicated field | Retain internally; selected safe context can inform public narrative. |
| `problem` | String array | Optional `challenge: string` | Select episode-specific difficulty without erasing uncertainty or chronology. |
| `existingSolutionsOrAlternatives` | String array | No dedicated field | Preserve rejected/existing approaches; reference only reviewed context in an episode. |
| `constraints` | String array | Optional challenge/approach prose | Retain constraints and use reviewed limitations in the public episode. |
| `myContribution` | String array | Optional `approach` merges action into a single narrative | Public episode has an explicit `myContribution` field. Do not assign team/system work to the author. |
| `teamOrExistingContribution` | String array | No separate attribution field | Public episode has `teamContribution`; preserve source attribution and unknowns internally. |
| `approachAndDecisions` | String array | Optional `approach: string` | Select a concrete episode/action; do not infer an episode boundary from array position. |
| `differentiators` | String array | No dedicated field | Keep as source interpretation until grounded in a reviewed action/result. |
| `outcomes` | String array | Optional `impact: string` | Episode `result` plus `limitation` and `outcomeStatus`; a narrative outcome is not automatically a delivered result. |
| `lessons` | String array | Free-text `revealedPatterns` | Separate reflection from demonstrated behavior; curate patterns and evidence links independently. |
| `tools` | String array | `tools: string[]` | Curate tool disclosures; tool use alone does not demonstrate a capability. |
| `provisionalSignals` | Array of signal objects | Capability IDs / free-text patterns lack episode explanations | Keep candidates, textual evidence and source confirmation internally. Publish reviewed capability links that point to an actual evidence episode. |
| `tags` | String array | Capabilities/tools/skills are separate concepts | Keep tags internally; do not promote all tags into capability anchors. |
| `openQuestions` | String array | No dedicated field | Local unresolved ledger; selected safe uncertainty may become an episode limitation. |
| `rawNotes` | String | Legacy `rawNarrative` and local `privateNotes` | Retain only in local normalized source. Public experiences have neither field. |

The source has no explicit AI-contribution field. Public `aiContribution` must record reviewed attribution or an explicit unknown/none statement; omission from the source is not proof that no AI was used.

## Signal and cross-project interpretation

A provisional signal is `{type, label, interpretation, evidence, confidence, confirmedByUser}`. The first five fields are strings and confirmation is a boolean. Its `evidence` is text, while the legacy UI's `evidence` was a list of URL objects; these are different meanings and cannot be mapped by field name.

A cross-project observation is `{label, interpretation, supportingProjectIds, confidence, confirmedByUser}`. Supporting IDs are string arrays. The inventory checks them against all input project IDs, including references carried by the anomalous suggested-classification object. There are no dangling references in the measured corpus. Reference validity provides traceability, not confirmation of the interpretation.

The public link makes the claim explicit:

```text
evidenceLink: capabilityId + experienceId + episodeId
              explanation + signalType + confidence + confirmedByUser
```

`signalType` is `strengthened`, `demonstrated`, or `candidate`; confidence is `high`, `medium`, or `low`. Source labels/confidence/confirmation are retained for review, not blindly promoted. A candidate link must remain visibly tentative. Public principles and patterns require their own reviewed wording and should not turn cross-project hypotheses into verified traits.

## Public contract and compatibility

The proposed strict public `1.0` payload has `datasetKind`, approved `publication` metadata, a reviewed `profile`, capability/principle vocabularies, experiences, evidence episodes, and evidence links. Each episode belongs to an experience; each link must name an existing capability, experience, and episode belonging to that experience. IDs must be unique and references must resolve.

Experiences retain the fields needed by the overview, timeline, and principles lenses, but remove `rawNarrative`, `privateNotes`, `visibility`, and the legacy URL-evidence field. Required public narrative/challenge/approach/impact wording is supplied by the reviewed manifest. Episode summaries, separate personal/team/AI contributions, results and limitations give the detail view a concrete basis for each capability link.

Internal provenance is original-file SHA-256 plus JSON pointer, canonical project ID/hash, and every duplicate occurrence. The editorial manifest binds reviewed canonical records and public wording to a normalized digest. A changed source cannot reuse stale review approval. Public output uses allowlisted fields rather than deleting a few known private keys from a rich internal object.

The site loads one static public JSON asset. Raw ingestion, local inventory, normalized evidence and editorial manifests are Node/local operations outside the browser dependency graph. The legacy Studio remains local authoring work; it is not the public-data adapter.

The synthetic PoC checks that an atlas visitor can follow a capability into a project and read the supporting episode, contribution boundaries, outcome/limitation and link explanation. It does not approve the real taxonomy, resolve semantic consolidation, or prove real personal traits.

## Stable IDs and provenance rules

- Source IDs derive from the relative path and full byte SHA-256. Every reference retains the full digest and JSON pointer; path alone is insufficient to identify a source revision.
- Project IDs retain the supplied `id`. Exact canonical duplicates share a project/occurrence identity and accumulate source pointers. Different retellings of one ID retain separate occurrences with unresolved independence.
- Occurrence IDs use the original project ID plus a canonical-record hash. Candidate signal IDs add the source signal position within that immutable occurrence. A changed record creates a new occurrence, invalidating stale publication review.
- Capability, principle, public episode, and relationship IDs are explicit editorial IDs in the manifest. They remain stable across wording edits unless the meaning or evidence unit changes. The PoC deliberately admits one project-sized episode per project; it does not manufacture independent evidence by splitting retellings.
- Missing/unsafe IDs fail the current importer or public contract. A proposed future alias is `project-<source digest prefix>-<JSON pointer slug>` with a retained full-digest mapping and collision check. Anonymization needs an explicit reviewed alias table; no source IDs are silently renamed in this slice.
- Each manifest record binds reviewed public wording, a reviewer/revision, and specific source pointers. Projection verifies source bytes, parsed payloads, derived IDs, complete normalized ownership, approval, wording, and provenance. Public records omit the private hashes and pointers.

## Review still required

Before real content enters the public asset, resolve unknown periods, episode boundaries, personal/team/AI attribution, outcome classifications, capability vocabulary, tentative-signal promotion, confidentiality wording, related-project merge decisions, and the misclassified suggestion. Preserve rejected or excluded cases in the private ledger. Inspect human meaning and graph density before proceeding to phase 2.
