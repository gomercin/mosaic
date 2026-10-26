import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { canonicalJson, inventoryInterviews, writePrivateInventory } from './inventory-interviews.mjs';

const canary = 'PRIVATE_EVIDENCE_CANARY';

function project(id, changes = {}) {
  return {
    id, title: 'Synthetic project', period: { start: null, end: null, label: 'Unknown' },
    context: { type: 'Experiment', organization: null, roleAtTime: null, careerStage: 'Synthetic', collaboration: 'Solo' },
    confidentiality: { level: 'private', publicUseApproved: false, notes: [canary] },
    status: 'stopped', summary: canary, motivation: [], problem: [], existingSolutionsOrAlternatives: [],
    constraints: [], myContribution: [], teamOrExistingContribution: [], approachAndDecisions: [],
    differentiators: [], outcomes: [], lessons: [], tools: [], provisionalSignals: [], tags: [],
    openQuestions: [], rawNotes: canary, ...changes,
  };
}

function interview(projects, changes = {}) {
  return {
    schemaVersion: '0.2', profileContext: { education: canary }, projects,
    crossProjectObservations: [], suggestedClassificationTypes: [], exportNotes: [], ...changes,
  };
}

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'mosaic-inventory-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('census retains byte/canonical duplicates, conflicting IDs and ancillary files deterministically', async (t) => {
  const directory = await fixture(t);
  const duplicate = interview([project('synthetic-a')]);
  await writeFile(join(directory, 'a.json'), JSON.stringify(duplicate));
  await writeFile(join(directory, 'b.json'), JSON.stringify(duplicate));
  const reordered = Object.fromEntries(Object.entries(duplicate).reverse());
  await writeFile(join(directory, 'c.json'), JSON.stringify(reordered, null, 2));
  await writeFile(join(directory, 'd.json'), JSON.stringify(interview([project('synthetic-a', { status: 'idea' }), project('synthetic-b', { period: { start: '2026', end: null, label: '2026' } })], {
    crossProjectObservations: [{ label: 'Candidate', interpretation: canary, supportingProjectIds: ['synthetic-b', 'unknown'], confidence: 'low', confirmedByUser: false }],
    suggestedClassificationTypes: ['Capability', { supportingProjectIds: ['synthetic-a'] }],
  })));
  await writeFile(join(directory, 'opaque.docx'), '{Invalid JSON; do not parse}');
  const report = await inventoryInterviews(directory);
  assert.deepEqual(await inventoryInterviews(directory), report);
  assert.equal(report.summary.totalFiles, 5);
  assert.equal(report.summary.ancillaryFiles, 1);
  assert.equal(report.summary.jsonParseErrors, 0);
  assert.equal(report.summary.projectOccurrences, 5);
  assert.equal(report.summary.distinctProjectIds, 2);
  assert.equal(report.summary.distinctCanonicalProjectRecords, 3);
  assert.equal(report.summary.byteDuplicateGroups, 1);
  assert.equal(report.summary.canonicalProjectDuplicateOccurrences, 2);
  assert.equal(report.summary.conflictingProjectIdGroups, 1);
  assert.equal(report.summary.supportingProjectReferenceOccurrences, 3);
  assert.equal(report.summary.danglingReferenceOccurrences, 1);
  assert.deepEqual(report.summary.classificationEntryTypes, { object: 1, string: 1 });
  assert.equal(report.summary.missingKeyFindings, 0);
  assert.ok(report.typeDifferences.some((item) => item.path === '$.projects[].period.start'));
  assert.equal(JSON.stringify(report.summary).includes(canary), false);
  assert.equal(JSON.stringify(report).includes(canary), false);
});

test('missing keys remain distinct from null values; malformed JSON and links are retained', async (t) => {
  const directory = await fixture(t);
  const missing = project('synthetic-missing');
  delete missing.period.start;
  delete missing.rawNotes;
  await writeFile(join(directory, 'missing.json'), JSON.stringify(interview([missing])));
  await writeFile(join(directory, 'broken.json'), `{${canary}`);
  await symlink(join(directory, 'missing.json'), join(directory, 'linked.json'));
  const report = await inventoryInterviews(directory);
  assert.equal(report.summary.jsonParseErrors, 1);
  assert.equal(report.summary.skippedLinksOrOtherEntries, 1);
  assert.deepEqual(report.missingKeys.map((item) => item.pointer).sort(), ['/projects/0/period/start', '/projects/0/rawNotes']);
  assert.equal(JSON.stringify(report).includes(canary), false);
  assert.equal(report.files.find((item) => item.file === 'broken.json').error, 'invalid-json');
});

test('unexpected schema versions do not leak through the public aggregate', async (t) => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'unknown.json'), JSON.stringify(interview([], { schemaVersion: canary })));
  const report = await inventoryInterviews(directory);
  assert.deepEqual(report.summary.schemaVersions, { '(unsupported)': 1 });
  assert.equal(JSON.stringify(report.summary).includes(canary), false);
  assert.equal(report.files[0].schemaVersion, canary);
});

test('invalid project rows and whitespace IDs stay accounted for', async (t) => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'invalid-rows.json'), JSON.stringify(interview([null, project('   ')], {
    crossProjectObservations: [{ label: 'Synthetic', interpretation: 'Unknown', supportingProjectIds: ['   ', 7], confidence: 'low', confirmedByUser: false }],
  })));
  const report = await inventoryInterviews(directory);
  assert.equal(report.summary.projectOccurrences, 2);
  assert.equal(report.summary.distinctProjectIds, 0);
  assert.equal(report.summary.missingOrInvalidProjectIds, 2);
  assert.equal(report.summary.invalidReferenceOccurrences, 2);
  assert.equal(report.projects[0].invalidProjectType, 'null');
});

test('private report writer rejects public paths and redirects, and can replace its own report', async (t) => {
  const directory = await fixture(t);
  const output = join(directory, '.private-evidence', 'inventory.json');
  await assert.rejects(writePrivateInventory({}, join(directory, 'public', 'inventory.json')));
  await writePrivateInventory({ version: 1 }, output);
  await writePrivateInventory({ version: 2 }, output);
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), { version: 2 });
  const publicDirectory = join(directory, 'public');
  await mkdir(publicDirectory);
  await symlink(publicDirectory, join(directory, '.private-evidence', 'redirect'));
  await assert.rejects(writePrivateInventory({}, join(directory, '.private-evidence', 'redirect', 'inventory.json')));
  const external = join(publicDirectory, 'external.json');
  await writeFile(external, 'preserved');
  const linked = join(directory, '.private-evidence', 'linked.json');
  await symlink(external, linked);
  await assert.rejects(writePrivateInventory({}, linked));
  assert.equal(await readFile(external, 'utf8'), 'preserved');
});

test('canonicalization removes object key order only', () => {
  assert.equal(canonicalJson({ b: [1, 2], a: null }), canonicalJson({ a: null, b: [1, 2] }));
  assert.notEqual(canonicalJson({ b: [1, 2] }), canonicalJson({ b: [2, 1] }));
});
