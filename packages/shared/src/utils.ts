import { createHash, getRandomValues } from 'node:crypto';
import { API_KEY_PREFIXES, ApiKeyType } from './types';

export function generateId(prefix: string = ''): string {
  const randomPart = Array.from(getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}${randomPart}`;
}

export function generateApiKey(type: ApiKeyType): string {
  const prefix = API_KEY_PREFIXES[type];
  const randomPart = Array.from(getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}${randomPart}`;
}

export function hashKey(key: string): string {
  const hash = createHash('sha256');
  hash.update(key);
  return hash.digest('hex');
}

export function verifyKey(key: string, hash: string): boolean {
  return hashKey(key) === hash;
}