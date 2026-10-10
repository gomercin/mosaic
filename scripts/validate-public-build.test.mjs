import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { validatePublicMosaicData } from '../src/data/publicContract.mjs';
import { assertPublicBuild, validatePublicBuild } from './validate-public-build.mjs';

const executeFile = promisify(execFile);
const auditScript = fileURLToPath(new URL('./validate-public-build.mjs', import.meta.url));
const JS_ASSET = 'assets/index-Abc123_-.js';
const CSS_ASSET = 'assets/index-Abc123_-.css';

function publicFixture() {
  return {
    schemaVersion: '1.0',
    datasetKind: 'synthetic',
    publication: { status: 'approved', reviewer: 'Synthetic fixture reviewer', revision: 'fixture-1' },
    profile: { name: 'Synthetic Person', title: 'Builder', tagline: 'A fixture', summary: 'Synthetic public content.' },
    capabilities: [{ id: 'cap-1', label: 'Design', category: 'Practice', description: 'Synthetic capability.' }],
    principles: [],
    experiences: [{
      id: 'exp-1', title: 'Synthetic project', type: 'prototype',
      period: { start: '2026-01', label: '2026' },
      summary: 'A synthetic demonstration.', publicNarrative: 'Approved synthetic public narrative.',
      challenge: 'A fixture challenge.', approach: 'A fixture approach.', impact: 'A fixture result.',
      strengthenedCapabilities: ['cap-1'], revealedPatterns: [], tools: [], principles: [],
    }],
    evidenceEpisodes: [{
      id: 'ep-1', experienceId: 'exp-1', summary: 'Synthetic episode.',
      myContribution: 'Fixture contribution.', teamContribution: 'None in this fixture.',
      aiContribution: 'None in this fixture.', result: 'Synthetic result.',
      limitation: 'No real project claim.', outcomeStatus: 'delivered',
    }],
    evidenceLinks: [{
      id: 'link-1', capabilityId: 'cap-1', experienceId: 'exp-1', episodeId: 'ep-1',
      explanation: 'Synthetic link explanation.', signalType: 'demonstrated',
      confidence: 'medium', confirmedByUser: true,
    }],
  };
}

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'mosaic-deploy-audit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const distDir = join(root, 'dist');
  const publicDataFile = join(root, 'generated', 'mosaic.json');
  await mkdir(join(distDir, 'assets'), { recursive: true });
  await mkdir(join(distDir, 'data'), { recursive: true });
  await mkdir(join(root, 'generated'), { recursive: true });
  await writeFile(join(distDir, 'index.html'), '<!doctype html><html><script type="module" src="./assets/index-Abc123_-.js"></script></html>');
  await writeFile(join(distDir, JS_ASSET), 'console.log("Synthetic public app");');
  await writeFile(join(distDir, CSS_ASSET), 'body { color: #111; }');
  const fixture = { root, distDir, publicDataFile, data: publicFixture() };
  await writeProjection(fixture);
  return fixture;
}

async function writeProjection(fixture, { deployedOnly = false } = {}) {
  const json = `${JSON.stringify(fixture.data, null, 2)}\n`;
  await writeFile(join(fixture.distDir, 'data/mosaic.json'), json);
  if (!deployedOnly) await writeFile(fixture.publicDataFile, json);
}

async function expectFailure(fixture, pattern) {
  const errors = await validatePublicBuild(fixture);
  assert.ok(errors.some((error) => pattern.test(error)), `Expected ${pattern}; got ${errors.join('; ')}`);
  await assert.rejects(assertPublicBuild(fixture));
}

test('accepts only the compiled application and unchanged, approved public projection', async (t) => {
  const fixture = await setup(t);
  assert.deepEqual(validatePublicMosaicData(fixture.data), []);
  assert.deepEqual(await validatePublicBuild(fixture), []);
  await assertPublicBuild(fixture);
});

for (const [label, mutate, expected] of [
  ['unknown top-level field', (data) => { data.interviewData = {}; }, /interviewData is not allowed/u],
  ['private experience field', (data) => { data.experiences[0].rawNotes = 'Synthetic source only'; }, /rawNotes is not allowed/u],
  ['unknown nested publication field', (data) => { data.publication.sourcePath = 'synthetic'; }, /sourcePath is not allowed/u],
  ['unsupported schema version', (data) => { data.schemaVersion = '0.2'; }, /schemaVersion must equal/u],
  ['unapproved publication', (data) => { data.publication.status = 'draft'; }, /publication.status must equal/u],
  ['dangling evidence relationship', (data) => { data.evidenceLinks[0].episodeId = 'absent'; }, /references unknown evidenceEpisodes/u],
]) {
  test(`rejects public JSON with ${label}`, async (t) => {
    const fixture = await setup(t);
    mutate(fixture.data);
    await writeProjection(fixture);
    await expectFailure(fixture, expected);
  });
}

for (const extraFile of [
  'data/mosaic.sample.json', 'data/extra.json', 'assets/index-Abc123_-.js.map',
  'assets/source.ts', 'assets/source.zip', 'assets/unhashed.js', 'README.md', 'robots.txt',
]) {
  test(`rejects unexpected deploy file ${extraFile}`, async (t) => {
    const fixture = await setup(t);
    await writeFile(join(fixture.distDir, extraFile), 'Synthetic extra content');
    await expectFailure(fixture, /Unexpected deploy file/u);
  });
}

