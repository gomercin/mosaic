import type { PublicMosaicData } from '../types';
export function fetchPublicDataset(url: string, fetcher?: typeof fetch): Promise<PublicMosaicData>;
