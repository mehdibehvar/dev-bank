import { ApiKeyType } from './types';
export declare function generateId(prefix?: string): string;
export declare function generateApiKey(type: ApiKeyType): string;
export declare function hashKey(key: string): string;
export declare function verifyKey(key: string, hash: string): boolean;
//# sourceMappingURL=utils.d.ts.map