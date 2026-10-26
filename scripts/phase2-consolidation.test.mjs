import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { link, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { canonicalJson, normalizeSources, projectPublicData, serialize, sha256 } from './evidence-pipeline.mjs';
import { assertConsolidationIntegrity, consolidateInterviews, editorialReviewSchema, phase2ArtifactSchemas, validatePhase2Value } from './phase2-consolidation.mjs';
import { loadPrivateSources, safeConsolidationError, writePrivateArtifacts } from './consolidate-interviews.mjs';
import { generateSyntheticArtifacts } from './build-public-data.mjs';
import { validatePublicMosaicData } from '../src/data/publicContract.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canary = 'PRIVATE_EVIDENCE_CANARY_PHASE2_SYNTHETIC';
const cli = join(repositoryRoot, 'scripts/consolidate-interviews.mjs');
const artifactNames = ['consolidated-evidence.json', 'capability-candidates.json', 'cross-project-patterns.json', 'consolidation-decisions.json', 'source-coverage.json', 'consolidation-review.md'];

function project(id, changes = {}) {
  return {
    id, title: `Invented project ${id}`, status: 'stopped', summary: canary, rawNotes: canary,
    period: { start: null, end: null, label: 'Unknown' },
    context: { type: 'Synthetic experiment', organization: null, roleAtTime: null, careerStage: 'Unknown', collaboration: 'Unresolved' },
    confidentiality: { level: 'private', publicUseApproved: false, notes: [canary] },
    motivation: [canary], problem: [canary], existingSolutionsOrAlternatives: [canary], constraints: [canary],
    myContribution: [canary], teamOrExistingContribution: [canary], approachAndDecisions: [canary],
    differentiators: [canary], outcomes: [canary], lessons: [canary], tools: [canary], tags: [canary], openQuestions: [canary],
    provisionalSignals: [{ type: 'Capability', label: 'Tentative synthetic signal', interpretation: canary, evidence: canary, confidence: 'low', confirmedByUser: false }],
    ...changes,
  };
}
function source(relativePath, projects, changes = {}) {
  return { relativePath, bytes: serialize({ schemaVersion: '0.2', profileContext: { education: canary }, projects, crossProjectObservations: [], suggestedClassificationTypes: ['Capability'], exportNotes: [canary], ...changes }) };
}
const fixtureInputs = () => [source('alpha.json', [project('synthetic-a')]), source('nested/beta.json', [project('synthetic-b', { status: 'idea' })])];
const artifacts = (inputs = fixtureInputs(), options) => consolidateInterviews(inputs, options);
const normalized = (value) => value.consolidatedEvidence.normalizedEvidence;

function reviewFor(inputs, changes = {}) {
  return {
    schemaVersion: '2A.1.0', sourceDigest: normalizeSources(inputs).normalized.sourceDigest,
    reviewStatus: 'proposed', reviewer: 'Synthetic reviewer', revision: 'Synthetic revision',
    candidates: [], relationships: [], episodeCandidates: [], reviewQuestions: [], identityReviewGroups: [], ...changes,
  };
}
function candidate(id, changes = {}) {
  return {
    id, type: 'capability', label: `Invented candidate ${id}`, meaning: 'A provisional synthetic interpretation.',
    supportingProjectIds: [], supportingSignalIds: [], observationIds: [], evidenceRefs: [], reasons: ['Synthetic basis only.'],
    confidence: 'low', confirmationStatus: 'unconfirmed', alternativeInterpretations: ['The source may describe a one-off act.'],
    contradictions: ['No independent confirmation.'], reviewQuestions: ['Does this interpretation fit the source context?'], ...changes,
  };
}
function referenceFor(inputs, relativePath, pointer) {
  const source = normalizeSources(inputs).normalized.sources.find((item) => item.relativePath === relativePath);
  assert.ok(source);
  return { sourceId: source.id, pointer };
}
function episode(id, projectId, changes = {}) {
  return {
    id, projectId, occurrenceIds: [], evidenceRefs: [], summary: 'Proposed invented episode boundary.',
    claimBasis: 'Source reports; unverified.', limitations: ['Synthetic only.'], outcomeStatus: 'unresolved',
    independenceStatus: 'unresolved', rationale: 'A proposed boundary needs contextual review.', ...changes,
  };
}

async function workspace(t) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'mosaic-phase2-synthetic-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const initialized = spawnSync('git', ['init', '--quiet', directory], { encoding: 'utf8' });
  assert.equal(initialized.status, 0, initialized.stderr);
  await writeFile(join(directory, '.gitignore'), '.private-evidence/\n_interview_raw_extracts/\n');
  return directory;
}

function visit(value, callback, path = '$') {
  if (value && typeof value === 'object') {
    callback(value, path);
    for (const [key, child] of Object.entries(value)) visit(child, callback, `${path}.${key}`);
  }
}

