"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
exports.seed = seed;
const pool_1 = require("./pool");
async function migrate() {
    console.log('Running bank database migrations...');
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID,
      balance_cents BIGINT NOT NULL DEFAULT 0,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES accounts(id),
      type VARCHAR(6) NOT NULL CHECK (type IN ('credit', 'debit')),
      amount_cents BIGINT NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      reference VARCHAR(255) NOT NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID,
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
    console.log('Bank database migrations completed');
}
async function seed() {
    console.log('Seeding bank database...');
    const client = await (0, pool_1.getClient)();
    try {
        await client.query('BEGIN');
        const result = await client.query('SELECT COUNT(*) FROM accounts WHERE merchant_id IS NULL');
        if (parseInt(result.rows[0].count) === 0) {
            await client.query(`
        INSERT INTO accounts (id, merchant_id, balance_cents, currency)
        VALUES (gen_random_uuid(), NULL, 100000000, 'USD')
      `);
            console.log('Created test bank account with $1,000,000.00 balance');
        }
        await client.query('COMMIT');
        console.log('Bank database seeded');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
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