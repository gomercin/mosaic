import { validatePublicMosaicData } from './publicContract.mjs';

export async function fetchPublicDataset(url, fetcher = globalThis.fetch) {
  let response;
  try {
    response = await fetcher(url);
  } catch {
    throw new Error(`Could not fetch Mosaic publication data at ${url}. Check the hosting base path and network.`);
  }
  if (!response.ok) {
    throw new Error(`Could not load Mosaic publication data at ${url} (HTTP ${response.status}). Generate data/mosaic.json before publishing.`);
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error(`Mosaic publication data at ${url} is not valid JSON.`);
  }
  const errors = validatePublicMosaicData(value);
  if (errors.length) {
    throw new Error(`Invalid Mosaic publication data at ${url}: ${errors.slice(0, 8).join('; ')}`);
  }
  return value;
}
