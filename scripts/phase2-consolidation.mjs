import { assertNormalizedIntegrity, canonicalJson, normalizeSources, normalizedEvidenceSchema, sha256 } from './evidence-pipeline.mjs';

export const PHASE2_VERSION = '2A.1.0';
const text = { type: 'string', minLength: 1 };
const strings = { type: 'array', items: text, uniqueItems: true };
const count = { type: 'integer', minimum: 0 };
const hash = { ...text, pattern: '^[a-f0-9]{64}$' };
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const array = (items, minItems = 0) => ({ type: 'array', items, minItems });
const pending = object({ status: { const: 'pending' } });
const sourceRef = object({ sourceId: text, sha256: hash, pointer: text });
const reviewRef = object({ sourceId: text, pointer: text });
const unconfirmed = { const: 'unconfirmed' };
const base = { schemaVersion: { const: PHASE2_VERSION }, sourceDigest: hash, publicationApproval: pending };
const candidateInput = object({ id: text, type: text, label: text, meaning: text, supportingProjectIds: strings, supportingSignalIds: strings, observationIds: strings, evidenceRefs: array(reviewRef), reasons: strings, confidence: { enum: ['high', 'medium', 'low'] }, confirmationStatus: unconfirmed, alternativeInterpretations: strings, contradictions: strings, reviewQuestions: strings });
const relationshipInput = object({ id: text, fromCandidateId: text, toCandidateId: text, type: { enum: ['related', 'distinct', 'alternative', 'broader', 'narrower'] }, reason: text });
const episodeInput = object({ id: text, projectId: text, occurrenceIds: strings, evidenceRefs: array(reviewRef), summary: text, claimBasis: text, limitations: strings, outcomeStatus: { enum: ['source-described', 'delivered', 'stopped', 'idea', 'mixed', 'unresolved'] }, independenceStatus: { enum: ['unresolved', 'same-project', 'distinct-episode-proposed'] }, rationale: text });
const classificationType = object({ type: text, label: text, meaning: text, reason: text });
const rejectedGrouping = object({ id: text, proposedCandidateIds: strings, projectIds: strings, evidenceRefs: array(reviewRef), reason: text, contradictions: strings });
const identityInput = object({ id: text, label: text, projectIds: strings, reason: text, disposition: { const: 'review-only' }, independenceRelation: { enum: ['unresolved', 'same-program', 'distinct-context-proposed'] } });
export const editorialReviewSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'https://gomercin.github.io/mosaic/schemas/editorial-review.v2a.schema.json', title: 'Private proposed editorial review for Phase 2A',
  ...object({ schemaVersion: { const: PHASE2_VERSION }, sourceDigest: hash, reviewStatus: { const: 'proposed' }, reviewer: text, revision: text, candidates: array(candidateInput), relationships: array(relationshipInput), episodeCandidates: array(episodeInput), reviewQuestions: strings, identityReviewGroups: array(identityInput), classificationTypes: array(classificationType), rejectedGroupings: array(rejectedGrouping), synthesisNotes: strings }, ['schemaVersion', 'sourceDigest', 'reviewStatus', 'reviewer', 'revision', 'candidates', 'relationships', 'episodeCandidates', 'reviewQuestions', 'identityReviewGroups']),
};
const fieldSchema = object({ id: text, sourceId: text, pointer: text, category: { enum: ['project-claim', 'source-signal', 'cross-project-observation', 'classification-suggestion', 'profile-context', 'export-note', 'source-metadata'] }, sourceValue: {}, sourceRefs: array(sourceRef, 1) });
const claimSchema = object({ id: text, projectId: text, occurrenceId: text, fieldPath: text, basis: { const: 'reported' }, claimKind: { enum: ['metadata', 'self-description', 'attribution', 'outcome-claim', 'limitation', 'raw-note'] }, sourceValue: {}, sourceRefs: array(sourceRef, 1), publicationApproval: pending });
const rawOccurrenceSchema = object({ id: text, projectId: text, canonicalOccurrenceId: text, sourceRefs: array(sourceRef, 1), publicationApproval: pending });
const episodeSchema = object({ id: text, projectId: text, evidenceUnitType: { enum: ['project-sized-proposal', 'editorial-episode-proposal'] }, canonicalOccurrenceIds: strings, projectOccurrenceIds: strings, claimIds: strings, sourceSignalIds: strings, sourceRefs: array(sourceRef, 1), editorialProposal: { anyOf: [{ const: null }, episodeInput] }, confirmationStatus: unconfirmed, independenceStatus: { enum: ['unresolved', 'same-project', 'distinct-episode-proposed'] }, publicationApproval: pending });
const envelopeItem = object({ id: text, value: {}, sourceRefs: array(sourceRef, 1) });
const independenceSchema = object({ observedContextCount: count, conservativeIndependentContextCount: count, independentContextBounds: object({ lower: count, upper: count }), confirmedIndependentEpisodeCount: { const: 0 }, demonstrationCount: { const: 0 }, contextGroups: array(strings), qualification: text });
const originalSignal = object({ id: text, projectId: text, signal: normalizedEvidenceSchema.properties.signalCandidates.items.properties.signal, sourceRefs: array(sourceRef, 1) });
const candidateOutput = object({ ...candidateInput.properties, originalSignals: array(originalSignal), resolvedSourceRefs: array(sourceRef, 1), sourceClaimIds: strings, candidateEpisodeIds: strings, independence: independenceSchema, publicationApproval: pending });
const relationshipOutput = object({ ...relationshipInput.properties, publicationApproval: pending });
const ancillary = object({ relativePath: text, byteLength: count, sha256: hash, retention: { const: 'metadata-only-non-interview' } });
const countNames = ['interviewJsonSources', 'ancillaryFiles', 'projectOccurrences', 'originalProjectIds', 'canonicalProjectRecords', 'rawSignalOccurrences', 'canonicalSignals', 'crossObservationOccurrences', 'classificationSuggestionOccurrences', 'profileContexts', 'exportNotes', 'sourceLeafFields', 'uncoveredSourceFields', 'editorialCandidates', 'candidateEpisodes'];
const coverageRow = object({ sourceId: text, pointer: text, sourceFieldId: text, retainedInNormalizedPayload: { const: true } });
const coverageSource = object({ sourceId: text, sha256: hash, profileContextId: text, projectOccurrenceIds: strings, signalOccurrenceIds: strings, crossObservationIds: strings, classificationSuggestionIds: strings, exportNoteIds: strings, sourceFieldIds: strings });
const rawSignal = object({ id: text, projectOccurrenceId: text, canonicalSignalId: text, sourceRefs: array(sourceRef, 1) });
const nullableReview = { anyOf: [{ const: null }, editorialReviewSchema] };
export const phase2ArtifactSchemas = {
  consolidatedEvidence: { $schema: 'https://json-schema.org/draft/2020-12/schema', ...object({ ...base, normalizedEvidence: normalizedEvidenceSchema, projectOccurrences: array(rawOccurrenceSchema), sourceFields: array(fieldSchema), sourceClaims: array(claimSchema), sourceInterpretations: normalizedEvidenceSchema.properties.signalCandidates, candidateEpisodes: array(episodeSchema), envelopeRecords: array(object({ sourceId: text, profileContext: envelopeItem, exportNotes: array(envelopeItem), schemaVersion: envelopeItem })) }) },
  capabilityCandidates: { $schema: 'https://json-schema.org/draft/2020-12/schema', ...object({ ...base, confirmationStatus: unconfirmed, candidates: array(candidateOutput), relationships: array(relationshipOutput), unmappedSourceSignalIds: strings, unresolvedClassificationSuggestionIds: strings }) },
  crossProjectPatterns: { $schema: 'https://json-schema.org/draft/2020-12/schema', ...object({ ...base, sourceInterpretationStatus: { const: 'source-reported-unverified' }, sourceObservations: normalizedEvidenceSchema.properties.crossProjectObservations, candidateInterpretations: array(candidateOutput), sourceClassificationSuggestions: normalizedEvidenceSchema.properties.unresolvedClassificationSuggestions, interpretedCandidateIds: strings, relationshipIds: strings }) },
  consolidationDecisions: { $schema: 'https://json-schema.org/draft/2020-12/schema', ...object({ ...base, storageMergeReport: {}, editorialReview: nullableReview, identityReviewGroups: array(identityInput), rejectedGroupings: array(rejectedGrouping), synthesisNotes: strings, classificationTypes: array(classificationType), exactObservationDuplicateGroups: array(object({ canonicalSha256: hash, sourceObservationIds: strings, disposition: { const: 'Retained all source observations; duplicates are not independent evidence.' } })), identityMergesPerformed: { type: 'array', maxItems: 0, items: {} }, independence: independenceSchema, ancillaryFiles: array(ancillary), inputInventoryDigest: hash, publicationDecision: { const: 'Withheld: Phase 2A is a private editorial foundation.' }, reviewQuestions: strings }) },
  sourceCoverage: { $schema: 'https://json-schema.org/draft/2020-12/schema', ...object({ ...base, counts: object(Object.fromEntries(countNames.map((name) => [name, count]))), sources: array(coverageSource), projectOccurrences: array(rawOccurrenceSchema), signalOccurrences: array(rawSignal), leafCoverage: array(coverageRow), uncovered: { type: 'array', items: {}, maxItems: 0 }, ancillaryFiles: array(ancillary), independence: independenceSchema }) },
};