function assertPendingPublication(value) {
  let found = 0;
  visit(value, (item) => {
    if (Object.hasOwn(item, 'publicationApproval')) {
      assert.deepEqual(item.publicationApproval, { status: 'pending' });
      found++;
    }
  });
  assert.ok(found >= 5, 'all private logical artifacts retain pending publication');
  assert.equal(normalized(value).publicationRecords, null);
}

test('Phase 2A is deterministic across import order and preserves lossless normalized sources', () => {
  const inputs = fixtureInputs();
  const first = artifacts(inputs);
  assert.equal(canonicalJson(first), canonicalJson(artifacts([...inputs].reverse())));
  assert.deepEqual(normalized(first), normalizeSources(inputs).normalized);
  for (const input of inputs) {
    const record = normalized(first).sources.find((item) => item.relativePath === input.relativePath);
    assert.equal(record.rawText, input.bytes);
    assert.equal(record.sha256, sha256(input.bytes));
    assert.deepEqual(record.payload, JSON.parse(input.bytes));
  }
  assertPendingPublication(first);
  assertConsolidationIntegrity(first);
});

test('exact duplicates retain every source pointer without adding independent source signals', () => {
  const inputs = fixtureInputs();
  const before = artifacts(inputs);
  const duplicate = { ...inputs[0], relativePath: 'duplicates/alpha-copy.json' };
  const after = artifacts([...inputs, duplicate]);
  const beforeOccurrence = normalized(before).experiences.find((item) => item.id === 'synthetic-a').occurrences[0];
  const afterOccurrence = normalized(after).experiences.find((item) => item.id === 'synthetic-a').occurrences[0];
  assert.equal(afterOccurrence.id, beforeOccurrence.id);
  assert.equal(afterOccurrence.sourceRefs.length, 2);
  assert.deepEqual(new Set(afterOccurrence.sourceRefs.map((item) => item.pointer)), new Set(['/projects/0']));
  assert.equal(normalized(after).signalCandidates.length, normalized(before).signalCandidates.length);
  assert.deepEqual(normalized(after).signalCandidates.map((item) => item.id), normalized(before).signalCandidates.map((item) => item.id));
  assertConsolidationIntegrity(after);
});

test('nonidentical same-ID records and different-ID related projects remain separate source records', () => {
  const inputs = fixtureInputs();
  const original = JSON.parse(inputs[0].bytes).projects[0];
  const changed = source('alpha-retelling.json', [{ ...original, summary: 'Different invented retelling; its disagreement must survive.' }]);
  const related = source('related.json', [{ ...original, id: 'synthetic-related' }]);
  const result = artifacts([...inputs, changed, related]);
  const sameIdentity = normalized(result).experiences.find((item) => item.id === 'synthetic-a');
  assert.equal(sameIdentity.occurrences.length, 2);
  assert.equal(new Set(sameIdentity.occurrences.map((item) => item.id)).size, 2);
  assert.deepEqual(new Set(sameIdentity.occurrences.map((item) => item.record.summary)), new Set([canary, 'Different invented retelling; its disagreement must survive.']));
  assert.equal(normalized(result).experiences.length, 3);
  assert.ok(normalized(result).experiences.some((item) => item.id === 'synthetic-related'));
  assertPendingPublication(result);
  assertConsolidationIntegrity(result);
});

test('unknown dates, role, status and confidence, confirmation and source approval remain source facts', () => {
  const input = source('unknowns.json', [project('synthetic-unknown', {
    status: 'unresolved',
    confidentiality: { level: 'public', publicUseApproved: true, notes: [] },
    provisionalSignals: [{ type: 'Unresolved category', label: 'Unknown signal', interpretation: canary, evidence: canary, confidence: 'unknown', confirmedByUser: true }],
  })]);
  const result = artifacts([input]);
  const record = normalized(result).experiences[0].occurrences[0].record;
  assert.deepEqual(record.period, { start: null, end: null, label: 'Unknown' });
  assert.equal(record.context.roleAtTime, null);
  assert.equal(record.status, 'unresolved');
  assert.equal(record.confidentiality.publicUseApproved, true);
  assert.equal(normalized(result).signalCandidates[0].signal.confidence, 'unknown');
  assert.equal(normalized(result).signalCandidates[0].signal.confirmedByUser, true);
  assertPendingPublication(result);
});

test('object-shaped classification suggestions, observations, notes and empty projects remain lossless', () => {
  const observation = { label: 'Synthetic observation', interpretation: canary, supportingProjectIds: ['synthetic-a'], confidence: 'low', confirmedByUser: false };
  const input = source('envelope.json', [project('synthetic-a', { provisionalSignals: [] })], { crossProjectObservations: [observation], suggestedClassificationTypes: ['Unresolved vocabulary', observation], exportNotes: [canary, 'Second invented note'] });
  const result = artifacts([input, source('empty.json', [], { suggestedClassificationTypes: [], exportNotes: [] })]);
  assert.deepEqual(normalized(result).sources.find((item) => item.relativePath === 'envelope.json').payload, JSON.parse(input.bytes));
  assert.equal(normalized(result).crossProjectObservations.length, 1);
  assert.equal(normalized(result).unresolvedClassificationSuggestions.length, 2);
  assert.deepEqual(normalized(result).unresolvedClassificationSuggestions.find((item) => typeof item.value === 'object').value, observation);
  assertConsolidationIntegrity(result);
});

