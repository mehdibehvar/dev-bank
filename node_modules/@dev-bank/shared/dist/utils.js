"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.generateApiKey = generateApiKey;
exports.hashKey = hashKey;
exports.verifyKey = verifyKey;
const node_crypto_1 = require("node:crypto");
const types_1 = require("./types");
function generateId(prefix = '') {
    const randomPart = Array.from((0, node_crypto_1.getRandomValues)(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `${prefix}${randomPart}`;
}
function generateApiKey(type) {
    const prefix = types_1.API_KEY_PREFIXES[type];
    const randomPart = Array.from((0, node_crypto_1.getRandomValues)(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `${prefix}${randomPart}`;
}
function hashKey(key) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(key);
    return hash.digest('hex');
}
function verifyKey(key, hash) {
    return hashKey(key) === hash;
}
//# sourceMappingURL=utils.js.map