#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { validatePublicMosaicData } from '../src/data/publicContract.mjs';

const file = process.argv[2] ?? 'public/data/mosaic.json';
try {
  const value = JSON.parse(await readFile(file, 'utf8'));
  const errors = validatePublicMosaicData(value);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Validated ${file}: ${value.experiences.length} projects, ${value.evidenceEpisodes.length} episodes, ${value.evidenceLinks.length} explained links.`);
} catch (error) {
  console.error(`Publication validation failed: ${error.message}`);
  process.exitCode = 1;
}
