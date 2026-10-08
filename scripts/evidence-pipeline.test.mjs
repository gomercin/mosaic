import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { applyPublicationManifest, assertNormalizedIntegrity, canonicalJson, interviewSourceSchema, normalizeSources, normalizedEvidenceSchema, projectPublicData, publicationManifestSchema, serialize, sha256 } from './evidence-pipeline.mjs';
import { generateSyntheticArtifacts, repositoryRoot, syntheticSourcePaths } from './build-public-data.mjs';
import { assertPublicMosaicData, publicContractSchema, validatePublicMosaicData } from '../src/data/publicContract.mjs';

const fixtureRoot = resolve(repositoryRoot, 'fixtures/synthetic');
const inputs = await Promise.all(syntheticSourcePaths.map(async (relativePath) => ({ relativePath, bytes: await readFile(resolve(fixtureRoot, relativePath), 'utf8') })));
const manifest = JSON.parse(await readFile(resolve(fixtureRoot, 'publication-manifest.json'), 'utf8'));
const pending = () => normalizeSources(inputs, { datasetKind: 'synthetic' }).normalized;
const approved = () => applyPublicationManifest(pending(), manifest);
const data = () => projectPublicData(approved(), manifest);
const changeSource = (input, update) => {
  const copy = { ...input };
  const payload = JSON.parse(copy.bytes);
  update(payload);
  copy.bytes = serialize(payload);
  return copy;
};

test('normalization is deterministic across input order and preserves byte hashes, original IDs, pointers and uncertainty', () => {
  const first = normalizeSources(inputs, { datasetKind: 'synthetic' });
  const second = normalizeSources([...inputs].reverse(), { datasetKind: 'synthetic' });
  assert.equal(serialize(first), serialize(second));
  assert.deepEqual(first.normalized.experiences.map((item) => item.originalProjectId), ['synthetic-checkpoint-view', 'synthetic-handoff-workshop', 'synthetic-sensor-notebook']);
  for (const source of first.normalized.sources) assert.equal(source.sha256, sha256(inputs.find((input) => input.relativePath === source.relativePath).bytes));
  const candidate = first.normalized.signalCandidates.find((item) => item.experienceId === 'synthetic-sensor-notebook');
  assert.equal(candidate.signal.confidence, 'low');
  assert.equal(candidate.signal.confirmedByUser, false);
  assert.match(candidate.sourceRefs[0].pointer, /^\/projects\/0\/provisionalSignals\/0$/u);
  assert.equal(first.normalized.publicationRecords, null);
  assert.ok(first.normalized.experiences.every((item) => item.publicationApproval.status === 'pending'));
});

test('exact retellings merge provenance and never create extra independent signals or evidence episodes', () => {
  const repeated = { ...inputs[0], relativePath: 'engineering-retelling.json' };
  const { normalized, mergeReport } = normalizeSources([...inputs, repeated], { datasetKind: 'synthetic' });
  assert.equal(mergeReport.projectOccurrenceCount, 4);
  assert.equal(mergeReport.canonicalProjectCount, 3);
  assert.equal(mergeReport.exactRepeatedRecords.length, 1);
  const experience = normalized.experiences.find((item) => item.id === 'synthetic-checkpoint-view');
  assert.equal(experience.occurrences.length, 1);
  assert.equal(experience.occurrences[0].sourceRefs.length, 2);
  assert.equal(normalized.signalCandidates.length, 3);
  assert.equal(normalized.publicationRecords, null);
});

test('different retellings retain their original identity and remain unresolved versions', () => {
  const retelling = changeSource({ ...inputs[0], relativePath: 'engineering-revised.json' }, (source) => { source.projects[0].summary = 'A later invented retelling with a different summary.'; });
  const { normalized, mergeReport } = normalizeSources([...inputs, retelling], { datasetKind: 'synthetic' });
  assert.equal(normalized.experiences.length, 3);
  assert.equal(normalized.experiences.find((item) => item.id === 'synthetic-checkpoint-view').occurrences.length, 2);
  assert.equal(mergeReport.differingRetellings.length, 1);
  assert.match(mergeReport.differingRetellings[0].disposition, /independence unresolved/u);
});

test('nullable dates and stopped outcomes survive private normalization; no capability taxonomy is invented', () => {
  const input = changeSource(inputs[0], (source) => { source.projects[0].period.start = null; source.projects[0].period.end = null; source.projects[0].status = 'stopped'; });
  const { normalized } = normalizeSources([input], { datasetKind: 'synthetic' });
  assert.equal(normalized.experiences[0].occurrences[0].record.period.start, null);
  assert.equal(normalized.experiences[0].occurrences[0].record.status, 'stopped');
  assert.equal(normalized.publicationRecords, null);
  assert.equal(normalized.signalCandidates[0].signal.label, 'Feedback inspection');
});

