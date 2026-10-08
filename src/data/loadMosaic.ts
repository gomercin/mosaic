import type { MosaicData } from '../types';
import { fetchPublicDataset } from './loadPublicData.mjs';

const DATA_URL = `${import.meta.env.BASE_URL}data/mosaic.json`;

export async function loadMosaicData(): Promise<MosaicData> {
  // The validated publication model is structurally compatible with the UI.
  // Never fall back to legacy samples when a release artifact is missing or invalid.
  return fetchPublicDataset(DATA_URL);
}
