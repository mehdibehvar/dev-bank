import { query, getClient } from './pool';
import { BankAccount, BankTransaction, generateId } from '@dev-bank/shared';

export async function createAccount(merchantId: string | null, initialBalanceCents: number = 0, currency: string = 'USD'): Promise<BankAccount> {
  const result = await query<BankAccount>(`
    INSERT INTO accounts (id, merchant_id, balance_cents, currency)
    VALUES ($1, $2, $3, $4)
    RETURNING id, merchant_id, balance_cents as balance, currency, created_at as "createdAt", updated_at as "updatedAt"
  `, [generateId(), merchantId, initialBalanceCents, currency]);
  return result.rows[0];
}

export async function getAccountById(id: string): Promise<BankAccount | null> {
  const result = await query<BankAccount>(`
    SELECT id, merchant_id, balance_cents as balance, currency, created_at as "createdAt", updated_at as "updatedAt"
    FROM accounts WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function getAccountByMerchantId(merchantId: string): Promise<BankAccount | null> {
  const result = await query<BankAccount>(`
    SELECT id, merchant_id, balance_cents as balance, currency, created_at as "createdAt", updated_at as "updatedAt"
    FROM accounts WHERE merchant_id = $1
  `, [merchantId]);
  return result.rows[0] || null;
}

export async function updateAccountBalance(accountId: string, amountCents: number): Promise<BankAccount | null> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query<BankAccount>(`
      UPDATE accounts SET balance_cents = balance_cents + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, merchant_id, balance_cents as balance, currency, created_at as "createdAt", updated_at as "updatedAt"
    `, [amountCents, accountId]);
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function createTransaction(
  accountId: string,
  type: 'credit' | 'debit',
  amountCents: number,
  currency: string,
  reference: string
): Promise<BankTransaction> {
  const result = await query<BankTransaction>(`
    INSERT INTO transactions (id, account_id, type, amount_cents, currency, reference)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
  `, [generateId(), accountId, type, amountCents, currency, reference]);
  return result.rows[0];
}

export async function getTransactionById(id: string): Promise<BankTransaction | null> {
  const result = await query<BankTransaction>(`
    SELECT id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
    FROM transactions WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function getTransactionByReference(reference: string): Promise<BankTransaction | null> {
  const result = await query<BankTransaction>(`
    SELECT id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
    FROM transactions WHERE reference = $1
  `, [reference]);
  return result.rows[0] || null;
}

export async function updateTransactionStatus(id: string, status: 'pending' | 'completed' | 'failed'): Promise<BankTransaction | null> {
  const result = await query<BankTransaction>(`
    UPDATE transactions SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
  `, [status, id]);
  return result.rows[0] || null;
}

export async function listTransactions(accountId?: string, status?: string, limit = 50, offset = 0): Promise<BankTransaction[]> {
  let sql = `
    SELECT id, account_id as "accountId", type, amount_cents as amount, currency, reference, status, created_at as "createdAt", updated_at as "updatedAt"
    FROM transactions
  `;
  const params: any[] = [];
  const conditions: string[] = [];

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

  const result = await query<BankTransaction>(sql, params);
  return result.rows;
}

export async function getBankBalance(): Promise<{ balance: number; currency: string }> {
  const result = await query<{ balance_cents: number; currency: string }>(`
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

export async function getReserveAccount(): Promise<{ id: string; balance: number } | null> {
  const result = await query<{ id: string; balance_cents: number }>(`
    SELECT id, balance_cents FROM accounts WHERE merchant_id IS NULL ORDER BY created_at ASC LIMIT 1
  `);
  return result.rows[0] ? { id: result.rows[0].id, balance: result.rows[0].balance_cents } : null;
}

export async function logAudit(merchantId: string | null, action: string, ip: string | null | undefined, userAgent: string | null | undefined, details: Record<string, unknown>): Promise<void> {
  await query(`
    INSERT INTO audit_logs (merchant_id, action, ip_address, user_agent, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [merchantId, action, ip, userAgent, JSON.stringify(details)]);
}