test('regeneration rejects source, ownership, missing/duplicated coverage and extra artifact fields', () => {
  const original = artifacts();
  const sourceChange = structuredClone(original);
  normalized(sourceChange).sources[0].rawText += ' ';
  assert.throws(() => assertConsolidationIntegrity(sourceChange));
  const parentChange = structuredClone(original);
  normalized(parentChange).signalCandidates[0].experienceId = normalized(parentChange).signalCandidates[1].experienceId;
  assert.throws(() => assertConsolidationIntegrity(parentChange));
  for (const key of Object.keys(phase2ArtifactSchemas)) {
    const changed = structuredClone(original);
    changed[key].unreviewedField = canary;
    assert.throws(() => assertConsolidationIntegrity(changed), `extra ${key} field`);
  }
});

test('coverage omissions and duplicate accounting rows cannot be accepted by pointer-only validation', () => {
  const original = artifacts();
  const findLedger = (value) => {
    if (Array.isArray(value) && value.length && typeof value[0] === 'object') return value;
    if (value && typeof value === 'object') {
      for (const child of Object.values(value)) { const found = findLedger(child); if (found) return found; }
    }
    return null;
  };
  const missing = structuredClone(original);
  const missingLedger = findLedger(missing.sourceCoverage);
  assert.ok(missingLedger, 'coverage includes occurrence-level accounting rows');
  missingLedger.pop();
  assert.throws(() => assertConsolidationIntegrity(missing));
  const duplicated = structuredClone(original);
  const duplicatedLedger = findLedger(duplicated.sourceCoverage);
  duplicatedLedger.push(structuredClone(duplicatedLedger[0]));
  assert.throws(() => assertConsolidationIntegrity(duplicated));
});

test('private artifacts are never accepted as public data and consolidation cannot approve projection', async () => {
  const result = artifacts();
  for (const key of Object.keys(phase2ArtifactSchemas)) assert.ok(validatePublicMosaicData(result[key]).length);
  const { normalized: approved, publicData } = await generateSyntheticArtifacts();
  const manifest = JSON.parse(await readFile(join(repositoryRoot, 'fixtures/synthetic/publication-manifest.json'), 'utf8'));
  assert.throws(() => projectPublicData(normalized(result), manifest));
  assert.equal(approved.publicationRecords.profile.approval.status, 'approved');
  assert.equal(serialize(publicData), await readFile(join(repositoryRoot, 'public/data/mosaic.json'), 'utf8'));
  assert.equal(serialize(publicData).includes(canary), false);
});

test('executable Phase 2 schemas enforce numeric and null types, bounds, exact keys and anyOf', () => {
  const integer = { type: 'integer', minimum: 0 };
  for (const value of ['1', -1, 1.5, null, true, NaN, Infinity]) assert.ok(validatePhase2Value(value, integer).length, String(value));
  for (const value of [0, 1, 10]) assert.deepEqual(validatePhase2Value(value, integer), []);
  assert.ok(validatePhase2Value('private', { type: 'null' }).length);
  assert.deepEqual(validatePhase2Value(null, { type: 'null' }), []);
  const shape = { type: 'object', properties: { note: { anyOf: [{ type: 'null' }, { type: 'string', minLength: 1 }] } }, required: ['note'], additionalProperties: false };
  assert.deepEqual(validatePhase2Value({ note: null }, shape), []);
  assert.deepEqual(validatePhase2Value({ note: 'Unknown' }, shape), []);
  for (const value of [{}, { note: 2 }, { note: '' }, { note: null, unexpected: canary }]) assert.ok(validatePhase2Value(value, shape).length);
  assert.ok(validatePhase2Value({}, editorialReviewSchema).length);
});

test('private reader includes nested JSON, accounts for ancillary bytes and is deterministic', async (t) => {
  const directory = await workspace(t);
  const input = join(directory, '_interview_raw_extracts');
  await mkdir(join(input, 'nested'), { recursive: true });
  for (const item of fixtureInputs()) await writeFile(join(input, item.relativePath), item.bytes);
  await writeFile(join(input, 'notes.bin'), canary);
  const first = await loadPrivateSources(input);
  assert.deepEqual(await loadPrivateSources(input), first);
  assert.deepEqual(first.inputs.map((item) => item.relativePath), ['alpha.json', 'nested/beta.json']);
  assert.equal(first.ancillaryFiles.length, 1);
  assert.ok(!JSON.stringify(first.summary).includes(canary));
  assertConsolidationIntegrity(artifacts(first.inputs, { ancillaryFiles: first.ancillaryFiles }));
});