for (const [key, schema] of Object.entries(phase2ArtifactSchemas)) {
  const slug = key.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
  schema.$id = `https://gomercin.github.io/mosaic/schemas/${slug}.v2a.schema.json`;
  schema.title = `Private Phase 2A ${slug.replaceAll('-', ' ')}`;
}

// Local validation handles numbers/null explicitly; Phase 1's browser contract has no numeric fields.
export function validatePhase2Value(value, schema, path = '$') {
  const errors = [];
  const visit = (current, rule, at) => {
    if (rule.anyOf) {
      if (!rule.anyOf.some((option) => validatePhase2Value(current, option, at).length === 0)) errors.push(`${at}: unsupported shape`);
      return;
    }
    if (Object.hasOwn(rule, 'const') && current !== rule.const) errors.push(`${at}: incorrect constant`);
    if (rule.enum && !rule.enum.includes(current)) errors.push(`${at}: unsupported enum`);
    if (rule.type === 'object') {
      if (!current || typeof current !== 'object' || Array.isArray(current)) { errors.push(`${at}: expected object`); return; }
      for (const key of rule.required ?? []) if (!Object.hasOwn(current, key)) errors.push(`${at}.${key}: required`);
      for (const key of Object.keys(current)) {
        if (Object.hasOwn(rule.properties ?? {}, key)) visit(current[key], rule.properties[key], `${at}.${key}`);
        else if (rule.additionalProperties === false) errors.push(`${at}: unexpected field`);
      }
    } else if (rule.type === 'array') {
      if (!Array.isArray(current)) { errors.push(`${at}: expected array`); return; }
      if (rule.minItems !== undefined && current.length < rule.minItems) errors.push(`${at}: too few items`);
      if (rule.maxItems !== undefined && current.length > rule.maxItems) errors.push(`${at}: too many items`);
      if (rule.uniqueItems && new Set(current.map(canonicalJson)).size !== current.length) errors.push(`${at}: duplicate items`);
      current.forEach((item, index) => visit(item, rule.items ?? {}, `${at}[${index}]`));
    } else if (rule.type === 'string') {
      if (typeof current !== 'string' || current.trim().length < (rule.minLength ?? 0)) errors.push(`${at}: expected nonempty string`);
      else if (rule.pattern && !new RegExp(rule.pattern, 'u').test(current)) errors.push(`${at}: invalid format`);
    } else if (rule.type === 'boolean' && typeof current !== 'boolean') errors.push(`${at}: expected boolean`);
    else if ((rule.type === 'number' || rule.type === 'integer') && (typeof current !== 'number' || !Number.isFinite(current) || (rule.type === 'integer' && !Number.isInteger(current)) || (rule.minimum !== undefined && current < rule.minimum))) errors.push(`${at}: expected bounded ${rule.type}`);
    else if (rule.type === 'null' && current !== null) errors.push(`${at}: expected null`);
  };
  visit(value, schema, path);
  return errors;
}
function assertSchema(value, schema, category) {
  if (validatePhase2Value(value, schema).length) throw new Error(`Phase 2A ${category} schema validation failed.`);
}
const pendingApproval = () => ({ status: 'pending' });
const sortById = (entries) => entries.sort((a, b) => a.id.localeCompare(b.id, 'en'));
const unique = (items) => [...new Set(items)].sort((a, b) => a.localeCompare(b, 'en'));
const refKey = ({ sourceId, pointer }) => `${sourceId}:${pointer}`;
const escaped = (key) => key.replaceAll('~', '~0').replaceAll('/', '~1');
export function fieldObservationId(occurrenceId, field, index) { return `${occurrenceId}:field:${field}${index === undefined ? '' : `:${index}`}`; }
function leafValues(value, pointer = '') {
  if (Array.isArray(value) && value.length) return value.flatMap((item, index) => leafValues(item, `${pointer}/${index}`));
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) return Object.keys(value).sort().flatMap((key) => leafValues(value[key], `${pointer}/${escaped(key)}`));
  return [{ pointer, value }];
}
function resolvePointer(value, pointer) {
  if (pointer === '') return value;
  if (!pointer.startsWith('/')) throw new Error('Phase 2A source pointer is invalid.');
  for (const key of pointer.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) throw new Error('Phase 2A source pointer does not resolve.');
    value = value[key];
  }
  return value;
}
function uniqueIds(entries, category) {
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error(`Phase 2A duplicate ${category} IDs.`);
}
function claimKind(path) {
  const field = path.split('/')[1];
  if (['myContribution', 'teamOrExistingContribution'].includes(field)) return 'attribution';
  if (field === 'outcomes' || field === 'status') return 'outcome-claim';
  if (['constraints', 'openQuestions', 'confidentiality'].includes(field)) return 'limitation';
  if (field === 'rawNotes') return 'raw-note';
  return ['id', 'title', 'period', 'context', 'tools', 'tags'].includes(field) ? 'metadata' : 'self-description';
}
function fieldCategory(pointer) {
  if (/^\/projects\/\d+\/provisionalSignals(?:\/|$)/u.test(pointer)) return 'source-signal';
  if (pointer.startsWith('/projects/')) return 'project-claim';
  if (pointer.startsWith('/crossProjectObservations')) return 'cross-project-observation';
  if (pointer.startsWith('/suggestedClassificationTypes')) return 'classification-suggestion';
  if (pointer.startsWith('/profileContext')) return 'profile-context';
  if (pointer.startsWith('/exportNotes')) return 'export-note';
  return 'source-metadata';
}
function contextIndependence(projectIds, groups) {
  const ids = unique(projectIds);
  const allIds = unique([...ids, ...groups.flatMap((group) => group.projectIds)]);
  const parent = new Map(allIds.map((id) => [id, id]));
  const find = (id) => { while (parent.get(id) !== id) id = parent.get(id); return id; };
  for (const group of groups) if (group.independenceRelation !== 'distinct-context-proposed') {
    const present = group.projectIds.filter((id) => parent.has(id));
    for (const id of present.slice(1)) parent.set(find(id), find(present[0]));
  }
  const components = new Map();
  for (const id of ids) { const representative = find(id); components.set(representative, [...(components.get(representative) ?? []), id]); }
  const contextGroups = [...components.values()].map(unique).sort((a, b) => a[0].localeCompare(b[0], 'en'));
  return { observedContextCount: ids.length, conservativeIndependentContextCount: contextGroups.length, independentContextBounds: { lower: 0, upper: ids.length }, confirmedIndependentEpisodeCount: 0, demonstrationCount: 0, contextGroups,
    qualification: 'Counts group named source contexts conservatively; no episode independence or capability demonstration is confirmed. Repeated signals and retellings do not increase the context count.' };
}