test('an observation-shaped classification suggestion stays unresolved rather than becoming a capability', () => {
  const input = changeSource(inputs[0], (source) => { source.suggestedClassificationTypes.push({ label: 'Invented observation', interpretation: 'Needs review', supportingProjectIds: [source.projects[0].id], confidence: 'low', confirmedByUser: false }); });
  const { normalized } = normalizeSources([input], { datasetKind: 'synthetic' });
  assert.equal(typeof normalized.unresolvedClassificationSuggestions[2].value, 'object');
  assert.match(normalized.unresolvedClassificationSuggestions[2].reason, /manual review/u);
  assert.equal(normalized.publicationRecords, null);
});

test('unsupported source versions, unknown source keys and dangling observations fail closed', () => {
  assert.throws(() => normalizeSources([changeSource(inputs[0], (source) => { source.schemaVersion = '0.3'; })]), /must equal/u);
  assert.throws(() => normalizeSources([changeSource(inputs[0], (source) => { source.projects[0].unexpected = 'private'; })]), /not allowed/u);
  assert.throws(() => normalizeSources([changeSource(inputs[0], (source) => { source.crossProjectObservations.push({ label: 'Observation', interpretation: 'Unresolved', supportingProjectIds: ['missing'], confidence: 'low', confirmedByUser: false }); })]), /unknown project/u);
});

test('publication is blocked without individual approvals or when source binding is stale', () => {
  assert.throws(() => projectPublicData(pending(), manifest), /not been explicitly approved/u);
  const stale = structuredClone(manifest); stale.sourceDigest = '0'.repeat(64);
  assert.throws(() => applyPublicationManifest(pending(), stale), /digest does not match/u);
  const missing = structuredClone(manifest); delete missing.records.evidenceLinks[0].approval;
  assert.throws(() => applyPublicationManifest(pending(), missing), /approval is required/u);
  const unapproved = structuredClone(manifest); unapproved.records.experiences[0].approval.status = 'pending';
  assert.throws(() => applyPublicationManifest(pending(), unapproved), /must equal/u);
  const differentRevision = structuredClone(manifest); differentRevision.records.profile.approval.revision = 'unreviewed';
  assert.throws(() => applyPublicationManifest(pending(), differentRevision), /reviewer and revision/u);
});

test('normalized source tampering, candidate parent swaps and removed candidates are rejected', () => {
  const bytes = pending(); bytes.sources[0].rawText += ' ';
  assert.throws(() => assertNormalizedIntegrity(bytes), /hash/u);
  const payload = pending(); payload.sources[0].payload.projects[0].summary = 'Tampered';
  assert.throws(() => assertNormalizedIntegrity(payload), /hash/u);
  const moved = pending(); moved.signalCandidates[0].experienceId = moved.signalCandidates[1].experienceId;
  assert.throws(() => assertNormalizedIntegrity(moved), /deterministic source import/u);
  const removed = pending(); removed.signalCandidates.pop();
  assert.throws(() => assertNormalizedIntegrity(removed), /deterministic source import/u);
  const pointer = pending(); pointer.experiences[0].occurrences[0].sourceRefs[0].pointer = '/projects/9';
  assert.throws(() => assertNormalizedIntegrity(pointer), /deterministic source import/u);
});

test('reviewed links cannot upgrade confidence, invent confirmation or add unrelated provenance', () => {
  const confidence = structuredClone(manifest); confidence.records.evidenceLinks[0].public.confidence = 'high';
  assert.throws(() => applyPublicationManifest(pending(), confidence), /uncertainty or confirmation/u);
  const confirmation = structuredClone(manifest); confirmation.records.evidenceLinks[0].public.confirmedByUser = true;
  assert.throws(() => applyPublicationManifest(pending(), confirmation), /uncertainty or confirmation/u);
  const unrelated = structuredClone(manifest); unrelated.records.evidenceLinks[0].sourceRefs.push({ sourcePath: 'research.json', pointer: '/projects/0/provisionalSignals/0' });
  assert.throws(() => applyPublicationManifest(pending(), unrelated), /matching source signal/u);
  const unknown = structuredClone(manifest); unknown.records.profile.sourceRefs[0].pointer = '/unknown';
  assert.throws(() => applyPublicationManifest(pending(), unknown), /Unknown source pointer/u);
});

test('retellings cannot be projected as extra independent episodes', () => {
  const duplicate = structuredClone(manifest); const episode = structuredClone(duplicate.records.evidenceEpisodes[0]); episode.public.id = 'another-episode'; duplicate.records.evidenceEpisodes.push(episode);
  assert.throws(() => applyPublicationManifest(pending(), duplicate), /independently reviewed episode split/u);
});

test('post-approval wording, approval state or provenance changes fail projection', () => {
  const wording = approved(); wording.publicationRecords.profile.public.summary = 'Unreviewed wording';
  assert.throws(() => projectPublicData(wording, manifest), /differs from manifest/u);
  const state = approved(); state.experiences[0].publicationApproval = { status: 'pending' };
  assert.throws(() => projectPublicData(state, manifest), /not approved/u);
  const revised = structuredClone(manifest); revised.publication.revision = 'unreviewed-revision';
  assert.throws(() => projectPublicData(approved(), revised), /reviewer and revision/u);
  const candidate = approved(); candidate.signalCandidates[0].publicationApproval = { status: 'pending' };
  assert.throws(() => projectPublicData(candidate, manifest), /source candidate is not approved/u);
  const provenance = approved(); provenance.publicationRecords.profile.sourceRefs[0].pointer = '/projects/0';
  assert.throws(() => projectPublicData(provenance, manifest), /provenance differs/u);
});

