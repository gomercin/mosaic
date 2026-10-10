#!/usr/bin/env node
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyPublicationManifest, normalizeSources, projectPublicData, serialize } from './evidence-pipeline.mjs';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// This explicit inventory never reads the private interview directory or accepts an input-path override.
export const syntheticSourcePaths = ['engineering.json', 'organizational.json', 'research.json'];

export async function generateSyntheticArtifacts() {
  const fixtureDirectory = resolve(repositoryRoot, 'fixtures/synthetic');
  const inputs = await Promise.all(syntheticSourcePaths.map(async (relativePath) => ({ relativePath, bytes: await readFile(resolve(fixtureDirectory, relativePath)) })));
  const manifest = JSON.parse(await readFile(resolve(fixtureDirectory, 'publication-manifest.json'), 'utf8'));
  const { normalized: pending, mergeReport } = normalizeSources(inputs, { datasetKind: 'synthetic' });
  const normalized = applyPublicationManifest(pending, manifest);
  const publicData = projectPublicData(normalized, manifest);
  return { normalized, publicData, mergeReport: { ...mergeReport, publicationStatus: 'approved-synthetic', publicationRevision: manifest.publication.revision,
    publicationRecordCounts: Object.fromEntries(Object.entries(normalized.publicationRecords).map(([name, entries]) => [name, Array.isArray(entries) ? entries.length : 1])),
    independenceBoundary: 'One project-sized episode per original project ID; repeated retellings never add episodes automatically.' } };
}

export async function buildPublicData({ check = false } = {}) {
  const artifacts = await generateSyntheticArtifacts();
  const output = resolve(repositoryRoot, 'public/data/mosaic.json');
  const expected = serialize(artifacts.publicData);
  if (check) {
    let committed;
    try { committed = await readFile(output, 'utf8'); }
    catch (error) { throw new Error(`Public data is missing. Run npm run generate:data. ${error.message}`); }
    if (committed !== expected) throw new Error('Public data is stale or manually edited. Run npm run generate:data and review the diff.');
  } else {
    const privateDirectory = resolve(repositoryRoot, '.private-evidence');
    await mkdir(dirname(output), { recursive: true });
    await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
    await chmod(privateDirectory, 0o700);
    for (const [name, value] of [['normalized.json', artifacts.normalized], ['merge-report.json', artifacts.mergeReport]]) {
      const path = resolve(privateDirectory, name);
      await writeFile(path, serialize(value), { mode: 0o600 });
      await chmod(path, 0o600);
    }
    await writeFile(output, expected);
  }
  return artifacts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check') || args.length > 1) {
    console.error('Usage: node scripts/build-public-data.mjs [--check]');
    process.exitCode = 1;
  } else {
    try {
      const { publicData } = await buildPublicData({ check: args.includes('--check') });
      console.log(`${args.includes('--check') ? 'Checked' : 'Generated'} approved synthetic public data: ${publicData.experiences.length} experiences, ${publicData.evidenceEpisodes.length} episodes, ${publicData.evidenceLinks.length} links.`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}
