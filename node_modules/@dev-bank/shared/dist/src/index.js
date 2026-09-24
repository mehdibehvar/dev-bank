"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_MODE_INDICATOR = exports.TEST_MODE = exports.API_KEY_PREFIXES = void 0;
exports.generateApiKey = generateApiKey;
exports.generateId = generateId;
exports.hashKey = hashKey;
exports.verifyKey = verifyKey;
exports.API_KEY_PREFIXES = {
    publishable: 'pk_test_',
    secret: 'sk_test_',
    webhook: 'whsec_',
};
function generateApiKey(type) {
    const prefix = exports.API_KEY_PREFIXES[type];
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `${prefix}${randomPart}`;
}
function generateId(prefix = '') {
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `${prefix}${randomPart}`;
}
function hashKey(key) {
    const hash = crypto.createHash('sha256');
    hash.update(key);
    return hash.digest('hex');
}
function verifyKey(key, hash) {
    return hashKey(key) === hash;
}
exports.TEST_MODE = true;
exports.TEST_MODE_INDICATOR = 'TEST MODE';
//# sourceMappingURL=index.js.map