#!/usr/bin/env node
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, readFile, readdir, rename, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { serialize, sha256 } from './evidence-pipeline.mjs';
import { assertConsolidationIntegrity, consolidateInterviews, PHASE2_VERSION } from './phase2-consolidation.mjs';

const runFile = promisify(execFile);
export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const artifactFileNames = {
  consolidatedEvidence: 'consolidated-evidence.json', capabilityCandidates: 'capability-candidates.json',
  crossProjectPatterns: 'cross-project-patterns.json', consolidationDecisions: 'consolidation-decisions.json',
  sourceCoverage: 'source-coverage.json', consolidationReview: 'consolidation-review.md',
};
function fail(category) { const error = new Error('Private Phase 2A operation refused.'); error.category = category; throw error; }
function unsafeSegments(path) { return path.split(sep).some((part) => ['public', 'dist', 'test-results', 'fixtures', '.git', 'node_modules'].includes(part)); }
async function rejectLinks(path, { existingFile = false } = {}) {
  const absolute = resolve(path);
  const parts = absolute.split(sep);
  for (let index = 1; index < parts.length; index++) {
    const current = parts.slice(0, index + 1).join(sep) || sep;
    let stat;
    try { stat = await lstat(current); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink()) fail('unsafe-path');
    if (index < parts.length - 1 && !stat.isDirectory()) fail('unsafe-path');
    if (index === parts.length - 1 && existingFile && (!stat.isFile() || stat.nlink > 1)) fail('unsafe-path');
  }
}

export async function loadPrivateSources(inputDirectory) {
  const root = resolve(inputDirectory);
  await rejectLinks(root);
  if (!(await lstat(root)).isDirectory()) fail('input-invalid');
  const inputs = [], ancillaryFiles = [];
  const walk = async (prefix = '') => {
    const entries = await readdir(join(root, prefix), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const path = join(root, relativePath);
      await rejectLinks(path);
      const stat = await lstat(path);
      if (stat.isDirectory()) await walk(relativePath);
      else {
        if (!stat.isFile()) fail('input-invalid');
        const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        let bytes;
        try {
          const heldStat = await handle.stat();
          if (!heldStat.isFile() || heldStat.ino !== stat.ino || heldStat.dev !== stat.dev) fail('unsafe-path');
          bytes = await handle.readFile();
        } finally { await handle.close(); }
        if (relativePath.toLowerCase().endsWith('.json')) inputs.push({ relativePath, bytes });
        else ancillaryFiles.push({ relativePath, byteLength: bytes.length, sha256: sha256(bytes) });
      }
    }
  };
  await walk();
  if (!inputs.length) fail('input-invalid');
  return { inputs, ancillaryFiles, summary: { interviewJsonFiles: inputs.length, ancillaryFiles: ancillaryFiles.length, inputFiles: inputs.length + ancillaryFiles.length } };
}