test('private reader refuses linked inputs and preserves the link target', async (t) => {
  const directory = await workspace(t);
  const input = join(directory, '_interview_raw_extracts');
  await mkdir(input);
  const external = join(directory, 'source.json');
  const bytes = fixtureInputs()[0].bytes;
  await writeFile(external, bytes);
  await symlink(external, join(input, 'linked.json'));
  await assert.rejects(loadPrivateSources(input));
  assert.equal(await readFile(external, 'utf8'), bytes);
});

test('private writer creates only six deterministic ignored files with private permissions', async (t) => {
  const directory = await workspace(t);
  const output = join(directory, '.private-evidence/phase2/synthetic');
  const result = artifacts();
  await writePrivateArtifacts(result, output, { workspaceRoot: directory });
  assert.deepEqual((await readdir(output)).sort(), artifactNames.slice().sort());
  const first = await Promise.all(artifactNames.map((name) => readFile(join(output, name), 'utf8')));
  await writePrivateArtifacts(result, output, { workspaceRoot: directory });
  assert.deepEqual(await Promise.all(artifactNames.map((name) => readFile(join(output, name), 'utf8'))), first);
  for (const path of [join(directory, '.private-evidence'), join(directory, '.private-evidence/phase2'), output]) assert.equal((await lstat(path)).mode & 0o777, 0o700);
  for (const name of artifactNames) {
    assert.equal((await lstat(join(output, name))).mode & 0o777, 0o600);
    const ignored = spawnSync('git', ['check-ignore', '--quiet', join(output, name)], { cwd: directory });
    assert.equal(ignored.status, 0, name);
  }
});

test('private writer rejects public paths, ignored-rule removal, symlink ancestors and hardlink files', async (t) => {
  const directory = await workspace(t);
  const result = artifacts();
  for (const output of [join(directory, 'public/.private-evidence/run'), join(directory, 'dist/.private-evidence/run'), join(directory, 'output')]) await assert.rejects(writePrivateArtifacts(result, output, { workspaceRoot: directory }));
  await writeFile(join(directory, '.gitignore'), '');
  await assert.rejects(writePrivateArtifacts(result, join(directory, '.private-evidence/no-ignore'), { workspaceRoot: directory }));
  await writeFile(join(directory, '.gitignore'), '.private-evidence/\n');
  const target = join(directory, 'public');
  await mkdir(target);
  await mkdir(join(directory, '.private-evidence'), { recursive: true });
  await symlink(target, join(directory, '.private-evidence/redirect'));
  await assert.rejects(writePrivateArtifacts(result, join(directory, '.private-evidence/redirect/run'), { workspaceRoot: directory }));
  assert.deepEqual(await readdir(target), []);
  const hardlinkOutput = join(directory, '.private-evidence/hardlink');
  await mkdir(hardlinkOutput);
  const external = join(target, 'preserved.json');
  await writeFile(external, 'preserved');
  await link(external, join(hardlinkOutput, 'consolidated-evidence.json'));
  await assert.rejects(writePrivateArtifacts(result, hardlinkOutput, { workspaceRoot: directory }));
  assert.equal(await readFile(external, 'utf8'), 'preserved');
});

