import { query, getClient } from './pool';
import { Merchant, ApiKey, WebhookEndpoint, Payment, WebhookDelivery, ApiKeyType, generateId, generateApiKey, hashKey, verifyKey } from '@dev-bank/shared';

export async function createMerchant(name: string, email: string): Promise<Merchant> {
  const result = await query<Merchant>(`
    INSERT INTO merchants (id, name, email)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, created_at as "createdAt", updated_at as "updatedAt"
  `, [generateId(), name, email]);
  return result.rows[0];
}

export async function getMerchantById(id: string): Promise<Merchant | null> {
  const result = await query<Merchant>(`
    SELECT id, name, email, created_at as "createdAt", updated_at as "updatedAt"
    FROM merchants WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function getMerchantByEmail(email: string): Promise<Merchant | null> {
  const result = await query<Merchant>(`
    SELECT id, name, email, created_at as "createdAt", updated_at as "updatedAt"
    FROM merchants WHERE email = $1
  `, [email]);
  return result.rows[0] || null;
}

export async function listMerchants(limit = 50, offset = 0): Promise<Merchant[]> {
  const result = await query<Merchant>(`
    SELECT id, name, email, created_at as "createdAt", updated_at as "updatedAt"
    FROM merchants ORDER BY created_at DESC LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return result.rows;
}

export async function createApiKey(merchantId: string, type: 'publishable' | 'secret'): Promise<{ key: string; apiKey: ApiKey }> {
  const key = generateApiKey(type);
  const keyHash = hashKey(key);
  const prefix = type === 'publishable' ? 'pk_test_' : 'sk_test_';

  const result = await query<ApiKey>(`
    INSERT INTO api_keys (id, merchant_id, type, key_prefix, key_hash)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, merchant_id as "merchantId", type, key_prefix as "keyPrefix", key_hash as "keyHash", created_at as "createdAt", revoked_at as "revokedAt"
  `, [generateId(), merchantId, type, prefix, keyHash]);

  return { key, apiKey: result.rows[0] };
}

export async function getApiKeyByPrefix(prefix: string): Promise<ApiKey | null> {
  const result = await query<ApiKey>(`
    SELECT id, merchant_id as "merchantId", type, key_prefix as "keyPrefix", key_hash as "keyHash", created_at as "createdAt", revoked_at as "revokedAt"
    FROM api_keys WHERE key_prefix = $1 AND revoked_at IS NULL
  `, [prefix]);
  return result.rows[0] || null;
}

export async function listApiKeys(merchantId: string): Promise<ApiKey[]> {
  const result = await query<ApiKey>(`
    SELECT id, merchant_id as "merchantId", type, key_prefix as "keyPrefix", key_hash as "keyHash", created_at as "createdAt", revoked_at as "revokedAt"
    FROM api_keys WHERE merchant_id = $1 AND revoked_at IS NULL
    ORDER BY created_at DESC
  `, [merchantId]);
  return result.rows;
}

export async function revokeApiKey(merchantId: string, keyId: string): Promise<boolean> {
  const result = await query(`
    UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND merchant_id = $2
  `, [keyId, merchantId]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function verifyApiKey(key: string): Promise<{ merchantId: string; type: ApiKeyType } | null> {
  let prefix: string | null = null;
  if (key.startsWith('sk_test_')) prefix = 'sk_test_';
  else if (key.startsWith('pk_test_')) prefix = 'pk_test_';
  else if (key.startsWith('whsec_')) prefix = 'whsec_';
  else return null;

  const keyHash = hashKey(key);
  const result = await query<ApiKey>(`
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

export { query, getClient } from './pool';

export async function createWebhookEndpoint(merchantId: string, url: string): Promise<{ secret: string; endpoint: WebhookEndpoint }> {
  const secret = generateApiKey('webhook');
  const secretHash = hashKey(secret);
  const prefix = 'whsec_';

  const result = await query<WebhookEndpoint>(`
    INSERT INTO webhook_endpoints (id, merchant_id, url, secret_hash, secret_prefix)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, merchant_id as "merchantId", url, secret_hash as "secretHash", secret_prefix as "secretPrefix", created_at as "createdAt"
  `, [generateId(), merchantId, url, secretHash, prefix]);

  return { secret, endpoint: result.rows[0] };
}

export async function listWebhookEndpoints(merchantId: string): Promise<WebhookEndpoint[]> {
  const result = await query<WebhookEndpoint>(`
    SELECT id, merchant_id as "merchantId", url, secret_hash as "secretHash", secret_prefix as "secretPrefix", created_at as "createdAt"
    FROM webhook_endpoints WHERE merchant_id = $1
    ORDER BY created_at DESC
  `, [merchantId]);
  return result.rows;
}

export async function createPayment(
  merchantId: string,
  amount: number,
  currency: string,
  idempotencyKey: string | null,
  metadata: Record<string, unknown>,
  clientSecret: string
): Promise<Payment> {
  const result = await query<Payment>(`
    INSERT INTO payments (id, merchant_id, amount_cents, currency, status, idempotency_key, metadata, client_secret)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
  `, [generateId(), merchantId, amount, currency, 'pending', idempotencyKey, JSON.stringify(metadata), clientSecret]);
  return result.rows[0];
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const result = await query<Payment>(`
    SELECT id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
    FROM payments WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function getPaymentByIdempotencyKey(merchantId: string, idempotencyKey: string): Promise<Payment | null> {
  const result = await query<Payment>(`
    SELECT id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
    FROM payments WHERE merchant_id = $1 AND idempotency_key = $2
  `, [merchantId, idempotencyKey]);
  return result.rows[0] || null;
}

export async function updatePaymentStatus(id: string, status: 'pending' | 'succeeded' | 'failed' | 'cancelled', bankTransactionId?: string): Promise<Payment | null> {
  const updates: string[] = ['status = $1', 'updated_at = NOW()'];
  const params: any[] = [status, id];

  if (bankTransactionId) {
    params.push(bankTransactionId);
    updates.push(`bank_transaction_id = $${params.length}`);
  }

  const result = await query<Payment>(`
    UPDATE payments SET ${updates.join(', ')}
    WHERE id = $${params.length - (bankTransactionId ? 1 : 0)}
    RETURNING id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
  `, params);
  return result.rows[0] || null;
}

export async function listPayments(merchantId: string, status?: string, limit = 50, offset = 0): Promise<Payment[]> {
  let sql = `
    SELECT id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
    FROM payments WHERE merchant_id = $1
  `;
  const params: any[] = [merchantId];

  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await query<Payment>(sql, params);
  return result.rows;
}

export async function createWebhookDelivery(
  endpointId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<WebhookDelivery> {
  const result = await query<WebhookDelivery>(`
    INSERT INTO webhook_deliveries (id, endpoint_id, event_type, payload)
    VALUES ($1, $2, $3, $4)
    RETURNING id, endpoint_id as "endpointId", event_type as "eventType", payload, status, attempts, last_attempt_at as "lastAttemptAt", next_retry_at as "nextRetryAt", created_at as "createdAt"
  `, [generateId(), endpointId, eventType, JSON.stringify(payload)]);
  return result.rows[0];
}

export async function getPendingWebhookDeliveries(limit = 100): Promise<WebhookDelivery[]> {
  const result = await query<WebhookDelivery>(`
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

export async function updateWebhookDeliveryStatus(
  id: string,
  status: 'delivered' | 'failed',
  attempt = true
): Promise<void> {
  if (status === 'delivered') {
    await query(`
      UPDATE webhook_deliveries SET status = $1, last_attempt_at = NOW()
      WHERE id = $2
    `, [status, id]);
  } else {
    await query(`
      UPDATE webhook_deliveries SET status = $1, attempts = attempts + 1, last_attempt_at = NOW(),
        next_retry_at = NOW() + INTERVAL '1 minute' * POWER(2, attempts)
      WHERE id = $2
    `, [status, id]);
  }
}

export async function logAudit(merchantId: string | null, action: string, ip: string | null | undefined, userAgent: string | null | undefined, details: Record<string, unknown>): Promise<void> {
  await query(`
    INSERT INTO audit_logs (merchant_id, action, ip_address, user_agent, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [merchantId, action, ip, userAgent, JSON.stringify(details)]);
}

export async function checkIdempotencyKey(key: string): Promise<Record<string, unknown> | null> {
  const keyHash = hashKey(key);
  const result = await query<{ response: Record<string, unknown> }>(`
    SELECT response FROM idempotency_keys WHERE key_hash = $1 AND expires_at > NOW()
  `, [keyHash]);
  return result.rows[0]?.response || null;
}

export async function storeIdempotencyKey(key: string, merchantId: string, response: Record<string, unknown>, ttlHours = 24): Promise<void> {
  const keyHash = hashKey(key);
  await query(`
    INSERT INTO idempotency_keys (key_hash, merchant_id, response, expires_at)
    VALUES ($1, $2, $3, NOW() + INTERVAL '${ttlHours} hours')
    ON CONFLICT (key_hash) DO NOTHING
  `, [keyHash, merchantId, JSON.stringify(response)]);
}