async function privateDestination(outputDirectory, workspaceRoot) {
  const output = resolve(outputDirectory), workspace = resolve(workspaceRoot);
  const privateRoot = join(workspace, '.private-evidence');
  const below = relative(privateRoot, output);
  if (!below || below.startsWith(`..${sep}`) || below === '..' || isAbsolute(below) || unsafeSegments(output)) fail('unsafe-path');
  await rejectLinks(workspace);
  await rejectLinks(output);
  let gitRoot;
  try { gitRoot = (await runFile('git', ['rev-parse', '--show-toplevel'], { cwd: workspace })).stdout.trim(); }
  catch { fail('output-not-ignored'); }
  if (resolve(gitRoot) !== workspace) fail('unsafe-path');
  for (const filename of [...Object.values(artifactFileNames), 'failure-report.json']) {
    const target = join(output, filename);
    await rejectLinks(target, { existingFile: true });
    try { await runFile('git', ['check-ignore', '--quiet', '--', target], { cwd: workspace }); }
    catch { fail('output-not-ignored'); }
  }
  return { output, workspace, privateRoot };
}
async function preparePrivateDirectories(destination) {
  const { output, privateRoot } = destination;
  await rejectLinks(output);
  const parts = relative(privateRoot, output).split(sep);
  let current = privateRoot;
  for (const part of ['', ...parts]) {
    if (part) current = join(current, part);
    await rejectLinks(current);
    try { await mkdir(current, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    await rejectLinks(current);
    if (!(await lstat(current)).isDirectory()) fail('unsafe-path');
    await chmod(current, 0o700);
  }
}
async function writeAtomicPrivate(path, bytes) {
  await rejectLinks(path, { existingFile: true });
  const temporary = join(dirname(path), `.phase2-tmp-${randomUUID()}`);
  const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.chmod(0o600);
    await handle.sync();
  } finally { await handle.close(); }
  try {
    await rejectLinks(path, { existingFile: true });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

export async function writePrivateArtifacts(artifacts, outputDirectory, { workspaceRoot = repositoryRoot } = {}) {
  assertConsolidationIntegrity(artifacts);
  const destination = await privateDestination(outputDirectory, workspaceRoot);
  await preparePrivateDirectories(destination);
  for (const [key, filename] of Object.entries(artifactFileNames)) await writeAtomicPrivate(join(destination.output, filename), key === 'consolidationReview' ? artifacts[key] : serialize(artifacts[key]));
}

export function safeConsolidationError(error) {
  const category = ['unsafe-path', 'output-not-ignored', 'input-invalid'].includes(error?.category) ? error.category : error?.message?.startsWith('Phase 2A source normalization') ? 'source-invalid' : error?.message?.startsWith('Phase 2A editorial') ? 'editorial-invalid' : 'consolidation-failed';
  const messages = {
    'unsafe-path': 'Private consolidation refused an unsafe or linked filesystem path.',
    'output-not-ignored': 'Private consolidation requires an ignored private output directory in a Git workspace.',
    'input-invalid': 'Private consolidation requires an existing interview directory containing JSON sources.',
    'source-invalid': 'Private source parsing, schema or reference validation failed; inspect the private failure report.',
    'editorial-invalid': 'Private editorial source binding or reference validation failed; inspect the private failure report.',
    'consolidation-failed': 'Private consolidation failed; inspect the private inventory and failure report.',
  };
  return { category, message: messages[category] };
}
function outputWorkspace(outputDirectory) {
  const output = resolve(outputDirectory);
  const parts = output.split(sep);
  const index = parts.indexOf('.private-evidence');
  if (index < 1 || parts.lastIndexOf('.private-evidence') !== index) fail('unsafe-path');
  return parts.slice(0, index).join(sep) || sep;
}
async function failureReport(error, outputDirectory, workspaceRoot) {
  const destination = await privateDestination(outputDirectory, workspaceRoot);
  await preparePrivateDirectories(destination);
  // Detailed causes can contain private source fragments. They remain solely in this ignored file.
  const diagnostic = { schemaVersion: PHASE2_VERSION, status: 'failed', ...safeConsolidationError(error), details: { message: error instanceof Error ? error.message : 'Unknown error', cause: error?.cause instanceof Error ? error.cause.message : null } };
  await writeAtomicPrivate(join(destination.output, 'failure-report.json'), serialize(diagnostic));
}

async function main() {
  const options = { input: '_interview_raw_extracts', output: '.private-evidence/phase-2a/v1', review: null };
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]?.replace(/^--/u, '');
    if (!args[index]?.startsWith('--') || !Object.hasOwn(options, name) || !args[index + 1] || args[index + 1].startsWith('--')) fail('input-invalid');
    options[name] = args[index + 1];
  }
  const workspaceRoot = outputWorkspace(options.output);
  try {
    await privateDestination(options.output, workspaceRoot);
    const { inputs, ancillaryFiles } = await loadPrivateSources(options.input);
    let editorialReview = null;
    if (options.review !== null) {
      const reviewPath = resolve(options.review);
      await rejectLinks(reviewPath, { existingFile: true });
      try { editorialReview = JSON.parse(await readFile(reviewPath, 'utf8')); }
      catch (cause) { throw new Error('Phase 2A editorial review could not be parsed.', { cause }); }
    }
    const artifacts = consolidateInterviews(inputs, { editorialReview, ancillaryFiles });
    await writePrivateArtifacts(artifacts, options.output, { workspaceRoot });
    console.log(JSON.stringify({ status: 'complete', publicationStatus: 'pending', counts: artifacts.sourceCoverage.counts, confirmedIndependentEpisodes: 0, confirmedDemonstrations: 0 }, null, 2));
  } catch (error) {
    try { await failureReport(error, options.output, workspaceRoot); } catch { /* Unsafe destinations are never used for diagnostics. */ }
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    const safe = safeConsolidationError(error);
    console.error(`${safe.category}: ${safe.message}`);
    process.exitCode = 1;
  });
}