test('CLI malformed JSON diagnostics never contain private text, filenames, IDs or absolute paths', async (t) => {
  const directory = await workspace(t);
  const input = join(directory, '_interview_raw_extracts');
  await mkdir(input);
  const filename = `${canary}.json`;
  await writeFile(join(input, filename), `{${canary}`);
  const response = spawnSync(process.execPath, [cli, '--input', input, '--output', join(directory, '.private-evidence/phase2')], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.notEqual(response.status, 0);
  assert.ok(response.stderr.trim().length);
  for (const marker of [canary, filename, directory, input]) assert.equal(`${response.stdout}\n${response.stderr}`.includes(marker), false, marker);
  const sanitized = safeConsolidationError(new Error(`${canary} ${directory}`));
  assert.equal(JSON.stringify(sanitized).includes(canary), false);
  assert.equal(JSON.stringify(sanitized).includes(directory), false);
});

test('CLI schema and reference errors are sanitized independently of parser errors', async (t) => {
  const directory = await workspace(t);
  const input = join(directory, '_interview_raw_extracts');
  await mkdir(input);
  const sourcePath = join(input, `${canary}.json`);
  const invalidVersion = JSON.parse(fixtureInputs()[0].bytes);
  invalidVersion.schemaVersion = canary;
  const dangling = JSON.parse(fixtureInputs()[0].bytes);
  dangling.crossProjectObservations = [{ label: canary, interpretation: canary, supportingProjectIds: [canary], confidence: 'low', confirmedByUser: false }];
  for (const value of [invalidVersion, dangling]) {
    await writeFile(sourcePath, serialize(value));
    const response = spawnSync(process.execPath, [cli, '--input', input, '--output', join(directory, '.private-evidence/phase2')], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.notEqual(response.status, 0);
    assert.ok(response.stderr.trim().length);
    for (const marker of [canary, directory]) assert.equal(`${response.stdout}\n${response.stderr}`.includes(marker), false, marker);
  }
});

test('no editorial review leaves taxonomy unresolved while retaining all source interpretations', () => {
  const result = artifacts();
  assert.deepEqual(result.capabilityCandidates.candidates, []);
  assert.deepEqual(result.capabilityCandidates.relationships, []);
  assert.equal(result.capabilityCandidates.unmappedSourceSignalIds.length, 2);
  assert.deepEqual(result.consolidatedEvidence.sourceInterpretations, normalized(result).signalCandidates);
  assert.match(result.consolidationReview, /No editorial taxonomy/);
  assert.equal(result.consolidationDecisions.editorialReview, null);
});

test('leaf coverage is complete and one-to-one, retaining null values and empty collections', () => {
  const inputs = [source('leaves.json', [project('synthetic-leaves', { provisionalSignals: [], tools: [], outcomes: [] })], { suggestedClassificationTypes: [], exportNotes: [] })];
  const result = artifacts(inputs);
  const sourceRecord = normalized(result).sources[0];
  const leafPointers = (value, pointer = '') => {
    if (Array.isArray(value) && value.length) return value.flatMap((item, index) => leafPointers(item, `${pointer}/${index}`));
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) return Object.keys(value).flatMap((key) => leafPointers(value[key], `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`));
    return [{ pointer, value }];
  };
  const expected = leafPointers(JSON.parse(inputs[0].bytes));
  const fields = result.consolidatedEvidence.sourceFields;
  assert.equal(fields.length, expected.length);
  assert.equal(result.sourceCoverage.leafCoverage.length, expected.length);
  assert.equal(result.sourceCoverage.counts.sourceLeafFields, expected.length);
  assert.equal(result.sourceCoverage.counts.uncoveredSourceFields, 0);
  assert.deepEqual(result.sourceCoverage.uncovered, []);
  assert.equal(new Set(fields.map((item) => item.pointer)).size, expected.length);
  for (const leaf of expected) {
    const field = fields.find((item) => item.pointer === leaf.pointer);
    assert.deepEqual(field.sourceValue, leaf.value, leaf.pointer);
    assert.deepEqual(field.sourceRefs, [{ sourceId: sourceRecord.id, sha256: sourceRecord.sha256, pointer: leaf.pointer }]);
    assert.equal(result.sourceCoverage.leafCoverage.filter((item) => item.sourceFieldId === field.id).length, 1);
  }
  assert.ok(fields.some((item) => item.sourceValue === null));
  assert.ok(fields.some((item) => Array.isArray(item.sourceValue) && item.sourceValue.length === 0));
});

test('raw occurrence counts stay separate from canonical records, signals and conservative contexts', () => {
  const inputs = fixtureInputs();
  const duplicate = { ...inputs[0], relativePath: 'duplicate.json' };
  const changed = source('retelling.json', [project('synthetic-a', { summary: 'Different invented account.' })]);
  const collection = [...inputs, duplicate, changed];
  const review = reviewFor(collection, { candidates: [candidate('one-context', { supportingProjectIds: ['synthetic-a'], evidenceRefs: [referenceFor(collection, 'alpha.json', '/projects/0')] })] });
  const result = artifacts(collection, { editorialReview: review });
  assert.equal(result.sourceCoverage.counts.projectOccurrences, 4);
  assert.equal(result.sourceCoverage.counts.originalProjectIds, 2);
  assert.equal(result.sourceCoverage.counts.canonicalProjectRecords, 3);
  assert.equal(result.sourceCoverage.counts.rawSignalOccurrences, 4);
  assert.equal(result.sourceCoverage.counts.canonicalSignals, 3);
  assert.equal(result.consolidatedEvidence.candidateEpisodes.length, 2);
  const counts = result.capabilityCandidates.candidates[0].independence;
  assert.equal(counts.observedContextCount, 1);
  assert.equal(counts.conservativeIndependentContextCount, 1);
  assert.equal(counts.confirmedIndependentEpisodeCount, 0);
  assert.equal(counts.demonstrationCount, 0);
});

test('overlapping same-program groups reduce candidate contexts transitively without identity merges', () => {
  const inputs = [...fixtureInputs(), source('gamma.json', [project('synthetic-c')])];
  const groups = [
    { id: 'ab', label: 'Shared invented program', projectIds: ['synthetic-a', 'synthetic-b'], reason: 'Possible same program.', disposition: 'review-only', independenceRelation: 'same-program' },
    { id: 'bc', label: 'Overlapping invented program', projectIds: ['synthetic-b', 'synthetic-c'], reason: 'Possible same program.', disposition: 'review-only', independenceRelation: 'unresolved' },
  ];
  const review = reviewFor(inputs, { candidates: [candidate('ac-contexts', { supportingProjectIds: ['synthetic-a', 'synthetic-c'], evidenceRefs: [referenceFor(inputs, 'alpha.json', '/projects/0'), referenceFor(inputs, 'gamma.json', '/projects/0')] })], identityReviewGroups: groups });
  const result = artifacts(inputs, { editorialReview: review });
  assert.equal(result.sourceCoverage.independence.observedContextCount, 3);
  assert.equal(result.sourceCoverage.independence.conservativeIndependentContextCount, 1);
  const counts = result.capabilityCandidates.candidates[0].independence;
  assert.equal(counts.observedContextCount, 2);
  assert.equal(counts.conservativeIndependentContextCount, 1);
  assert.deepEqual(counts.contextGroups, [['synthetic-a', 'synthetic-c']]);
  assert.deepEqual(counts.independentContextBounds, { lower: 0, upper: 2 });
  assert.equal(normalized(result).experiences.length, 3);
  assert.deepEqual(result.consolidationDecisions.identityMergesPerformed, []);
  const distinct = structuredClone(review);
  distinct.identityReviewGroups.forEach((group) => { group.independenceRelation = 'distinct-context-proposed'; });
  assert.equal(artifacts(inputs, { editorialReview: distinct }).capabilityCandidates.candidates[0].independence.conservativeIndependentContextCount, 2);
});

test('an explicit candidate field basis does not attach unrelated personal contribution or outcome claims', () => {
  const inputs = fixtureInputs();
  const evidenceRef = referenceFor(inputs, 'alpha.json', '/projects/0/constraints/0');
  const review = reviewFor(inputs, { candidates: [candidate('bounded-support', { supportingProjectIds: ['synthetic-a'], evidenceRefs: [evidenceRef] })] });
  const result = artifacts(inputs, { editorialReview: review });
  const proposed = result.capabilityCandidates.candidates[0];
  assert.deepEqual(proposed.resolvedSourceRefs.map((item) => ({ sourceId: item.sourceId, pointer: item.pointer })), [evidenceRef]);
  const claims = proposed.sourceClaimIds.map((id) => result.consolidatedEvidence.sourceClaims.find((claim) => claim.id === id));
  assert.deepEqual(claims.map((claim) => claim.fieldPath), ['/constraints/0']);
  assert.ok(!claims.some((claim) => claim.fieldPath.startsWith('/myContribution') || claim.fieldPath.startsWith('/outcomes')));
  assert.equal(proposed.independence.observedContextCount, 1);
  assert.equal(proposed.confirmationStatus, 'unconfirmed');
  assertPendingPublication(result);
});

test('editorial episodes retain only their selected retelling and specific claim support', () => {
  const inputs = [fixtureInputs()[0], source('retelling.json', [project('synthetic-a', { myContribution: ['Contradictory invented account.'], outcomes: ['Unrelated outcome.'] })])];
  const evidenceRef = referenceFor(inputs, 'alpha.json', '/projects/0/myContribution/0');
  const review = reviewFor(inputs, { episodeCandidates: [episode('specific-episode', 'synthetic-a', { evidenceRefs: [evidenceRef] })] });
  const result = artifacts(inputs, { editorialReview: review });
  const proposed = result.consolidatedEvidence.candidateEpisodes.find((item) => item.id === 'specific-episode');
  assert.equal(proposed.sourceRefs.length, 1);
  assert.equal(proposed.sourceRefs[0].sourceId, evidenceRef.sourceId);
  const claims = proposed.claimIds.map((id) => result.consolidatedEvidence.sourceClaims.find((item) => item.id === id));
  assert.equal(claims.length, 1);
  assert.equal(claims[0].fieldPath, '/myContribution/0');
  assert.equal(claims[0].sourceValue, canary);
  assert.deepEqual(proposed.sourceSignalIds, []);
  assert.equal(result.sourceCoverage.independence.conservativeIndependentContextCount, 1);
  assert.equal(result.sourceCoverage.independence.confirmedIndependentEpisodeCount, 0);
});

test('source-confirmed low confidence signals never confirm new editorial interpretations', () => {
  const signal = { type: 'Capability', label: 'Original invented label', interpretation: 'Original tentative interpretation.', evidence: canary, confidence: 'low', confirmedByUser: true };
  const inputs = [source('confirmed.json', [project('synthetic-confirmed', { provisionalSignals: [signal] })])];
  const sourceSignal = normalizeSources(inputs).normalized.signalCandidates[0];
  const review = reviewFor(inputs, { candidates: [candidate('new-interpretation', { supportingProjectIds: ['synthetic-confirmed'], supportingSignalIds: [sourceSignal.id] })] });
  const result = artifacts(inputs, { editorialReview: review });
  const proposed = result.capabilityCandidates.candidates[0];
  assert.equal(proposed.confirmationStatus, 'unconfirmed');
  assert.equal(proposed.originalSignals.length, 1);
  assert.deepEqual(proposed.originalSignals[0].signal, signal);
  assert.deepEqual(result.consolidatedEvidence.sourceInterpretations[0].signal, signal);
  assertPendingPublication(result);
  const confirmed = structuredClone(review); confirmed.candidates[0].confirmationStatus = 'confirmed';
  assert.throws(() => artifacts(inputs, { editorialReview: confirmed }));
});

test('a justified new classification type remains a provisional candidate and pattern record', () => {
  const inputs = fixtureInputs();
  const review = reviewFor(inputs, { candidates: [candidate('new-classification', { type: 'coordination-condition', supportingProjectIds: ['synthetic-a'], evidenceRefs: [referenceFor(inputs, 'alpha.json', '/projects/0/constraints/0')] })] });
  const result = artifacts(inputs, { editorialReview: review });
  const proposed = result.capabilityCandidates.candidates[0];
  assert.equal(proposed.type, 'coordination-condition');
  assert.deepEqual(result.crossProjectPatterns.candidateInterpretations.find((item) => item.id === proposed.id), proposed);
  assert.equal(result.crossProjectPatterns.sourceInterpretationStatus, 'source-reported-unverified');
  assert.equal(proposed.confirmationStatus, 'unconfirmed');
  assertPendingPublication(result);
});

test('stale review digests, duplicate editorial IDs, invalid ownership and missing candidate basis fail closed', () => {
  const inputs = fixtureInputs();
  const stale = reviewFor(inputs); stale.sourceDigest = '0'.repeat(64);
  assert.throws(() => artifacts(inputs, { editorialReview: stale }));
  const repeated = reviewFor(inputs, { candidates: [candidate('duplicate', { supportingProjectIds: ['synthetic-a'] }), candidate('duplicate', { supportingProjectIds: ['synthetic-b'] })] });
  assert.throws(() => artifacts(inputs, { editorialReview: repeated }));
  assert.throws(() => artifacts(inputs, { editorialReview: reviewFor(inputs, { candidates: [candidate('no-basis')] }) }));
  const betaSignal = normalizeSources(inputs).normalized.signalCandidates.find((item) => item.experienceId === 'synthetic-b');
  const badSignal = reviewFor(inputs, { candidates: [candidate('wrong-parent', { supportingProjectIds: ['synthetic-a'], supportingSignalIds: [betaSignal.id] })] });
  assert.throws(() => artifacts(inputs, { editorialReview: badSignal }));
  const badRef = reviewFor(inputs, { candidates: [candidate('wrong-ref', { supportingProjectIds: ['synthetic-a'], evidenceRefs: [referenceFor(inputs, 'nested/beta.json', '/projects/0/myContribution/0')] })] });
  assert.throws(() => artifacts(inputs, { editorialReview: badRef }));
  const unsupportedDeclaredContext = reviewFor(inputs, { candidates: [candidate('unsupported-context', { supportingProjectIds: ['synthetic-a', 'synthetic-b'], evidenceRefs: [referenceFor(inputs, 'alpha.json', '/projects/0/myContribution/0')] })] });
  assert.throws(() => artifacts(inputs, { editorialReview: unsupportedDeclaredContext }));
  const betaOccurrence = normalizeSources(inputs).normalized.experiences.find((item) => item.id === 'synthetic-b').occurrences[0];
  const badEpisode = reviewFor(inputs, { episodeCandidates: [episode('wrong-project', 'synthetic-a', { occurrenceIds: [betaOccurrence.id] })] });
  assert.throws(() => artifacts(inputs, { editorialReview: badEpisode }));
});

test('candidate relationships reject missing endpoints and self hierarchies', () => {
  const inputs = fixtureInputs();
  const proposed = [candidate('a', { supportingProjectIds: ['synthetic-a'], evidenceRefs: [referenceFor(inputs, 'alpha.json', '/projects/0')] }), candidate('b', { type: 'subskill', supportingProjectIds: ['synthetic-b'], evidenceRefs: [referenceFor(inputs, 'nested/beta.json', '/projects/0')] })];
  const relationship = { id: 'ab', fromCandidateId: 'a', toCandidateId: 'b', type: 'broader', reason: 'Synthetic relationship requiring review.' };
  const review = reviewFor(inputs, { candidates: proposed, relationships: [relationship] });
  const result = artifacts(inputs, { editorialReview: review });
  assert.deepEqual(result.capabilityCandidates.relationships[0], { ...relationship, publicationApproval: { status: 'pending' } });
  for (const changed of [{ ...relationship, toCandidateId: 'missing' }, { ...relationship, toCandidateId: 'a' }]) {
    assert.throws(() => artifacts(inputs, { editorialReview: { ...review, relationships: [changed] } }));
  }
  const tampered = structuredClone(result);
  tampered.capabilityCandidates.relationships[0].fromCandidateId = 'missing';
  assert.throws(() => assertConsolidationIntegrity(tampered));
});

test('versioned Phase 2A schemas exactly match executable private contracts', async () => {
  for (const schema of [editorialReviewSchema, ...Object.values(phase2ArtifactSchemas)]) {
    assert.match(schema.$id, /^https:\/\/gomercin\.github\.io\/mosaic\/schemas\/[a-z-]+\.v2a\.schema\.json$/u);
    const filename = basename(new URL(schema.$id).pathname);
    const committed = JSON.parse(await readFile(join(repositoryRoot, 'schemas', filename), 'utf8'));
    assert.equal(canonicalJson(committed), canonicalJson(schema), filename);
  }
  const unsupported = artifacts();
  unsupported.consolidatedEvidence.schemaVersion = '2A.2.0';
  assert.throws(() => assertConsolidationIntegrity(unsupported));
  const promoted = artifacts();
  promoted.sourceCoverage.publicationApproval = { status: 'approved', reviewer: 'Unreviewed', revision: 'Unreviewed' };
  assert.throws(() => assertConsolidationIntegrity(promoted));
});

test('successful CLI prints only aggregate fixed-field counts and leaves source bytes unchanged', async (t) => {
  const directory = await workspace(t);
  const input = join(directory, '_interview_raw_extracts');
  await mkdir(input);
  const sourceFilename = `${canary}.json`;
  const original = source(sourceFilename, [project(`${canary}_PROJECT`)]).bytes;
  const path = join(input, sourceFilename);
  await writeFile(path, original);
  const output = join(directory, '.private-evidence/phase2/synthetic-cli');
  const response = spawnSync(process.execPath, [cli, '--input', input, '--output', output], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.equal(response.status, 0, response.stderr);
  assert.equal(response.stderr, '');
  const summary = JSON.parse(response.stdout);
  assert.equal(summary.status, 'complete');
  assert.equal(summary.publicationStatus, 'pending');
  assert.equal(summary.confirmedIndependentEpisodes, 0);
  assert.equal(summary.confirmedDemonstrations, 0);
  assert.equal(summary.counts.interviewJsonSources, 1);
  assert.equal(summary.counts.projectOccurrences, 1);
  for (const marker of [canary, sourceFilename, directory]) assert.equal(response.stdout.includes(marker), false, marker);
  assert.equal(await readFile(path, 'utf8'), original);
  assert.deepEqual((await readdir(output)).sort(), artifactNames.slice().sort());
  const privateEvidence = JSON.parse(await readFile(join(output, 'consolidated-evidence.json'), 'utf8'));
  assert.equal(privateEvidence.normalizedEvidence.sources[0].sha256, sha256(original));
  assert.equal(privateEvidence.normalizedEvidence.sources[0].rawText, original);
});

test('invalid source details stay in an ignored private failure report with safe CLI diagnostics', async (t) => {
  const directory = await workspace(t);
  const input = join(directory, '_interview_raw_extracts');
  await mkdir(input);
  await writeFile(join(input, `${canary}.json`), `{${canary}`);
  const output = join(directory, '.private-evidence/phase2/failure');
  const response = spawnSync(process.execPath, [cli, '--input', input, '--output', output], { cwd: repositoryRoot, encoding: 'utf8' });
  assert.equal(response.status, 1);
  assert.equal(response.stdout, '');
  assert.equal(response.stderr.includes(canary), false);
  const failurePath = join(output, 'failure-report.json');
  const report = JSON.parse(await readFile(failurePath, 'utf8'));
  assert.equal(report.status, 'failed');
  assert.equal(report.category, 'source-invalid');
  assert.equal((await lstat(failurePath)).mode & 0o777, 0o600);
  assert.equal(spawnSync('git', ['check-ignore', '--quiet', failurePath], { cwd: directory }).status, 0);
  assert.deepEqual(await readdir(output), ['failure-report.json']);
});

test('specific candidate support excludes an unrelated same-project editorial episode', () => {
  const inputs = [source('two-interventions.json', [project('synthetic-interventions', { myContribution: ['First invented intervention.', 'Separate invented intervention.'] })])];
  const firstRef = referenceFor(inputs, 'two-interventions.json', '/projects/0/myContribution/0');
  const secondRef = referenceFor(inputs, 'two-interventions.json', '/projects/0/myContribution/1');
  const review = reviewFor(inputs, {
    candidates: [candidate('first-intervention', { supportingProjectIds: ['synthetic-interventions'], evidenceRefs: [firstRef] })],
    episodeCandidates: [episode('first-specific-episode', 'synthetic-interventions', { evidenceRefs: [firstRef] }), episode('unrelated-specific-episode', 'synthetic-interventions', { evidenceRefs: [secondRef] })],
  });
  const result = artifacts(inputs, { editorialReview: review });
  const candidateLinks = result.capabilityCandidates.candidates[0].candidateEpisodeIds;
  assert.ok(candidateLinks.includes('episode-proposed:synthetic-interventions'));
  assert.ok(candidateLinks.includes('first-specific-episode'));
  assert.equal(candidateLinks.includes('unrelated-specific-episode'), false);
  assertConsolidationIntegrity(result);
});
