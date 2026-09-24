"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = exports.query = void 0;
exports.createMerchant = createMerchant;
exports.getMerchantById = getMerchantById;
exports.getMerchantByEmail = getMerchantByEmail;
exports.listMerchants = listMerchants;
exports.createApiKey = createApiKey;
exports.getApiKeyByPrefix = getApiKeyByPrefix;
exports.listApiKeys = listApiKeys;
exports.revokeApiKey = revokeApiKey;
exports.verifyApiKey = verifyApiKey;
exports.createWebhookEndpoint = createWebhookEndpoint;
exports.listWebhookEndpoints = listWebhookEndpoints;
exports.createPayment = createPayment;
exports.getPaymentById = getPaymentById;
exports.getPaymentByIdempotencyKey = getPaymentByIdempotencyKey;
exports.updatePaymentStatus = updatePaymentStatus;
exports.listPayments = listPayments;
exports.createWebhookDelivery = createWebhookDelivery;
exports.getPendingWebhookDeliveries = getPendingWebhookDeliveries;
exports.updateWebhookDeliveryStatus = updateWebhookDeliveryStatus;
exports.logAudit = logAudit;
exports.checkIdempotencyKey = checkIdempotencyKey;
exports.storeIdempotencyKey = storeIdempotencyKey;
const pool_1 = require("./pool");
const shared_1 = require("@dev-bank/shared");
async function createMerchant(name, email) {
    const result = await (0, pool_1.query)(`
    INSERT INTO merchants (id, name, email)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, created_at as "createdAt", updated_at as "updatedAt"
  `, [(0, shared_1.generateId)(), name, email]);
    return result.rows[0];
}
async function getMerchantById(id) {
    const result = await (0, pool_1.query)(`
    SELECT id, name, email, created_at as "createdAt", updated_at as "updatedAt"
    FROM merchants WHERE id = $1
  `, [id]);
    return result.rows[0] || null;
}
async function getMerchantByEmail(email) {
    const result = await (0, pool_1.query)(`
    SELECT id, name, email, created_at as "createdAt", updated_at as "updatedAt"
    FROM merchants WHERE email = $1
  `, [email]);
    return result.rows[0] || null;
}
async function listMerchants(limit = 50, offset = 0) {
    const result = await (0, pool_1.query)(`
    SELECT id, name, email, created_at as "createdAt", updated_at as "updatedAt"
    FROM merchants ORDER BY created_at DESC LIMIT $1 OFFSET $2
  `, [limit, offset]);
    return result.rows;
}
async function createApiKey(merchantId, type) {
    const key = (0, shared_1.generateApiKey)(type);
    const keyHash = (0, shared_1.hashKey)(key);
    const prefix = type === 'publishable' ? 'pk_test_' : 'sk_test_';
    const result = await (0, pool_1.query)(`
    INSERT INTO api_keys (id, merchant_id, type, key_prefix, key_hash)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, merchant_id as "merchantId", type, key_prefix as "keyPrefix", key_hash as "keyHash", created_at as "createdAt", revoked_at as "revokedAt"
  `, [(0, shared_1.generateId)(), merchantId, type, prefix, keyHash]);
    return { key, apiKey: result.rows[0] };
}
async function getApiKeyByPrefix(prefix) {
    const result = await (0, pool_1.query)(`
    SELECT id, merchant_id as "merchantId", type, key_prefix as "keyPrefix", key_hash as "keyHash", created_at as "createdAt", revoked_at as "revokedAt"
    FROM api_keys WHERE key_prefix = $1 AND revoked_at IS NULL
  `, [prefix]);
    return result.rows[0] || null;
}
async function listApiKeys(merchantId) {
    const result = await (0, pool_1.query)(`
    SELECT id, merchant_id as "merchantId", type, key_prefix as "keyPrefix", key_hash as "keyHash", created_at as "createdAt", revoked_at as "revokedAt"
    FROM api_keys WHERE merchant_id = $1 AND revoked_at IS NULL
    ORDER BY created_at DESC
  `, [merchantId]);
    return result.rows;
}
async function revokeApiKey(merchantId, keyId) {
    const result = await (0, pool_1.query)(`
    UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND merchant_id = $2
  `, [keyId, merchantId]);
    return result.rowCount !== null && result.rowCount > 0;
}
async function verifyApiKey(key) {
    let prefix = null;
    if (key.startsWith('sk_test_'))
        prefix = 'sk_test_';
    else if (key.startsWith('pk_test_'))
        prefix = 'pk_test_';
    else if (key.startsWith('whsec_'))
        prefix = 'whsec_';
    else
        return null;
    const keyHash = (0, shared_1.hashKey)(key);
    const result = await (0, pool_1.query)(`
    SELECT id, merchant_id as "merchantId", type, key_prefix as "keyPrefix", key_hash as "keyHash", created_at as "createdAt", revoked_at as "revokedAt"
    FROM api_keys
    WHERE key_prefix = $1 AND key_hash = $2 AND revoked_at IS NULL
  `, [prefix, keyHash]);
    const apiKey = result.rows[0];
    if (!apiKey) {
        return null;
    }
    return { merchantId: apiKey.merchantId, type: apiKey.type };
}
var pool_2 = require("./pool");
Object.defineProperty(exports, "query", { enumerable: true, get: function () { return pool_2.query; } });
Object.defineProperty(exports, "getClient", { enumerable: true, get: function () { return pool_2.getClient; } });
async function createWebhookEndpoint(merchantId, url) {
    const secret = (0, shared_1.generateApiKey)('webhook');
    const secretHash = (0, shared_1.hashKey)(secret);
    const prefix = 'whsec_';
    const result = await (0, pool_1.query)(`
    INSERT INTO webhook_endpoints (id, merchant_id, url, secret_hash, secret_prefix)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, merchant_id as "merchantId", url, secret_hash as "secretHash", secret_prefix as "secretPrefix", created_at as "createdAt"
  `, [(0, shared_1.generateId)(), merchantId, url, secretHash, prefix]);
    return { secret, endpoint: result.rows[0] };
}
async function listWebhookEndpoints(merchantId) {
    const result = await (0, pool_1.query)(`
    SELECT id, merchant_id as "merchantId", url, secret_hash as "secretHash", secret_prefix as "secretPrefix", created_at as "createdAt"
    FROM webhook_endpoints WHERE merchant_id = $1
    ORDER BY created_at DESC
  `, [merchantId]);
    return result.rows;
}
async function createPayment(merchantId, amount, currency, idempotencyKey, metadata, clientSecret) {
    const result = await (0, pool_1.query)(`
    INSERT INTO payments (id, merchant_id, amount_cents, currency, status, idempotency_key, metadata, client_secret)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
  `, [(0, shared_1.generateId)(), merchantId, amount, currency, 'pending', idempotencyKey, JSON.stringify(metadata), clientSecret]);
    return result.rows[0];
}
async function getPaymentById(id) {
    const result = await (0, pool_1.query)(`
    SELECT id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
    FROM payments WHERE id = $1
  `, [id]);
    return result.rows[0] || null;
}
async function getPaymentByIdempotencyKey(merchantId, idempotencyKey) {
    const result = await (0, pool_1.query)(`
    SELECT id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
    FROM payments WHERE merchant_id = $1 AND idempotency_key = $2
  `, [merchantId, idempotencyKey]);
    return result.rows[0] || null;
}
async function updatePaymentStatus(id, status, bankTransactionId) {
    const updates = ['status = $1', 'updated_at = NOW()'];
    const params = [status, id];
    if (bankTransactionId) {
        params.push(bankTransactionId);
        updates.push(`bank_transaction_id = $${params.length}`);
    }
    const result = await (0, pool_1.query)(`
    UPDATE payments SET ${updates.join(', ')}
    WHERE id = $${params.length - (bankTransactionId ? 1 : 0)}
    RETURNING id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
  `, params);
    return result.rows[0] || null;
}
async function listPayments(merchantId, status, limit = 50, offset = 0) {
    let sql = `
    SELECT id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
    FROM payments WHERE merchant_id = $1
  `;
    const params = [merchantId];
    if (status) {
        params.push(status);
        sql += ` AND status = $${params.length}`;
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await (0, pool_1.query)(sql, params);
    return result.rows;
}
async function createWebhookDelivery(endpointId, eventType, payload) {
    const result = await (0, pool_1.query)(`
    INSERT INTO webhook_deliveries (id, endpoint_id, event_type, payload)
    VALUES ($1, $2, $3, $4)
    RETURNING id, endpoint_id as "endpointId", event_type as "eventType", payload, status, attempts, last_attempt_at as "lastAttemptAt", next_retry_at as "nextRetryAt", created_at as "createdAt"
  `, [(0, shared_1.generateId)(), endpointId, eventType, JSON.stringify(payload)]);
    return result.rows[0];
}
async function getPendingWebhookDeliveries(limit = 100) {
    const result = await (0, pool_1.query)(`
    SELECT wd.id, wd.endpoint_id as "endpointId", wd.event_type as "eventType", wd.payload, wd.status, wd.attempts, wd.last_attempt_at as "lastAttemptAt", wd.next_retry_at as "nextRetryAt", wd.created_at as "createdAt",
           we.url, we.secret_hash as "secretHash", we.secret_prefix as "secretPrefix"
    FROM webhook_deliveries wd
    JOIN webhook_endpoints we ON wd.endpoint_id = we.id
    WHERE wd.status = 'pending' AND (wd.next_retry_at IS NULL OR wd.next_retry_at <= NOW())
    ORDER BY wd.created_at ASC
    LIMIT $1
  `, [limit]);
    return result.rows;
}
async function updateWebhookDeliveryStatus(id, status, attempt = true) {
    if (status === 'delivered') {
        await (0, pool_1.query)(`
      UPDATE webhook_deliveries SET status = $1, last_attempt_at = NOW()
      WHERE id = $2
    `, [status, id]);
    }
    else {
        await (0, pool_1.query)(`
      UPDATE webhook_deliveries SET status = $1, attempts = attempts + 1, last_attempt_at = NOW(),
        next_retry_at = NOW() + INTERVAL '1 minute' * POWER(2, attempts)
      WHERE id = $2
    `, [status, id]);
    }
}
async function logAudit(merchantId, action, ip, userAgent, details) {
    await (0, pool_1.query)(`
    INSERT INTO audit_logs (merchant_id, action, ip_address, user_agent, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [merchantId, action, ip, userAgent, JSON.stringify(details)]);
}
async function checkIdempotencyKey(key) {
    const keyHash = (0, shared_1.hashKey)(key);
    const result = await (0, pool_1.query)(`
    SELECT response FROM idempotency_keys WHERE key_hash = $1 AND expires_at > NOW()
  `, [keyHash]);
    return result.rows[0]?.response || null;
}
async function storeIdempotencyKey(key, merchantId, response, ttlHours = 24) {
    const keyHash = (0, shared_1.hashKey)(key);
    await (0, pool_1.query)(`
    INSERT INTO idempotency_keys (key_hash, merchant_id, response, expires_at)
    VALUES ($1, $2, $3, NOW() + INTERVAL '${ttlHours} hours')
    ON CONFLICT (key_hash) DO NOTHING
  `, [keyHash, merchantId, JSON.stringify(response)]);
}
//# sourceMappingURL=queries.js.map