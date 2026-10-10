import { createHash } from 'node:crypto';
import { assertPublicMosaicData, publicContractSchema, validateAgainstSchema } from '../src/data/publicContract.mjs';

const text = { type: 'string', minLength: 1 };
const stringArray = { type: 'array', items: text };
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const array = (items, minItems = 0) => ({ type: 'array', items, minItems });
const nullableText = { anyOf: [text, { const: null }] };
const digest = { ...text, pattern: '^[a-f0-9]{64}$' };
const pending = object({ status: { const: 'pending' } });
const approved = object({ status: { const: 'approved' }, reviewer: text, revision: text });
const approval = { anyOf: [pending, approved] };
const sourceRef = object({ sourceId: text, sha256: digest, pointer: text });
const manifestRef = object({ sourcePath: text, pointer: text });
const signal = object({ type: text, label: text, interpretation: text, evidence: text, confidence: text, confirmedByUser: { type: 'boolean' } });
const observation = object({ label: text, interpretation: text, supportingProjectIds: stringArray, confidence: text, confirmedByUser: { type: 'boolean' } });
const project = object({
  id: text, title: text, status: text, summary: text, rawNotes: text,
  period: object({ start: nullableText, end: nullableText, label: text }),
  context: object({ type: text, organization: nullableText, roleAtTime: nullableText, careerStage: text, collaboration: text }),
  confidentiality: object({ level: text, publicUseApproved: { type: 'boolean' }, notes: stringArray }),
  ...Object.fromEntries(['motivation', 'problem', 'existingSolutionsOrAlternatives', 'constraints', 'myContribution', 'teamOrExistingContribution', 'approachAndDecisions', 'differentiators', 'outcomes', 'lessons', 'tools', 'tags', 'openQuestions'].map((key) => [key, stringArray])),
  provisionalSignals: array(signal),
});

export const interviewSourceSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://gomercin.github.io/mosaic/schemas/interview-source.v0.2.schema.json',
  title: 'Private interview export 0.2 accepted input',
  ...object({ schemaVersion: { const: '0.2' }, profileContext: object({ education: text }), projects: array(project), crossProjectObservations: array(observation), suggestedClassificationTypes: array({ anyOf: [text, observation] }), exportNotes: stringArray }),
};

const publicationRecord = (schema) => object({ approval: approved, public: schema, sourceRefs: array(manifestRef, 1) });
export const publicationManifestSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://gomercin.github.io/mosaic/schemas/publication-manifest.v1.schema.json',
  title: 'Private reviewed wording and source binding v1',
  ...object({ schemaVersion: { const: '1.0' }, sourceDigest: digest, datasetKind: { enum: ['synthetic', 'curated'] }, publication: approved, records: object(Object.fromEntries(['profile', 'capabilities', 'principles', 'experiences', 'evidenceEpisodes', 'evidenceLinks'].map((key) => [key, key === 'profile' ? publicationRecord(publicContractSchema.properties.profile) : array(publicationRecord(publicContractSchema.properties[key].items))]))) }),
};

