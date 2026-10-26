#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const envelopeKeys = ['schemaVersion', 'profileContext', 'projects', 'crossProjectObservations', 'suggestedClassificationTypes', 'exportNotes'];
const projectKeys = ['id', 'title', 'period', 'context', 'confidentiality', 'status', 'summary', 'motivation', 'problem', 'existingSolutionsOrAlternatives', 'constraints', 'myContribution', 'teamOrExistingContribution', 'approachAndDecisions', 'differentiators', 'outcomes', 'lessons', 'tools', 'provisionalSignals', 'tags', 'openQuestions', 'rawNotes'];
const nestedKeys = {
  period: ['start', 'end', 'label'],
  context: ['type', 'organization', 'roleAtTime', 'careerStage', 'collaboration'],
  confidentiality: ['level', 'publicUseApproved', 'notes'],
};
const signalKeys = ['type', 'label', 'interpretation', 'evidence', 'confidence', 'confirmedByUser'];
const observationKeys = ['label', 'interpretation', 'supportingProjectIds', 'confidence', 'confirmedByUser'];
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const typeOf = (value) => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
const increment = (counts, key, amount = 1) => { counts[key] = (counts[key] ?? 0) + amount; };
const sortedObject = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')));
const pointerKey = (key) => key.replaceAll('~', '~0').replaceAll('/', '~1');

// Object key order does not make two interview records distinct. Arrays retain order.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (record(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

async function listFiles(root, prefix = '') {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(root, name));
    else files.push(name);
  }
  return files;
}

function collectShape(value, path, shapes, references, file, pointer = '') {
  increment(shapes[path] ??= {}, typeOf(value));
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectShape(item, `${path}[]`, shapes, references, file, `${pointer}/${index}`));
  } else if (record(value)) {
    for (const key of Object.keys(value).sort()) {
      const childPointer = `${pointer}/${pointerKey(key)}`;
      if (key === 'supportingProjectIds' && Array.isArray(value[key])) {
        value[key].forEach((id, index) => references.push({ file, pointer: `${childPointer}/${index}`, id, validType: typeof id === 'string' && id.trim().length > 0 }));
      }
      collectShape(value[key], `${path}.${key}`, shapes, references, file, childPointer);
    }
  }
}

function checkKeys(value, expectedKeys, pointer, missingKeys) {
  if (!record(value)) {
    missingKeys.push({ pointer, reason: 'expected-object', actualType: typeOf(value) });
    return;
  }
  expectedKeys.forEach((key) => {
    if (!Object.hasOwn(value, key)) missingKeys.push({ pointer: `${pointer}/${pointerKey(key)}`, reason: 'missing-key' });
  });
}

