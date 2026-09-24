"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccount = createAccount;
exports.getAccountById = getAccountById;
exports.getAccountByMerchantId = getAccountByMerchantId;
exports.updateAccountBalance = updateAccountBalance;
exports.createTransaction = createTransaction;
exports.getTransactionById = getTransactionById;
exports.getTransactionByReference = getTransactionByReference;
exports.updateTransactionStatus = updateTransactionStatus;
exports.listTransactions = listTransactions;
exports.getBankBalance = getBankBalance;
exports.getReserveAccount = getReserveAccount;
exports.logAudit = logAudit;
const pool_1 = require("./pool");
const shared_1 = require("@dev-bank/shared");
async function createAccount(merchantId, initialBalanceCents = 0, currency = 'USD') {
    const result = await (0, pool_1.query)(`
    INSERT INTO accounts (id, merchant_id, balance_cents, currency)
    VALUES ($1, $2, $3, $4)
    RETURNING id, merchant_id, balance_cents as balance, currency, created_at as "createdAt", updated_at as "updatedAt"
  `, [(0, shared_1.generateId)(), merchantId, initialBalanceCents, currency]);
    return result.rows[0];
}
async function getAccountById(id) {
    const result = await (0, pool_1.query)(`
    SELECT id, merchant_id, balance_cents as balance, currency, created_at as "createdAt", updated_at as "updatedAt"
    FROM accounts WHERE id = $1
  `, [id]);
    return result.rows[0] || null;
}
async function getAccountByMerchantId(merchantId) {
    const result = await (0, pool_1.query)(`
    SELECT id, merchant_id, balance_cents as balance, currency, created_at as "createdAt", updated_at as "updatedAt"
    FROM accounts WHERE merchant_id = $1
  `, [merchantId]);
    return result.rows[0] || null;
}
async function updateAccountBalance(accountId, amountCents) {
    const client = await (0, pool_1.getClient)();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
      UPDATE accounts SET balance_cents = balance_cents + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, merchant_id, balance_cents as balance, currency, created_at as "createdAt", updated_at as "updatedAt"
    `, [amountCents, accountId]);
        await client.query('COMMIT');
        return result.rows[0] || null;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
async function createTransaction(accountId, type, amountCents, currency, reference) {
    const result = await (0, pool_1.query)(`
    INSERT INTO transactions (id, account_id, type, amount_cents, currency, reference)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
  `, [(0, shared_1.generateId)(), accountId, type, amountCents, currency, reference]);
    return result.rows[0];
}
async function getTransactionById(id) {
    const result = await (0, pool_1.query)(`
    SELECT id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
    FROM transactions WHERE id = $1
  `, [id]);
    return result.rows[0] || null;
}
async function getTransactionByReference(reference) {
    const result = await (0, pool_1.query)(`
    SELECT id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
    FROM transactions WHERE reference = $1
  `, [reference]);
    return result.rows[0] || null;
}
async function updateTransactionStatus(id, status) {
    const result = await (0, pool_1.query)(`
    UPDATE transactions SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
  `, [status, id]);
    return result.rows[0] || null;
}
async function listTransactions(accountId, status, limit = 50, offset = 0) {
    let sql = `
    SELECT id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
    FROM transactions
  `;
    const params = [];
    const conditions = [];
    if (accountId) {
        params.push(accountId);
        conditions.push(`account_id = $${params.length}`);
    }
    if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
    }
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    const result = await (0, pool_1.query)(sql, params);
    return result.rows;
}
async function getBankBalance() {
    const result = await (0, pool_1.query)(`
    SELECT SUM(balance_cents) as balance_cents, currency
    FROM accounts WHERE merchant_id IS NULL
    GROUP BY currency
    LIMIT 1
  `);
    if (result.rows[0]) {
        return { balance: result.rows[0].balance_cents, currency: result.rows[0].currency };
    }
    return { balance: 0, currency: 'USD' };
}
async function getReserveAccount() {
    const result = await (0, pool_1.query)(`
    SELECT id, balance_cents FROM accounts WHERE merchant_id IS NULL ORDER BY created_at ASC LIMIT 1
  `);
    return result.rows[0] ? { id: result.rows[0].id, balance: result.rows[0].balance_cents } : null;
}
async function logAudit(merchantId, action, ip, userAgent, details) {
    await (0, pool_1.query)(`
    INSERT INTO audit_logs (merchant_id, action, ip_address, user_agent, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [merchantId, action, ip, userAgent, JSON.stringify(details)]);
}
//# sourceMappingURL=queries.js.map