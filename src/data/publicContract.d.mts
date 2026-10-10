import type { PublicMosaicData } from '../types';
export declare const publicContractSchema: Record<string, unknown>;
export declare function validateAgainstSchema(value: unknown, schema: Record<string, unknown>, path?: string): string[];
export declare function validatePublicMosaicData(value: unknown): string[];
export declare function assertPublicMosaicData(value: unknown): PublicMosaicData;
