import type { MosaicData } from '../types';

const DATA_URL = `${import.meta.env.BASE_URL}data/mosaic.sample.json`;

export async function loadMosaicData(): Promise<MosaicData> {
  const response = await fetch(DATA_URL);

  if (!response.ok) {
    throw new Error(`Could not load Mosaic data from ${DATA_URL}`);
  }

  return response.json() as Promise<MosaicData>;
}
