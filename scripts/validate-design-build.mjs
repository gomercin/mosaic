import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('dist-designs');
const errors = [];
const texts = [];
let profileChecked = false;
async function walk(path, prefix = '') {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = prefix + entry.name;
    const absolute = resolve(path, entry.name);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) { errors.push('Unexpected symlink'); continue; }
    if (entry.isDirectory()) {
      if (!['assets', 'data'].includes(name)) errors.push(`Unexpected directory: ${name}`);
      else await walk(absolute, `${name}/`);
    } else {
      if (!(name === 'designs.html' || name === 'data/mosaic.json' || /^assets\/[\w-]+\.(js|css)$/.test(name))) errors.push(`Unexpected output: ${name}`);
      const text = await readFile(absolute, 'utf8');
      texts.push(text);
      for (const marker of ['PRIVATE_EVIDENCE_CANARY', '_interview_raw_extracts', '.private-evidence', 'rawNarrative', 'sourceMappingURL']) if (text.includes(marker)) errors.push(`Forbidden marker in ${name}`);
    }
  }
}
await walk(directory);
try {
  const profile = JSON.parse(await readFile(resolve('.private-evidence/design-examples/profile.json'), 'utf8'));
  profileChecked = true;
  const probes = new Set([profile.name]);
  function collect(value) {
    if (typeof value === 'string' && value.length >= 100) probes.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  }
  collect(profile.cases);
  if ([...probes].some(probe => texts.some(text => text.includes(probe) || text.includes(JSON.stringify(probe).slice(1, -1))))) errors.push('Local profile text found in built assets');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Design build audit passed: allowed sample assets; no private source markers. ${profileChecked ? 'Local profile text scan passed.' : 'Local profile unavailable; profile text scan not run.'}`);