for (const extraDirectory of ['_interview_raw_extracts', '.private-evidence', 'source', 'assets/private']) {
  test(`rejects unexpected deploy directory ${extraDirectory}`, async (t) => {
    const fixture = await setup(t);
    await mkdir(join(fixture.distDir, extraDirectory));
    await expectFailure(fixture, /Unexpected deploy directory/u);
  });
}

for (const marker of ['PRIVATE_EVIDENCE_CANARY', '_interview_raw_extracts', '.private-evidence']) {
  test(`rejects a bundled private marker: ${marker}`, async (t) => {
    const fixture = await setup(t);
    await writeFile(join(fixture.distDir, JS_ASSET), `console.log(${JSON.stringify(marker)});`);
    await expectFailure(fixture, /Forbidden private marker/u);
  });
}

test('rejects the source canary even when JSON escapes hide it in raw bytes', async (t) => {
  const fixture = await setup(t);
  fixture.data.profile.summary = 'PRIVATE_EVIDENCE_CANARY';
  const json = JSON.stringify(fixture.data).replace('PRIVATE_EVIDENCE_CANARY', '\\u0050RIVATE_EVIDENCE_CANARY');
  await writeFile(join(fixture.distDir, 'data/mosaic.json'), json);
  await writeFile(fixture.publicDataFile, json);
  await expectFailure(fixture, /Forbidden private marker/u);
});

for (const key of ['rawNarrative', 'privateNotes', 'profileContext', 'exportNotes', 'rawNotes', 'publicUseApproved']) {
  test(`rejects a bundled interview schema field: ${key}`, async (t) => {
    const fixture = await setup(t);
    await writeFile(join(fixture.distDir, JS_ASSET), `const privateRecord = { ${key}: "synthetic" };`);
    await expectFailure(fixture, /Forbidden private schema field/u);
  });
}

test('rejects public JSON changed after the generated projection', async (t) => {
  const fixture = await setup(t);
  fixture.data.profile.summary = 'Changed but still valid public prose.';
  await writeProjection(fixture, { deployedOnly: true });
  await expectFailure(fixture, /differs from the generated public projection/u);
});

test('rejects malformed public JSON', async (t) => {
  const fixture = await setup(t);
  await writeFile(join(fixture.distDir, 'data/mosaic.json'), '{');
  await expectFailure(fixture, /must be valid JSON/u);
});

for (const asset of [JS_ASSET, CSS_ASSET]) {
  test(`rejects a source map reference in ${asset}`, async (t) => {
    const fixture = await setup(t);
    await writeFile(join(fixture.distDir, asset), '/*# sourceMappingURL=hidden.map */');
    await expectFailure(fixture, /Source map references are forbidden/u);
  });
}

for (const source of ['/src/main.tsx', '../scripts/private-pipeline.mjs']) {
  test(`rejects a source module reference: ${source}`, async (t) => {
    const fixture = await setup(t);
    await writeFile(join(fixture.distDir, JS_ASSET), `import(${JSON.stringify(source)});`);
    await expectFailure(fixture, /Source module references are forbidden/u);
  });
}

test('rejects a binary asset disguised as JavaScript', async (t) => {
  const fixture = await setup(t);
  await writeFile(join(fixture.distDir, JS_ASSET), Buffer.from([0xff, 0xfe, 0x41]));
  await expectFailure(fixture, /must be valid UTF-8/u);
});

test('rejects symlinked public data even when the target is valid', async (t) => {
  const fixture = await setup(t);
  const deployedFile = join(fixture.distDir, 'data/mosaic.json');
  await rm(deployedFile);
  await symlink(fixture.publicDataFile, deployedFile);
  await expectFailure(fixture, /Symbolic links are forbidden/u);
});

test('rejects symlinked deploy directories', async (t) => {
  const fixture = await setup(t);
  await rm(join(fixture.distDir, 'assets'), { recursive: true });
  await symlink(join(fixture.root, 'generated'), join(fixture.distDir, 'assets'), 'dir');
  await expectFailure(fixture, /Symbolic links are forbidden/u);
});

test('rejects a symlinked deploy root', async (t) => {
  const fixture = await setup(t);
  const alias = join(fixture.root, 'dist-alias');
  await symlink(fixture.distDir, alias, 'dir');
  await expectFailure({ ...fixture, distDir: alias }, /Deploy root must not be a symbolic link/u);
});

test('rejects missing deploy files and missing generated public projection', async (t) => {
  const fixture = await setup(t);
  await rm(join(fixture.distDir, 'index.html'));
  await rm(join(fixture.distDir, JS_ASSET));
  await rm(fixture.publicDataFile);
  const errors = await validatePublicBuild(fixture);
  assert.ok(errors.some((error) => error.includes('Missing required deploy file: index.html')));
  assert.ok(errors.some((error) => error.includes('hash-named JavaScript asset')));
  assert.ok(errors.some((error) => error.includes('Cannot read generated public projection')));
});

test('CLI succeeds for an allowed tree and exits nonzero for a canary leak', async (t) => {
  const fixture = await setup(t);
  const result = await executeFile(process.execPath, [auditScript, fixture.distDir, fixture.publicDataFile]);
  assert.match(result.stdout, /Public deploy audit passed/u);
  await writeFile(join(fixture.distDir, JS_ASSET), 'console.log("PRIVATE_EVIDENCE_CANARY");');
  await assert.rejects(executeFile(process.execPath, [auditScript, fixture.distDir, fixture.publicDataFile]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Forbidden private marker/u);
    return true;
  });
});