function groupsBy(items, key) {
  const groups = new Map();
  items.forEach((item) => {
    const groupKey = item[key];
    if (typeof groupKey !== 'string') return;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(item);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'));
}

/** This returns sensitive metadata. Only summary is suitable for a public report. */
export async function inventoryInterviews(inputDirectory) {
  const root = resolve(inputDirectory);
  const files = [];
  const projects = [];
  const references = [];
  const shapes = {};
  const missingKeys = [];
  const versions = {};
  const statuses = new Set();
  const counts = {
    crossProjectObservations: 0, suggestedClassificationEntries: 0, exportNotes: 0, provisionalSignals: 0,
    sourceConfirmedProvisionalSignals: 0, sourceUnconfirmedProvisionalSignals: 0, invalidSignalConfirmationOccurrences: 0,
    sourceConfirmedCrossProjectObservations: 0, sourceUnconfirmedCrossProjectObservations: 0, invalidObservationConfirmationOccurrences: 0,
  };
  const classifications = {};
  for (const name of await listFiles(root)) {
    const path = join(root, name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      files.push({ file: name, kind: stat.isSymbolicLink() ? 'symlink' : 'other', parsed: false });
      continue;
    }
    const bytes = await readFile(path);
    const item = { file: name, kind: name.toLowerCase().endsWith('.json') ? 'json' : 'ancillary', bytes: bytes.length, sha256: sha256(bytes), parsed: false };
    files.push(item);
    if (item.kind !== 'json') continue;
    let value;
    try {
      value = JSON.parse(bytes.toString('utf8'));
    } catch {
      // Parser messages can contain private source fragments; keep only the category.
      item.error = 'invalid-json';
      continue;
    }
    item.parsed = true;
    item.schemaVersion = record(value) && typeof value.schemaVersion === 'string' ? value.schemaVersion : null;
    // Unexpected versions may contain source prose; only known schema labels are public.
    increment(versions, item.schemaVersion === '0.2' ? '0.2' : item.schemaVersion === null ? '(missing)' : '(unsupported)');
    collectShape(value, '$', shapes, references, name);
    const fileMissing = [];
    checkKeys(value, envelopeKeys, '', fileMissing);
    item.projectCount = Array.isArray(value?.projects) ? value.projects.length : 0;
    if (Array.isArray(value?.projects)) value.projects.forEach((project, index) => {
      const pointer = `/projects/${index}`;
      checkKeys(project, projectKeys, pointer, fileMissing);
      if (!record(project)) {
        projects.push({ file: name, pointer, id: null, canonicalSha256: sha256(canonicalJson(project)), confidentiality: null, invalidProjectType: typeOf(project) });
        return;
      }
      if (typeof project.status === 'string') statuses.add(project.status);
      Object.entries(nestedKeys).forEach(([key, keys]) => checkKeys(project[key], keys, `${pointer}/${key}`, fileMissing));
      if (Array.isArray(project.provisionalSignals)) {
        counts.provisionalSignals += project.provisionalSignals.length;
        project.provisionalSignals.forEach((signal, signalIndex) => {
          checkKeys(signal, signalKeys, `${pointer}/provisionalSignals/${signalIndex}`, fileMissing);
          const key = signal?.confirmedByUser === true ? 'sourceConfirmedProvisionalSignals' : signal?.confirmedByUser === false ? 'sourceUnconfirmedProvisionalSignals' : 'invalidSignalConfirmationOccurrences';
          counts[key]++;
        });
      }
      const confidentiality = record(project.confidentiality) ? {
        level: project.confidentiality.level ?? null,
        publicUseApproved: project.confidentiality.publicUseApproved ?? null,
        noteCount: Array.isArray(project.confidentiality.notes) ? project.confidentiality.notes.length : null,
      } : null;
      projects.push({ file: name, pointer, id: typeof project.id === 'string' && project.id.trim().length > 0 ? project.id : null, canonicalSha256: sha256(canonicalJson(project)), confidentiality });
    });
    if (Array.isArray(value?.crossProjectObservations)) {
      counts.crossProjectObservations += value.crossProjectObservations.length;
      value.crossProjectObservations.forEach((observation, index) => {
        checkKeys(observation, observationKeys, `/crossProjectObservations/${index}`, fileMissing);
        const key = observation?.confirmedByUser === true ? 'sourceConfirmedCrossProjectObservations' : observation?.confirmedByUser === false ? 'sourceUnconfirmedCrossProjectObservations' : 'invalidObservationConfirmationOccurrences';
        counts[key]++;
      });
    }
    if (Array.isArray(value?.suggestedClassificationTypes)) {
      counts.suggestedClassificationEntries += value.suggestedClassificationTypes.length;
      value.suggestedClassificationTypes.forEach((entry) => increment(classifications, typeOf(entry)));
    }
    if (Array.isArray(value?.exportNotes)) counts.exportNotes += value.exportNotes.length;
    missingKeys.push(...fileMissing.map((missing) => ({ file: name, ...missing })));
    item.missingKeyCount = fileMissing.length;
  }
  const idGroups = groupsBy(projects, 'id');
  const canonicalGroups = groupsBy(projects, 'canonicalSha256');
  const duplicateFiles = groupsBy(files, 'sha256').filter(([, occurrences]) => occurrences.length > 1).map(([hash, occurrences]) => ({ sha256: hash, files: occurrences.map(({ file, kind }) => ({ file, kind })) }));
  const duplicateProjects = canonicalGroups.filter(([, occurrences]) => occurrences.length > 1).map(([hash, occurrences]) => ({ canonicalSha256: hash, occurrences }));
  const duplicateIds = idGroups.filter(([, occurrences]) => occurrences.length > 1).map(([id, occurrences]) => ({ id, conflictingRecords: new Set(occurrences.map((item) => item.canonicalSha256)).size > 1, occurrences }));
  const ids = new Set(idGroups.map(([id]) => id));
  references.forEach((reference) => { reference.dangling = reference.validType && !ids.has(reference.id); });
  const typeDifferences = Object.entries(shapes).filter(([, types]) => Object.keys(types).length > 1).map(([path, types]) => ({ path, types: sortedObject(types) })).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const jsonFiles = files.filter((file) => file.kind === 'json');
  const summary = {
    totalFiles: files.length,
    jsonFiles: jsonFiles.length,
    ancillaryFiles: files.filter((file) => file.kind === 'ancillary').length,
    skippedLinksOrOtherEntries: files.filter((file) => !['json', 'ancillary'].includes(file.kind)).length,
    parsedJsonFiles: jsonFiles.filter((file) => file.parsed).length,
    jsonParseErrors: jsonFiles.filter((file) => !file.parsed).length,
    schemaVersions: sortedObject(versions),
    projectOccurrences: projects.length,
    distinctProjectIds: ids.size,
    distinctCanonicalProjectRecords: canonicalGroups.length,
    distinctSourceStatusValues: statuses.size,
    byteDuplicateGroups: duplicateFiles.length,
    byteDuplicateOccurrences: duplicateFiles.reduce((sum, group) => sum + group.files.length - 1, 0),
    canonicalProjectDuplicateGroups: duplicateProjects.length,
    canonicalProjectDuplicateOccurrences: duplicateProjects.reduce((sum, group) => sum + group.occurrences.length - 1, 0),
    duplicateProjectIdGroups: duplicateIds.length,
    conflictingProjectIdGroups: duplicateIds.filter((group) => group.conflictingRecords).length,
    missingKeyFindings: missingKeys.length,
    missingOrInvalidProjectIds: projects.filter((project) => !project.id).length,
    confidentialityApprovedOccurrences: projects.filter((project) => project.confidentiality?.publicUseApproved === true).length,
    confidentialityUnapprovedOccurrences: projects.filter((project) => project.confidentiality?.publicUseApproved === false).length,
    confidentialityMissingOrInvalidApprovalOccurrences: projects.filter((project) => typeof project.confidentiality?.publicUseApproved !== 'boolean').length,
    confidentialityNotesPresentOccurrences: projects.filter((project) => project.confidentiality?.noteCount > 0).length,
    supportingProjectReferenceOccurrences: references.length,
    danglingReferenceOccurrences: references.filter((reference) => reference.dangling).length,
    distinctDanglingProjectIds: new Set(references.filter((reference) => reference.dangling).map((reference) => reference.id)).size,
    invalidReferenceOccurrences: references.filter((reference) => !reference.validType).length,
    typeDifferencePaths: typeDifferences.length,
    classificationEntryTypes: sortedObject(classifications),
    ...counts,
  };
  return {
    inventoryVersion: '1.0',
    privacy: 'LOCAL ONLY: source filenames, project IDs, hashes and confidentiality flags identify private evidence. Commit only the aggregate summary after review.',
    summary,
    files,
    projects,
    duplicateFiles,
    duplicateProjects,
    duplicateIds,
    missingKeys,
    schemaShapes: sortedObject(Object.fromEntries(Object.entries(shapes).map(([path, types]) => [path, sortedObject(types)]))),
    typeDifferences,
    projectReferences: references,
  };
}

export async function writePrivateInventory(report, outputPath) {
  const output = resolve(outputPath);
  const parts = output.split(sep);
  const privateIndex = parts.indexOf('.private-evidence');
  if (privateIndex === -1 || privateIndex === parts.length - 1) throw new Error('Detailed inventory output must be inside a .private-evidence directory.');
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  // Refuse a private directory or output symlink that redirects into public assets.
  for (let index = privateIndex; index < parts.length; index++) {
    const path = parts.slice(0, index + 1).join(sep) || sep;
    try {
      if ((await lstat(path)).isSymbolicLink()) throw new Error('Private inventory paths cannot contain symbolic links.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const temporary = `${output}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = { input: '_interview_raw_extracts', output: '.private-evidence/interview-inventory.json' };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/u, '');
    if (!Object.hasOwn(options, key) || !args[index + 1]) throw new Error('Usage: node scripts/inventory-interviews.mjs [--input DIRECTORY] [--output .private-evidence/FILE.json]');
    options[key] = args[index + 1];
  }
  const report = await inventoryInterviews(options.input);
  await writePrivateInventory(report, options.output);
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.jsonParseErrors > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('Inventory failed. Check the input directory and private output location; no source content is printed.');
    process.exitCode = 1;
  });
}