export function consolidateInterviews(inputs, { editorialReview = null, ancillaryFiles = [] } = {}) {
  let normalized, mergeReport;
  try { ({ normalized, mergeReport } = normalizeSources(inputs, { datasetKind: 'curated' })); assertNormalizedIntegrity(normalized); }
  catch (cause) { throw new Error('Phase 2A source normalization failed; inspect the private inventory.', { cause }); }
  const sourceDigest = normalized.sourceDigest;
  const artifactBase = () => ({ schemaVersion: PHASE2_VERSION, sourceDigest, publicationApproval: pendingApproval() });
  if (editorialReview !== null) {
    assertSchema(editorialReview, editorialReviewSchema, 'editorial review');
    if (editorialReview.sourceDigest !== sourceDigest) throw new Error('Phase 2A editorial review source digest is stale.');
    for (const category of ['candidates', 'relationships', 'episodeCandidates', 'identityReviewGroups', 'rejectedGroupings']) uniqueIds(editorialReview[category] ?? [], category);
  }
  const review = editorialReview;
  const sources = new Map(normalized.sources.map((source) => [source.id, source]));
  const projects = new Map(normalized.experiences.map((entry) => [entry.id, entry]));
  const occurrences = new Map(normalized.experiences.flatMap((entry) => entry.occurrences.map((occurrence) => [occurrence.id, { ...occurrence, projectId: entry.id }])));
  const signals = new Map(normalized.signalCandidates.map((entry) => [entry.id, entry]));
  const observations = new Map([...normalized.crossProjectObservations, ...normalized.unresolvedClassificationSuggestions.filter((entry) => typeof entry.value === 'object')].map((entry) => [entry.id, entry]));
  const makeRef = (sourceId, pointer) => {
    const source = sources.get(sourceId);
    if (!source) throw new Error('Phase 2A editorial source reference is unknown.');
    resolvePointer(source.payload, pointer);
    return { sourceId, sha256: source.sha256, pointer };
  };
  const checkProjectIds = (ids) => { if (ids.some((id) => !projects.has(id))) throw new Error('Phase 2A editorial project reference is unknown.'); };
  for (const group of review?.identityReviewGroups ?? []) { checkProjectIds(group.projectIds); if (group.projectIds.length < 2) throw new Error('Phase 2A identity review groups require at least two original projects.'); }
  const identityGroups = structuredClone(review?.identityReviewGroups ?? []).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const projectOccurrences = [];
  const sourceFields = [];
  const envelopeRecords = [];
  const sourceClaims = [];
  const signalOccurrences = [];
  const coverageSources = [];
  for (const source of normalized.sources) {
    const fields = leafValues(source.payload).map(({ pointer, value }) => ({ id: `${source.id}:field:${sha256(pointer).slice(0, 16)}`, sourceId: source.id, pointer, category: fieldCategory(pointer), sourceValue: structuredClone(value), sourceRefs: [makeRef(source.id, pointer)] }));
    sourceFields.push(...fields);
    const profileContext = { id: `${source.id}:profile-context`, value: structuredClone(source.payload.profileContext), sourceRefs: [makeRef(source.id, '/profileContext')] };
    const exportNotes = source.payload.exportNotes.map((value, index) => ({ id: `${source.id}:export-note:${index}`, value, sourceRefs: [makeRef(source.id, `/exportNotes/${index}`)] }));
    envelopeRecords.push({ sourceId: source.id, profileContext, exportNotes, schemaVersion: { id: `${source.id}:schema-version`, value: source.payload.schemaVersion, sourceRefs: [makeRef(source.id, '/schemaVersion')] } });
    const rawProjectIds = [], rawSignalIds = [];
    source.payload.projects.forEach((project, index) => {
      const occurrence = projects.get(project.id).occurrences.find((entry) => entry.sourceRefs.some((ref) => ref.sourceId === source.id && ref.pointer === `/projects/${index}`));
      const rawId = `${source.id}:project:${index}`;
      projectOccurrences.push({ id: rawId, projectId: project.id, canonicalOccurrenceId: occurrence.id, sourceRefs: [makeRef(source.id, `/projects/${index}`)], publicationApproval: pendingApproval() });
      rawProjectIds.push(rawId);
      project.provisionalSignals.forEach((_signal, signalIndex) => {
        const rawSignalId = `${rawId}:signal:${signalIndex}`;
        signalOccurrences.push({ id: rawSignalId, projectOccurrenceId: rawId, canonicalSignalId: `${occurrence.id}:signal:${signalIndex}`, sourceRefs: [makeRef(source.id, `/projects/${index}/provisionalSignals/${signalIndex}`)] });
        rawSignalIds.push(rawSignalId);
      });
    });
    coverageSources.push({ sourceId: source.id, sha256: source.sha256, profileContextId: profileContext.id, projectOccurrenceIds: rawProjectIds, signalOccurrenceIds: rawSignalIds,
      crossObservationIds: normalized.crossProjectObservations.filter((entry) => entry.sourceRefs.some((ref) => ref.sourceId === source.id)).map((entry) => entry.id),
      classificationSuggestionIds: normalized.unresolvedClassificationSuggestions.filter((entry) => entry.sourceRefs.some((ref) => ref.sourceId === source.id)).map((entry) => entry.id), exportNoteIds: exportNotes.map((entry) => entry.id), sourceFieldIds: fields.map((entry) => entry.id) });
  }
  for (const experience of normalized.experiences) for (const occurrence of experience.occurrences) {
    for (const { pointer, value } of leafValues(occurrence.record)) {
      if (pointer.startsWith('/provisionalSignals')) continue;
      const pathParts = pointer.slice(1).split('/');
      const index = /^\d+$/u.test(pathParts.at(-1)) ? Number(pathParts.pop()) : undefined;
      const id = fieldObservationId(occurrence.id, pathParts.join('/'), index);
      sourceClaims.push({ id, projectId: experience.id, occurrenceId: occurrence.id, fieldPath: pointer, claimKind: claimKind(pointer), basis: 'reported', sourceValue: structuredClone(value), sourceRefs: occurrence.sourceRefs.map((ref) => makeRef(ref.sourceId, `${ref.pointer}${pointer}`)), publicationApproval: pendingApproval() });
    }
  }
  sortById(projectOccurrences); sortById(signalOccurrences); sortById(sourceFields); sortById(sourceClaims);
  const refIncludes = (basis, target) => basis.sourceId === target.sourceId && (basis.pointer === target.pointer || target.pointer.startsWith(`${basis.pointer}/`));
  const refOverlaps = (basis, target) => refIncludes(basis, target) || refIncludes(target, basis);
  const claimsForRefs = (refs) => sourceClaims.filter((claim) => claim.sourceRefs.some((claimRef) => refs.some((ref) => refIncludes(ref, claimRef)))).map((entry) => entry.id);
  const signalsForRefs = (refs) => normalized.signalCandidates.filter((signal) => signal.sourceRefs.some((signalRef) => refs.some((ref) => refOverlaps(ref, signalRef))));
  const candidateEpisodes = normalized.experiences.map((experience) => ({ id: `episode-proposed:${experience.id}`, projectId: experience.id, evidenceUnitType: 'project-sized-proposal', canonicalOccurrenceIds: experience.occurrences.map((entry) => entry.id), projectOccurrenceIds: projectOccurrences.filter((entry) => entry.projectId === experience.id).map((entry) => entry.id), claimIds: sourceClaims.filter((entry) => entry.projectId === experience.id).map((entry) => entry.id), sourceSignalIds: normalized.signalCandidates.filter((entry) => entry.experienceId === experience.id).map((entry) => entry.id), sourceRefs: experience.occurrences.flatMap((entry) => entry.sourceRefs), editorialProposal: null, confirmationStatus: 'unconfirmed', independenceStatus: 'unresolved', publicationApproval: pendingApproval() }));
  for (const proposal of review?.episodeCandidates ?? []) {
    checkProjectIds([proposal.projectId]);
    if (!proposal.occurrenceIds.length && !proposal.evidenceRefs.length) throw new Error('Phase 2A episode proposal needs source provenance.');
    for (const id of proposal.occurrenceIds) if (occurrences.get(id)?.projectId !== proposal.projectId) throw new Error('Phase 2A episode occurrence belongs to a different project.');
    const refs = [...proposal.evidenceRefs.map((ref) => makeRef(ref.sourceId, ref.pointer)), ...proposal.occurrenceIds.flatMap((id) => occurrences.get(id).sourceRefs)];
    for (const ref of refs) {
      const match = /^\/projects\/(\d+)(?:\/|$)/u.exec(ref.pointer);
      if (!match || sources.get(ref.sourceId).payload.projects[Number(match[1])]?.id !== proposal.projectId) throw new Error('Phase 2A episode evidence belongs to a different project.');
    }
    const selectedOccurrences = projectOccurrences.filter((entry) => entry.sourceRefs.some((target) => refs.some((ref) => refOverlaps(ref, target))));
    candidateEpisodes.push({ id: proposal.id, projectId: proposal.projectId, evidenceUnitType: 'editorial-episode-proposal', canonicalOccurrenceIds: unique(selectedOccurrences.map((entry) => entry.canonicalOccurrenceId)), projectOccurrenceIds: selectedOccurrences.map((entry) => entry.id), claimIds: claimsForRefs(refs), sourceSignalIds: signalsForRefs(refs).map((entry) => entry.id), sourceRefs: [...new Map(refs.map((ref) => [refKey(ref), ref])).values()].sort((a, b) => refKey(a).localeCompare(refKey(b), 'en')), editorialProposal: structuredClone(proposal), confirmationStatus: 'unconfirmed', independenceStatus: proposal.independenceStatus, publicationApproval: pendingApproval() });
  }
  uniqueIds(candidateEpisodes, 'episode'); sortById(candidateEpisodes);
  const candidates = [];
  for (const proposal of review?.candidates ?? []) {
    checkProjectIds(proposal.supportingProjectIds);
    if (proposal.supportingSignalIds.some((id) => !signals.has(id)) || proposal.observationIds.some((id) => !observations.has(id))) throw new Error('Phase 2A candidate source interpretation reference is unknown.');
    const refs = [...proposal.evidenceRefs.map((ref) => makeRef(ref.sourceId, ref.pointer)), ...proposal.supportingSignalIds.flatMap((id) => signals.get(id).sourceRefs), ...proposal.observationIds.flatMap((id) => observations.get(id).sourceRefs)];
    if (!refs.length) throw new Error('Phase 2A candidate requires at least one source basis.');
    const supportingProjects = [ ...proposal.supportingSignalIds.map((id) => signals.get(id).experienceId), ...proposal.observationIds.flatMap((id) => (observations.get(id).observation ?? observations.get(id).value).supportingProjectIds), ...proposal.evidenceRefs.flatMap((ref) => { const match = /^\/projects\/(\d+)(?:\/|$)/u.exec(ref.pointer); return match ? [sources.get(ref.sourceId).payload.projects[Number(match[1])].id] : []; })];
    checkProjectIds(supportingProjects);
    // An explicitly supplied project set is an ownership assertion, never silently widened by a mismatched signal/ref.
    if (proposal.supportingProjectIds.some((id) => !supportingProjects.includes(id)) || (proposal.supportingProjectIds.length && supportingProjects.some((id) => !proposal.supportingProjectIds.includes(id)))) throw new Error('Phase 2A candidate provenance belongs to an undeclared supporting project.');
    const projectIds = unique(supportingProjects);
    const resolvedSourceRefs = [...new Map(refs.map((ref) => [refKey(ref), ref])).values()].sort((a, b) => refKey(a).localeCompare(refKey(b), 'en'));
    const originalSignals = signalsForRefs(resolvedSourceRefs).map((entry) => ({ id: entry.id, projectId: entry.experienceId, signal: structuredClone(entry.signal), sourceRefs: structuredClone(entry.sourceRefs) }));
    const sourceClaimIds = claimsForRefs(resolvedSourceRefs);
    const originalSignalIds = new Set(originalSignals.map((entry) => entry.id));
    const candidateEpisodeIds = candidateEpisodes.filter((entry) => projectIds.includes(entry.projectId) && (entry.evidenceUnitType === 'project-sized-proposal' || entry.claimIds.some((id) => sourceClaimIds.includes(id)) || entry.sourceSignalIds.some((id) => originalSignalIds.has(id)))).map((entry) => entry.id);
    candidates.push({ ...structuredClone(proposal), originalSignals, resolvedSourceRefs, sourceClaimIds, candidateEpisodeIds, independence: contextIndependence(projectIds, identityGroups), publicationApproval: pendingApproval() });
  }
  sortById(candidates);
  const candidateIds = new Set(candidates.map((entry) => entry.id));
  const relationships = (review?.relationships ?? []).map((entry) => {
    if (entry.fromCandidateId === entry.toCandidateId) throw new Error('Phase 2A self candidate relationships are not permitted.');
    if (!candidateIds.has(entry.fromCandidateId) || !candidateIds.has(entry.toCandidateId)) throw new Error('Phase 2A candidate relationship references an unknown candidate.');
    return { ...structuredClone(entry), publicationApproval: pendingApproval() };
  }); sortById(relationships);
  for (const group of review?.rejectedGroupings ?? []) {
    checkProjectIds(group.projectIds);
    if (group.proposedCandidateIds.some((id) => !candidateIds.has(id))) throw new Error('Phase 2A rejected grouping references an unknown candidate.');
    group.evidenceRefs.forEach((ref) => makeRef(ref.sourceId, ref.pointer));
  }
  const observationGroups = new Map();
  for (const entry of normalized.crossProjectObservations) { const fingerprint = sha256(canonicalJson(entry.observation)); observationGroups.set(fingerprint, [...(observationGroups.get(fingerprint) ?? []), entry.id]); }
  const exactObservationDuplicateGroups = [...observationGroups].filter(([, ids]) => ids.length > 1).map(([canonicalSha256, sourceObservationIds]) => ({ canonicalSha256, sourceObservationIds: unique(sourceObservationIds), disposition: 'Retained all source observations; duplicates are not independent evidence.' })).sort((a, b) => a.canonicalSha256.localeCompare(b.canonicalSha256, 'en'));
  const safeAncillary = ancillaryFiles.map((entry) => ({ ...entry, retention: 'metadata-only-non-interview' })).sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en'));
  safeAncillary.forEach((entry) => assertSchema(entry, ancillary, 'ancillary inventory'));
  if (new Set(safeAncillary.map((entry) => entry.relativePath)).size !== safeAncillary.length || safeAncillary.some((entry) => entry.relativePath.startsWith('/') || entry.relativePath.split(/[\\/]/u).includes('..') || normalized.sources.some((source) => source.relativePath === entry.relativePath))) throw new Error('Phase 2A ancillary identity is invalid.');
  const independence = contextIndependence([...projects.keys()], identityGroups);
  const inputInventoryDigest = sha256(canonicalJson([...normalized.sources.map((source) => ({ kind: 'interview-json', relativePath: source.relativePath, sha256: source.sha256, byteLength: Buffer.byteLength(source.rawText) })), ...safeAncillary.map(({ relativePath, sha256: digest, byteLength }) => ({ kind: 'ancillary', relativePath, sha256: digest, byteLength }))].sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en'))));
  const leafCoverage = sourceFields.map((entry) => ({ sourceId: entry.sourceId, pointer: entry.pointer, sourceFieldId: entry.id, retainedInNormalizedPayload: true }));
  const mappedSignals = new Set(candidates.flatMap((entry) => entry.supportingSignalIds));
  const artifacts = {
    consolidatedEvidence: { ...artifactBase(), normalizedEvidence: normalized, projectOccurrences, sourceFields, sourceClaims, sourceInterpretations: structuredClone(normalized.signalCandidates), candidateEpisodes, envelopeRecords },
    capabilityCandidates: { ...artifactBase(), confirmationStatus: 'unconfirmed', candidates, relationships, unmappedSourceSignalIds: normalized.signalCandidates.filter((entry) => !mappedSignals.has(entry.id)).map((entry) => entry.id), unresolvedClassificationSuggestionIds: normalized.unresolvedClassificationSuggestions.map((entry) => entry.id) },
    crossProjectPatterns: { ...artifactBase(), sourceInterpretationStatus: 'source-reported-unverified', candidateInterpretations: structuredClone(candidates), sourceObservations: structuredClone(normalized.crossProjectObservations), sourceClassificationSuggestions: structuredClone(normalized.unresolvedClassificationSuggestions), interpretedCandidateIds: candidates.map((entry) => entry.id), relationshipIds: relationships.map((entry) => entry.id) },
    consolidationDecisions: { ...artifactBase(), storageMergeReport: mergeReport, editorialReview: structuredClone(review), identityReviewGroups: identityGroups, rejectedGroupings: structuredClone(review?.rejectedGroupings ?? []), synthesisNotes: [...(review?.synthesisNotes ?? [])], classificationTypes: structuredClone(review?.classificationTypes ?? []), exactObservationDuplicateGroups, identityMergesPerformed: [], independence, ancillaryFiles: safeAncillary, inputInventoryDigest, publicationDecision: 'Withheld: Phase 2A is a private editorial foundation.', reviewQuestions: [...(review?.reviewQuestions ?? [])] },
    sourceCoverage: { ...artifactBase(), counts: { interviewJsonSources: normalized.sources.length, ancillaryFiles: safeAncillary.length, projectOccurrences: projectOccurrences.length, originalProjectIds: projects.size, canonicalProjectRecords: occurrences.size, rawSignalOccurrences: signalOccurrences.length, canonicalSignals: normalized.signalCandidates.length, crossObservationOccurrences: normalized.crossProjectObservations.length, classificationSuggestionOccurrences: normalized.unresolvedClassificationSuggestions.length, profileContexts: envelopeRecords.length, exportNotes: envelopeRecords.reduce((sum, entry) => sum + entry.exportNotes.length, 0), sourceLeafFields: sourceFields.length, uncoveredSourceFields: 0, editorialCandidates: candidates.length, candidateEpisodes: candidateEpisodes.length }, sources: coverageSources, projectOccurrences: structuredClone(projectOccurrences), signalOccurrences, leafCoverage, uncovered: [], ancillaryFiles: structuredClone(safeAncillary), independence: structuredClone(independence) },
  };
  for (const [key, schema] of Object.entries(phase2ArtifactSchemas)) assertSchema(artifacts[key], schema, key);
  artifacts.consolidationReview = renderConsolidationReview(artifacts);
  return artifacts;
}

export function renderConsolidationReview(artifacts) {
  const counts = artifacts.sourceCoverage.counts;
  const sourceProjects = new Map(artifacts.consolidatedEvidence.normalizedEvidence.experiences.map((entry) => [entry.id, entry]));
  const lines = ['# Private Phase 2A consolidation review', '', 'LOCAL ONLY. These source claims and editorial proposals are not a public portfolio and have no publication approval.', '', `Version: ${PHASE2_VERSION}. Source digest: ${artifacts.consolidatedEvidence.sourceDigest}.`, '', '## Coverage and boundaries', '', `${counts.interviewJsonSources} interview JSON sources and ${counts.ancillaryFiles} ancillary metadata records; ${counts.projectOccurrences} raw project occurrences, ${counts.originalProjectIds} original project IDs, ${counts.canonicalProjectRecords} canonical project records.`, '', `${counts.rawSignalOccurrences} raw signal occurrences and ${counts.canonicalSignals} canonical signals are accounted for separately. ${counts.crossObservationOccurrences} cross-project observations, ${counts.classificationSuggestionOccurrences} classification suggestions, ${counts.profileContexts} profile contexts, ${counts.exportNotes} export notes and ${counts.sourceLeafFields} source leaf fields are retained. Uncovered fields: ${counts.uncoveredSourceFields}.`, '', 'Exact repeated records share storage while retaining every source pointer. Distinct retellings and overlapping identities remain separate; no semantic project identity merges have been performed.', '', 'Source signal confirmation is retained as source metadata. Every inferred capability, working pattern, principle, relationship and episode proposal remains unconfirmed. A signal or project count is not a proficiency score or an independent demonstration.', '', '## Independence accounting', '', `${artifacts.sourceCoverage.independence.observedContextCount} named source contexts; ${artifacts.sourceCoverage.independence.conservativeIndependentContextCount} conservative context groups. Confirmed independent episodes: 0. Actual independent-context bounds remain 0 to ${artifacts.sourceCoverage.independence.independentContextBounds.upper}.`, ''];
  for (const group of artifacts.consolidationDecisions.identityReviewGroups) lines.push(`- ${group.id}: ${group.label}. ${group.reason} Disposition: review-only; ${group.independenceRelation}.`, '');
  lines.push('## Candidate interpretations', '');
  if (!artifacts.capabilityCandidates.candidates.length) lines.push('No editorial taxonomy has been supplied; source classifications remain unresolved.', '');
  for (const entry of artifacts.capabilityCandidates.candidates) {
    const contextLines = entry.independence.contextGroups.flat().flatMap((id) => sourceProjects.get(id).occurrences.map((occurrence) => `- ${id}: ${occurrence.record.title}. Source period: ${JSON.stringify(occurrence.record.period)}. Source context: ${JSON.stringify(occurrence.record.context)}. Source status: ${occurrence.record.status}.`));
    const signalLines = entry.originalSignals.flatMap((original) => [`- ${original.id}: ${original.signal.label} (${original.signal.type}); source confidence ${original.signal.confidence}; source confirmedByUser ${original.signal.confirmedByUser}.`, `  Source interpretation: ${original.signal.interpretation}`, `  Source evidence wording: ${original.signal.evidence}`]);
    lines.push(`### ${entry.label}`, '', `Type: ${entry.type}. Confidence: ${entry.confidence}. Confirmation: unconfirmed.`, '', entry.meaning, '', 'Supporting source contexts (reported, not verified):', '', ...contextLines, '', 'Original source signal labels and interpretations:', '', ...(signalLines.length ? signalLines : ['- No source signal selected; inspect the specific source claims below.']), '', 'Specific reported claim fields:', '', ...(entry.sourceClaimIds.length ? entry.sourceClaimIds.map((id) => { const claim = artifacts.consolidatedEvidence.sourceClaims.find((item) => item.id === id); return `- ${claim.projectId}${claim.fieldPath} (${claim.claimKind}, reported): ${JSON.stringify(claim.sourceValue)}`; }) : ['- No narrative claim selected; a source interpretation alone is not an independently observed action.']), '', 'Evidence basis:', '', ...entry.resolvedSourceRefs.map((ref) => `- ${ref.sourceId}${ref.pointer}`), '', `Observed contexts: ${entry.independence.observedContextCount}; conservative groups: ${entry.independence.conservativeIndependentContextCount}; confirmed demonstrations: 0.`, '', 'Reasons:', '', ...(entry.reasons.length ? entry.reasons.map((reason) => `- ${reason}`) : ['- No additional editorial reason supplied.']), '', 'Alternative interpretations:', '', ...(entry.alternativeInterpretations.length ? entry.alternativeInterpretations.map((reason) => `- ${reason}`) : ['- None supplied; this is not evidence that alternatives are absent.']), '', 'Contradictions and limitations:', '', ...(entry.contradictions.length ? entry.contradictions.map((reason) => `- ${reason}`) : ['- None supplied; no independent claim verification has been completed.']), '', 'Review questions:', '', ...(entry.reviewQuestions.length ? entry.reviewQuestions.map((question) => `- ${question}`) : ['- Does this meaning and source grouping match the subject’s account?']), '');
  }
  lines.push('## Rejected groupings and synthesis boundaries', '', ...artifacts.consolidationDecisions.synthesisNotes.map((note) => `- ${note}`), '');
  for (const grouping of artifacts.consolidationDecisions.rejectedGroupings) lines.push(`- ${grouping.id}: ${grouping.reason}`, ...grouping.contradictions.map((item) => `  Contradiction: ${item}`), '');
  lines.push('## Episode proposals and contribution boundaries', '', 'The default unit is one project-sized proposal per original project ID. Extra editorial episode proposals do not increase confirmed independence. Self, team, outcomes, constraints, context, dates, confidentiality, lessons and raw notes retain separate source claim fields. AI contribution is not inferred automatically from generic text; it requires source-specific review.', '');
  for (const entry of artifacts.consolidatedEvidence.candidateEpisodes.filter((item) => item.editorialProposal)) lines.push(`- ${entry.id}: ${entry.editorialProposal.summary} Outcome interpretation: ${entry.editorialProposal.outcomeStatus}; independence proposal: ${entry.independenceStatus}. ${entry.editorialProposal.rationale}`, '');
  lines.push('## Decisions requiring subject review', '', ...artifacts.consolidationDecisions.reviewQuestions.map((question) => `- ${question}`), '', 'Publication remains withheld. Future publication requires a separately reviewed wording manifest and explicit record approvals; this private consolidation cannot be sent directly to the public projector.', '');
  return lines.join('\n');
}

export function assertConsolidationIntegrity(artifacts) {
  if (!artifacts || typeof artifacts !== 'object' || Array.isArray(artifacts) || Object.keys(artifacts).sort().join(',') !== ['consolidatedEvidence', 'capabilityCandidates', 'crossProjectPatterns', 'consolidationDecisions', 'sourceCoverage', 'consolidationReview'].sort().join(',')) throw new Error('Phase 2A artifact set is incomplete or contains unexpected output.');
  for (const [key, schema] of Object.entries(phase2ArtifactSchemas)) assertSchema(artifacts[key], schema, key);
  if (typeof artifacts.consolidationReview !== 'string') throw new Error('Phase 2A review must be Markdown text.');
  const normalized = artifacts.consolidatedEvidence.normalizedEvidence;
  try { assertNormalizedIntegrity(normalized); } catch { throw new Error('Phase 2A normalized source integrity failed.'); }
  const regenerated = consolidateInterviews(normalized.sources.map((source) => ({ relativePath: source.relativePath, bytes: source.rawText })), { editorialReview: artifacts.consolidationDecisions.editorialReview, ancillaryFiles: artifacts.consolidationDecisions.ancillaryFiles });
  if (canonicalJson(artifacts) !== canonicalJson(regenerated)) throw new Error('Phase 2A artifacts differ from deterministic source and editorial regeneration.');
  return artifacts;
}
