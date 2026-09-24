"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.getClient = getClient;
exports.closePool = closePool;
const pg_1 = require("pg");
const config = {
    host: process.env.BANK_DB_HOST || 'localhost',
    port: parseInt(process.env.BANK_DB_PORT || '5432'),
    user: process.env.BANK_DB_USER || 'bank_admin',
    password: process.env.BANK_DB_PASSWORD || 'bank_pass_123',
    database: process.env.BANK_DB_NAME || 'bank_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
exports.pool = new pg_1.Pool(config);
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
async function query(text, params) {
    const start = Date.now();
    const result = await exports.pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
        console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
}
async function getClient() {
    return exports.pool.connect();
}
async function closePool() {
    await exports.pool.end();
}
//# sourceMappingURL=pool.js.map