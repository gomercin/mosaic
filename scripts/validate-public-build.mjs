#!/usr/bin/env node

import { lstat, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePublicMosaicData } from '../src/data/publicContract.mjs';

// A release is deliberately small: application entry, compiled JS/CSS, and one
// explicit public projection. Adding an asset type requires changing this audit.
const ALLOWED_DIRECTORIES = new Set(['assets', 'data']);
const HASHED_ASSET = /^assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|css)$/u;
const REQUIRED_FILES = ['index.html', 'data/mosaic.json'];
const PRIVATE_MARKERS = [
  'PRIVATE_EVIDENCE_CANARY',
  '_interview_raw_extracts',
  '.private-evidence',
];
const PRIVATE_SCHEMA_KEYS = [
  'rawNarrative',
  'privateNotes',
  'profileContext',
  'crossProjectObservations',
  'suggestedClassificationTypes',
  'exportNotes',
  'existingSolutionsOrAlternatives',
  'teamOrExistingContribution',
  'approachAndDecisions',
  'provisionalSignals',
  'supportingProjectIds',
  'rawNotes',
  'publicUseApproved',
  'roleAtTime',
  'careerStage',
];

function isAllowedFile(path) {
  return REQUIRED_FILES.includes(path) || HASHED_ASSET.test(path);
}

function fileError(operation, path, error) {
  return `${operation} ${path}: ${error?.code ?? 'unknown error'}`;
}

/**
 * Fail closed on an unexpected deploy tree or a changed public projection.
 * Marker scans detect declared private paths, schema fields, and fixture canaries;
 * they do not establish that arbitrary prose has been reviewed for confidentiality.
 */
export async function validatePublicBuild({
  distDir = 'dist',
  publicDataFile = 'public/data/mosaic.json',
} = {}) {
  const errors = [];
  const files = new Map();
  const root = resolve(distDir);

  let rootInfo;
  try {
    rootInfo = await lstat(root);
  } catch (error) {
    return [fileError('Cannot inspect', 'deploy root', error)];
  }
  if (rootInfo.isSymbolicLink()) return ['Deploy root must not be a symbolic link'];
  if (!rootInfo.isDirectory()) return ['Deploy root must be a directory'];

  async function visit(directory, prefix = '') {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      errors.push(fileError('Cannot read', prefix || 'deploy root', error));
      return;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = resolve(directory, entry.name);
      let info;
      try {
        info = await lstat(absolutePath);
      } catch (error) {
        errors.push(fileError('Cannot inspect', relativePath, error));
        continue;
      }
      if (info.isSymbolicLink()) {
        errors.push(`Symbolic links are forbidden in the deploy tree: ${relativePath}`);
        continue;
      }
      if (info.isDirectory()) {
        if (!ALLOWED_DIRECTORIES.has(relativePath)) {
          errors.push(`Unexpected deploy directory: ${relativePath}`);
          continue;
        }
        await visit(absolutePath, relativePath);
        continue;
      }
      if (!info.isFile()) {
        errors.push(`Only regular files are allowed in the deploy tree: ${relativePath}`);
        continue;
      }
      if (!isAllowedFile(relativePath)) {
        errors.push(`Unexpected deploy file: ${relativePath}`);
        continue;
      }
      try {
        files.set(relativePath, await readFile(absolutePath));
      } catch (error) {
        errors.push(fileError('Cannot read', relativePath, error));
      }
    }
  }

  await visit(root);
  for (const path of REQUIRED_FILES) {
    if (!files.has(path)) errors.push(`Missing required deploy file: ${path}`);
  }
  if (![...files.keys()].some((path) => HASHED_ASSET.test(path) && path.endsWith('.js'))) {
    errors.push('Deploy tree must contain a compiled, hash-named JavaScript asset');
  }

  function inspectText(path, content) {
    for (const marker of PRIVATE_MARKERS) {
      if (content.includes(marker)) errors.push(`Forbidden private marker in ${path}: ${marker}`);
    }
    for (const key of PRIVATE_SCHEMA_KEYS) {
      const pattern = new RegExp(`(^|[^A-Za-z0-9_])${key}([^A-Za-z0-9_]|$)`, 'u');
      if (pattern.test(content)) errors.push(`Forbidden private schema field in ${path}: ${key}`);
    }
    if (/sourceMappingURL\s*=/u.test(content)) {
      errors.push(`Source map references are forbidden in ${path}`);
    }
    if (path !== 'data/mosaic.json' && /(?:["'\x60]|\s)(?:[^"'\x60\s]*\/)?(?:src|scripts)\/[^"'\x60\s]+\.(?:tsx?|jsx?|mjs)/u.test(content)) {
      errors.push(`Source module references are forbidden in ${path}`);
    }
  }

  for (const [path, bytes] of files) {
    try {
      inspectText(path, new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      errors.push(`Deploy text asset must be valid UTF-8: ${path}`);
    }
  }

  const deployedData = files.get('data/mosaic.json');
  if (deployedData) {
    try {
      const value = JSON.parse(deployedData.toString('utf8'));
      // Normalization also exposes canaries or paths written with JSON escapes.
      inspectText('data/mosaic.json', JSON.stringify(value));
      errors.push(...validatePublicMosaicData(value).map((error) => `Public deploy data: ${error}`));
    } catch (error) {
      errors.push(`Public deploy data must be valid JSON (${error instanceof SyntaxError ? 'parse error' : 'validation error'})`);
    }
    try {
      const generatedData = await readFile(resolve(publicDataFile));
      if (!deployedData.equals(generatedData)) {
        errors.push('Deployed data/mosaic.json differs from the generated public projection');
      }
    } catch (error) {
      errors.push(fileError('Cannot read', 'generated public projection', error));
    }
  }

  return [...new Set(errors)];
}

export async function assertPublicBuild(options) {
  const errors = await validatePublicBuild(options);
  if (errors.length > 0) throw new Error(errors.join('\n'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , distDir = 'dist', publicDataFile = 'public/data/mosaic.json', ...extra] = process.argv;
  if (extra.length > 0) {
    console.error('Usage: node scripts/validate-public-build.mjs [dist-directory] [generated-public-json]');
    process.exitCode = 1;
  } else {
    try {
      await assertPublicBuild({ distDir, publicDataFile });
      console.log('Public deploy audit passed: allowed assets and unchanged public projection.');
    } catch (error) {
      console.error('Public deploy audit failed.');
      console.error(error instanceof Error ? error.message : 'Unknown audit error');
      process.exitCode = 1;
    }
  }
}