const occurrence = object({ id: text, record: project, sourceRefs: array(sourceRef, 1) });
const normalizedExperience = object({ id: text, originalProjectId: text, occurrences: array(occurrence, 1), publicationApproval: approval });
const candidate = object({ id: text, experienceId: text, occurrenceId: text, signal, sourceRefs: array(sourceRef, 1), publicationApproval: approval });
const internalPublicEntry = (schema) => object({ approval: approved, public: schema, sourceRefs: array(sourceRef, 1) });
export const normalizedEvidenceSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://gomercin.github.io/mosaic/schemas/normalized-evidence.v1.schema.json',
  title: 'Private normalized evidence ledger v1',
  ...object({ schemaVersion: { const: '1.0' }, sourceSchemaVersion: { const: '0.2' }, datasetKind: { enum: ['synthetic', 'curated'] }, sourceDigest: digest,
    sources: array(object({ id: text, relativePath: text, sha256: digest, rawText: text, payload: interviewSourceSchema }), 1),
    experiences: array(normalizedExperience), signalCandidates: array(candidate),
    crossProjectObservations: array(object({ id: text, observation, sourceRefs: array(sourceRef, 1) })),
    unresolvedClassificationSuggestions: array(object({ id: text, value: { anyOf: [text, observation] }, sourceRefs: array(sourceRef, 1), reason: text })),
    publicationRecords: { anyOf: [{ const: null }, object(Object.fromEntries(['profile', 'capabilities', 'principles', 'experiences', 'evidenceEpisodes', 'evidenceLinks'].map((key) => [key, key === 'profile' ? internalPublicEntry(publicContractSchema.properties.profile) : array(internalPublicEntry(publicContractSchema.properties[key].items))])))] },
  }),
};

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
function assertSchema(value, schema, name) {
  const errors = validateAgainstSchema(value, schema);
  if (errors.length) throw new Error(`${name} validation failed:\n${errors.join('\n')}`);
}
function pointerValue(payload, pointer) {
  if (pointer === '') return payload;
  if (!pointer.startsWith('/')) throw new Error(`Invalid JSON pointer: ${pointer}`);
  let result = payload;
  for (const escaped of pointer.slice(1).split('/')) {
    const key = escaped.replaceAll('~1', '/').replaceAll('~0', '~');
    if (result === null || typeof result !== 'object' || !Object.hasOwn(result, key)) throw new Error(`Unknown source pointer: ${pointer}`);
    result = result[key];
  }
  return result;
}

