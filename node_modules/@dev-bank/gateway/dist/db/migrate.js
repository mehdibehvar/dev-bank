"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
exports.seed = seed;
const pool_1 = require("./pool");
async function migrate() {
    console.log('Running gateway database migrations...');
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS merchants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('publishable', 'secret')),
      key_prefix VARCHAR(10) NOT NULL,
      key_hash VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    )
  `);
    await (0, pool_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_api_keys_merchant_id ON api_keys(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
    CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_at ON api_keys(revoked_at);
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      secret_hash VARCHAR(64) NOT NULL,
      secret_prefix VARCHAR(10) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_merchant_id ON webhook_endpoints(merchant_id);
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      amount_cents BIGINT NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
      idempotency_key VARCHAR(255) UNIQUE,
      metadata JSONB,
      client_secret VARCHAR(255),
      bank_transaction_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_payments_merchant_id ON payments(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_payments_bank_transaction_id ON payments(bank_transaction_id);
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      payload JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TIMESTAMPTZ,
      next_retry_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at);
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      ip_address INET,
      user_agent TEXT,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_merchant_id ON audit_logs(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key_hash VARCHAR(64) PRIMARY KEY,
      merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      response JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
    await (0, pool_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
  `);
    console.log('Gateway database migrations completed');
}
async function seed() {
    console.log('Seeding gateway database...');
    console.log('Gateway database seeded (no seed data)');
}
if (require.main === module) {
    migrate()
        .then(() => seed())
        .then(() => process.exit(0))
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map