test('public projection contains only reviewed allowlisted fields and keeps distinct outcomes and attribution', async () => {
  const { normalized, publicData } = await generateSyntheticArtifacts();
  assert.equal(publicData.datasetKind, 'synthetic');
  assert.equal(publicData.experiences.length, 3);
  assert.equal(publicData.evidenceEpisodes.length, 3);
  assert.deepEqual(new Set(publicData.evidenceEpisodes.map((item) => item.outcomeStatus)), new Set(['delivered', 'stopped', 'idea']));
  assert.equal(publicData.evidenceLinks.filter((item) => item.capabilityId === 'feedback-inspection').length, 2);
  assert.ok(publicData.evidenceEpisodes.every((item) => item.myContribution && item.teamContribution && item.aiContribution && item.limitation));
  assert.match(serialize(normalized), /PRIVATE_EVIDENCE_CANARY/u);
  for (const marker of ['PRIVATE_EVIDENCE_CANARY', 'rawNotes', 'rawNarrative', 'privateNotes', 'sourceDigest', 'sourceRefs', 'engineering.json', 'publicUseApproved']) assert.ok(!serialize(publicData).includes(marker), marker);
  assert.equal(serialize(publicData), await readFile(resolve(repositoryRoot, 'public/data/mosaic.json'), 'utf8'));
});

test('shared validator rejects unknown/private fields recursively and unsupported public versions', () => {
  for (const mutate of [
    (value) => { value.rawNotes = 'Private'; },
    (value) => { value.experiences[0].rawNarrative = 'Private'; },
    (value) => { value.experiences[0].period.secret = 'Private'; },
    (value) => { value.evidenceEpisodes[0].sourceRefs = []; },
  ]) { const value = data(); mutate(value); assert.ok(validatePublicMosaicData(value).some((error) => error.includes('not allowed'))); }
  const version = data(); version.schemaVersion = '2.0'; assert.throws(() => assertPublicMosaicData(version), /must equal/u);
  const approval = data(); approval.publication.status = 'pending'; assert.throws(() => assertPublicMosaicData(approval), /must equal/u);
  assert.ok(validatePublicMosaicData(null).length);
  assert.ok(validatePublicMosaicData({}).length);
});

test('shared validator rejects duplicate IDs, broken refs, episode ownership mismatches and orphan graph pairs', () => {
  const duplicate = data(); duplicate.evidenceLinks.push(duplicate.evidenceLinks[0]); assert.match(validatePublicMosaicData(duplicate).join('\n'), /duplicates/u);
  const duplicateUnit = data(); duplicateUnit.evidenceLinks.push({ ...duplicateUnit.evidenceLinks[0], id: 'another-link' }); assert.match(validatePublicMosaicData(duplicateUnit).join('\n'), /duplicates an existing/u);
  const missing = data(); missing.evidenceLinks[0].capabilityId = 'missing'; assert.match(validatePublicMosaicData(missing).join('\n'), /unknown capabilities/u);
  const mismatch = data(); mismatch.evidenceLinks[0].episodeId = 'episode-sensor-plan'; assert.match(validatePublicMosaicData(mismatch).join('\n'), /different experience/u);
  const orphanPair = data(); orphanPair.evidenceLinks.shift(); assert.match(validatePublicMosaicData(orphanPair).join('\n'), /has no evidence link/u);
  const orphanCapability = data(); orphanCapability.capabilities.push({ id: 'orphan', label: 'Orphan', category: 'Synthetic', description: 'No evidence' }); assert.match(validatePublicMosaicData(orphanCapability).join('\n'), /has no evidence link/u);
  const orphanEpisode = data(); orphanEpisode.evidenceEpisodes.push({ ...orphanEpisode.evidenceEpisodes[0], id: 'orphan' }); assert.match(validatePublicMosaicData(orphanEpisode).join('\n'), /has no evidence link/u);
});

test('checked-in versioned schemas match the executable contracts', async () => {
  for (const [name, schema] of [['interview-source.v0.2.schema.json', interviewSourceSchema], ['normalized-evidence.v1.schema.json', normalizedEvidenceSchema], ['publication-manifest.v1.schema.json', publicationManifestSchema], ['public-mosaic.v1.schema.json', publicContractSchema]]) assert.equal(canonicalJson(JSON.parse(await readFile(resolve(repositoryRoot, 'schemas', name), 'utf8'))), canonicalJson(schema));
});

test('fixed synthetic CLI rejects source overrides and read-only freshness verification succeeds', () => {
  const script = resolve(repositoryRoot, 'scripts/build-public-data.mjs');
  const rejected = spawnSync(process.execPath, [script, '--input', '_interview_raw_extracts'], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Usage/u);
  const checked = spawnSync(process.execPath, [script, '--check'], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /Checked approved synthetic/u);
});