// Input bytes are kept private. IDs and ordering never depend on import order or wall-clock time.
export function normalizeSources(inputs, { datasetKind = 'curated' } = {}) {
  if (!inputs.length) throw new Error('At least one source is required');
  if (!['synthetic', 'curated'].includes(datasetKind)) throw new Error('Unsupported dataset kind');
  const paths = new Set();
  const sources = inputs.map(({ relativePath, bytes }) => {
    if (typeof relativePath !== 'string' || !relativePath || relativePath.startsWith('/') || relativePath.split(/[\\/]/u).includes('..')) throw new Error('Sources require safe relative paths');
    if (paths.has(relativePath)) throw new Error(`Duplicate source path: ${relativePath}`);
    paths.add(relativePath);
    const payload = JSON.parse(bytes.toString());
    assertSchema(payload, interviewSourceSchema, `Source ${relativePath}`);
    const hash = sha256(bytes);
    return { id: `source-${sha256(`${relativePath}\n${hash}`).slice(0, 16)}`, relativePath, sha256: hash, rawText: bytes.toString(), payload };
  }).sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en'));
  const sourceDigest = sha256(canonicalJson(sources.map(({ relativePath, sha256: hash }) => ({ relativePath, sha256: hash }))));
  const experiencesById = new Map();
  const crossProjectObservations = [];
  const unresolvedClassificationSuggestions = [];
  const duplicateRetellings = [];
  const ref = (source, pointer) => ({ sourceId: source.id, sha256: source.sha256, pointer });
  for (const source of sources) {
    source.payload.projects.forEach((record, index) => {
      const fingerprint = sha256(canonicalJson(record));
      const sourceRef = ref(source, `/projects/${index}`);
      const experience = experiencesById.get(record.id) ?? { id: record.id, originalProjectId: record.id, occurrences: [], publicationApproval: { status: 'pending' } };
      const existing = experience.occurrences.find((entry) => canonicalJson(entry.record) === canonicalJson(record));
      if (existing) {
        existing.sourceRefs.push(sourceRef);
        duplicateRetellings.push({ experienceId: record.id, occurrenceId: existing.id, sourceRefs: [...existing.sourceRefs], disposition: 'Exact repeated record; no additional independent evidence unit' });
      } else experience.occurrences.push({ id: `${record.id}:occurrence:${fingerprint.slice(0, 16)}`, record: structuredClone(record), sourceRefs: [sourceRef] });
      experiencesById.set(record.id, experience);
    });
    source.payload.crossProjectObservations.forEach((value, index) => crossProjectObservations.push({ id: `observation-${sha256(`${source.id}:${index}`).slice(0, 16)}`, observation: value, sourceRefs: [ref(source, `/crossProjectObservations/${index}`)] }));
    source.payload.suggestedClassificationTypes.forEach((value, index) => unresolvedClassificationSuggestions.push({ id: `suggestion-${sha256(`${source.id}:${index}`).slice(0, 16)}`, value, sourceRefs: [ref(source, `/suggestedClassificationTypes/${index}`)], reason: typeof value === 'string' ? 'Source suggestion retained; no taxonomy created automatically' : 'Observation-shaped suggestion retained for manual review' }));
  }
  const experiences = [...experiencesById.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  for (const experience of experiences) experience.occurrences.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const signalCandidates = experiences.flatMap((experience) => experience.occurrences.flatMap((entry) => entry.record.provisionalSignals.map((value, index) => ({
    id: `${entry.id}:signal:${index}`, experienceId: experience.id, occurrenceId: entry.id, signal: value,
    sourceRefs: entry.sourceRefs.map((sourceRef) => ({ ...sourceRef, pointer: `${sourceRef.pointer}/provisionalSignals/${index}` })), publicationApproval: { status: 'pending' },
  }))));
  const knownIds = new Set(experiences.map((entry) => entry.id));
  for (const entry of crossProjectObservations) for (const id of entry.observation.supportingProjectIds) if (!knownIds.has(id)) throw new Error(`Observation ${entry.id} references unknown project ${id}`);
  const normalized = { schemaVersion: '1.0', sourceSchemaVersion: '0.2', datasetKind, sourceDigest, sources, experiences, signalCandidates, crossProjectObservations, unresolvedClassificationSuggestions, publicationRecords: null };
  assertSchema(normalized, normalizedEvidenceSchema, 'Normalized evidence');
  const mergeReport = { schemaVersion: '1.0', sourceDigest, sourceCount: sources.length, projectOccurrenceCount: sources.reduce((sum, source) => sum + source.payload.projects.length, 0), canonicalProjectCount: experiences.length, candidateSignalCount: signalCandidates.length,
    exactRepeatedRecords: duplicateRetellings, differingRetellings: experiences.filter((entry) => entry.occurrences.length > 1).map((entry) => ({ experienceId: entry.id, occurrenceIds: entry.occurrences.map((occurrence) => occurrence.id), disposition: 'Retain distinct versions; independence unresolved, never count automatically' })), unresolvedClassificationSuggestions,
    publicationStatus: 'pending', notes: ['Original project IDs retained.', 'No automatic capability taxonomy, semantic deduplication, outcome upgrade, or publication approval.'] };
  return { normalized, mergeReport };
}

export function assertNormalizedIntegrity(normalized) {
  assertSchema(normalized, normalizedEvidenceSchema, 'Normalized evidence');
  const byId = new Map();
  const paths = new Set();
  for (const source of normalized.sources) {
    if (byId.has(source.id) || paths.has(source.relativePath)) throw new Error('Duplicate normalized source identity');
    byId.set(source.id, source); paths.add(source.relativePath);
    if (sha256(source.rawText) !== source.sha256 || canonicalJson(JSON.parse(source.rawText)) !== canonicalJson(source.payload)) throw new Error('Normalized source bytes or payload do not match their hash');
    if (source.id !== `source-${sha256(`${source.relativePath}\n${source.sha256}`).slice(0, 16)}`) throw new Error('Normalized source ID is not deterministic');
  }
  const expectedDigest = sha256(canonicalJson([...normalized.sources].sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en')).map(({ relativePath, sha256: hash }) => ({ relativePath, sha256: hash }))));
  if (expectedDigest !== normalized.sourceDigest) throw new Error('Normalized source digest is invalid');
  const readRef = (ref) => {
    const source = byId.get(ref.sourceId);
    if (!source || ref.sha256 !== source.sha256) throw new Error('Invalid normalized source reference');
    return pointerValue(source.payload, ref.pointer);
  };
  const regenerated = normalizeSources(normalized.sources.map((source) => ({ relativePath: source.relativePath, bytes: source.rawText })), { datasetKind: normalized.datasetKind }).normalized;
  const withoutApproval = (entries) => entries.map(({ publicationApproval: _approval, ...entry }) => entry);
  for (const collection of ['experiences', 'signalCandidates']) if (canonicalJson(withoutApproval(normalized[collection])) !== canonicalJson(withoutApproval(regenerated[collection]))) throw new Error(`Normalized ${collection} differs from deterministic source import`);
  for (const collection of ['crossProjectObservations', 'unresolvedClassificationSuggestions']) if (canonicalJson(normalized[collection]) !== canonicalJson(regenerated[collection])) throw new Error(`Normalized ${collection} differs from deterministic source import`);
  const experienceIds = new Set();
  const occurrenceIds = new Set();
  for (const experience of normalized.experiences) {
    if (experienceIds.has(experience.id) || experience.originalProjectId !== experience.id) throw new Error('Original project identity is duplicated or changed');
    experienceIds.add(experience.id);
    for (const entry of experience.occurrences) {
      if (occurrenceIds.has(entry.id) || entry.id !== `${experience.id}:occurrence:${sha256(canonicalJson(entry.record)).slice(0, 16)}`) throw new Error('Invalid normalized occurrence identity');
      occurrenceIds.add(entry.id);
      if (entry.record.id !== experience.id || !entry.sourceRefs.every((ref) => canonicalJson(readRef(ref)) === canonicalJson(entry.record))) throw new Error('Normalized occurrence does not match source provenance');
    }
  }
  for (const entry of normalized.signalCandidates) {
    if (!experienceIds.has(entry.experienceId) || !occurrenceIds.has(entry.occurrenceId) || !entry.sourceRefs.every((ref) => canonicalJson(readRef(ref)) === canonicalJson(entry.signal))) throw new Error('Normalized signal does not match source provenance');
  }
  for (const collection of ['crossProjectObservations', 'unresolvedClassificationSuggestions']) for (const entry of normalized[collection]) {
    const value = entry.observation ?? entry.value;
    if (!entry.sourceRefs.every((ref) => canonicalJson(readRef(ref)) === canonicalJson(value))) throw new Error('Normalized observation does not match source provenance');
  }
  return normalized;
}

// Approvals come only from this separately reviewed, digest-bound manifest.
export function applyPublicationManifest(normalizedInput, manifest) {
  assertNormalizedIntegrity(normalizedInput);
  assertSchema(manifest, publicationManifestSchema, 'Publication manifest');
  if (manifest.sourceDigest !== normalizedInput.sourceDigest) throw new Error('Publication manifest source digest does not match normalized sources');
  if (manifest.datasetKind !== normalizedInput.datasetKind) throw new Error('Publication manifest dataset kind does not match sources');
  const normalized = structuredClone(normalizedInput);
  const sourceByPath = new Map(normalized.sources.map((source) => [source.relativePath, source]));
  const resolve = (entry) => {
    if (canonicalJson(entry.approval) !== canonicalJson(manifest.publication)) throw new Error('Individual approval must match the publication reviewer and revision');
    return ({ approval: structuredClone(entry.approval), public: structuredClone(entry.public), sourceRefs: entry.sourceRefs.map(({ sourcePath, pointer }) => {
    const source = sourceByPath.get(sourcePath);
    if (!source) throw new Error(`Manifest references unknown source path: ${sourcePath}`);
    pointerValue(source.payload, pointer);
    return { sourceId: source.id, sha256: source.sha256, pointer };
  }) });
  };
  const publicationRecords = Object.fromEntries(Object.entries(manifest.records).map(([collection, entries]) => [collection, collection === 'profile' ? resolve(entries) : entries.map(resolve)]));
  const sourceProjectAt = (sourceRef) => {
    const source = normalized.sources.find((entry) => entry.id === sourceRef.sourceId);
    const match = /^\/projects\/(\d+)(?:\/|$)/u.exec(sourceRef.pointer);
    return match ? source.payload.projects[Number(match[1])] : null;
  };
  for (const entry of publicationRecords.experiences) {
    const experience = normalized.experiences.find((record) => record.id === entry.public.id);
    if (!experience) throw new Error(`Manifest experience is not present in sources: ${entry.public.id}`);
    if (!entry.sourceRefs.every((sourceRef) => sourceProjectAt(sourceRef)?.id === experience.id)) throw new Error(`Experience ${experience.id} has unrelated source provenance`);
    experience.publicationApproval = entry.approval;
  }
  const episodeExperience = new Map();
  // The PoC accepts one project-sized evidence unit per original project. Splitting retellings needs explicit later review.
  for (const entry of publicationRecords.evidenceEpisodes) {
    if (episodeExperience.has(entry.public.experienceId)) throw new Error(`Multiple episodes for ${entry.public.experienceId} require an independently reviewed episode split`);
    episodeExperience.set(entry.public.experienceId, entry.public.id);
    if (!entry.sourceRefs.every((sourceRef) => sourceProjectAt(sourceRef)?.id === entry.public.experienceId)) throw new Error(`Episode ${entry.public.id} has unrelated source provenance`);
  }
  for (const entry of publicationRecords.evidenceLinks) {
    const candidate = normalized.signalCandidates.find((record) => entry.sourceRefs.every((sourceRef) => record.sourceRefs.some((ref) => canonicalJson(ref) === canonicalJson(sourceRef))));
    if (!candidate || candidate.experienceId !== entry.public.experienceId) throw new Error(`Evidence link ${entry.public.id} requires a matching source signal`);
    if (entry.public.confidence !== candidate.signal.confidence || entry.public.confirmedByUser !== candidate.signal.confirmedByUser) throw new Error(`Evidence link ${entry.public.id} changes source uncertainty or confirmation`);
    candidate.publicationApproval = entry.approval;
  }
  normalized.publicationRecords = publicationRecords;
  assertSchema(normalized, normalizedEvidenceSchema, 'Approved normalized evidence');
  assertPublicMosaicData(projectPublicData(normalized, manifest));
  return normalized;
}

export function projectPublicData(normalized, manifest) {
  assertNormalizedIntegrity(normalized);
  assertSchema(manifest, publicationManifestSchema, 'Publication manifest');
  if (normalized.sourceDigest !== manifest.sourceDigest) throw new Error('Publication manifest source digest does not match normalized sources');
  if (normalized.datasetKind !== manifest.datasetKind) throw new Error('Publication dataset kind mismatch');
  if (!normalized.publicationRecords) throw new Error('Normalized records have not been explicitly approved');
  const resolve = (entry, matching) => {
    if (canonicalJson(matching.approval) !== canonicalJson(manifest.publication)) throw new Error('Individual approval must match the publication reviewer and revision');
    const reviewedRefs = matching.sourceRefs.map(({ sourcePath, pointer }) => {
      const source = normalized.sources.find((record) => record.relativePath === sourcePath);
      if (!source) throw new Error('Manifest source was removed');
      return { sourceId: source.id, sha256: source.sha256, pointer };
    });
    if (canonicalJson(reviewedRefs) !== canonicalJson(entry.sourceRefs)) throw new Error('Normalized provenance differs from approved manifest');
    if (entry.approval.status !== 'approved' || canonicalJson(entry.approval) !== canonicalJson(matching.approval) || canonicalJson(entry.public) !== canonicalJson(matching.public)) throw new Error('Normalized approval or reviewed wording differs from manifest');
    return structuredClone(matching.public);
  };
  const records = {};
  for (const [collection, entries] of Object.entries(normalized.publicationRecords)) {
    const reviewed = manifest.records[collection];
    if (collection === 'profile') records[collection] = resolve(entries, reviewed);
    else {
      if (entries.length !== reviewed.length) throw new Error(`Manifest ${collection} record count mismatch`);
      records[collection] = entries.map((entry, index) => resolve(entry, reviewed[index]));
    }
  }
  for (const entry of normalized.publicationRecords.evidenceLinks) {
    const candidate = normalized.signalCandidates.find((record) => record.experienceId === entry.public.experienceId && entry.sourceRefs.every((sourceRef) => record.sourceRefs.some((ref) => canonicalJson(ref) === canonicalJson(sourceRef))));
    if (!candidate || canonicalJson(candidate.publicationApproval) !== canonicalJson(entry.approval)) throw new Error(`Evidence link ${entry.public.id} source candidate is not approved`);
  }
  for (const entry of records.experiences) if (normalized.experiences.find((experience) => experience.id === entry.id)?.publicationApproval.status !== 'approved') throw new Error(`Experience ${entry.id} is not approved in normalized evidence`);
  return assertPublicMosaicData({ schemaVersion: '1.0', datasetKind: normalized.datasetKind, publication: structuredClone(manifest.publication), ...records });
}
