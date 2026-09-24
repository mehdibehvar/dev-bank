import axios from 'axios';
import { WebhookDelivery, WebhookEventType, generateId } from '@dev-bank/shared';
import * as queries from '../db/queries';
import { hashKey } from '@dev-bank/shared';

const BANK_API_URL = process.env.GATEWAY_BANK_URL || 'http://localhost:3001';
const BANK_API_KEY = process.env.GATEWAY_BANK_API_KEY || 'sk_bank_admin_test_1234567890';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

interface BankTransactionResponse {
  id: string;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  reference: string;
  status: string;
}

export async function createBankTransaction(
  accountId: string,
  type: 'credit' | 'debit',
  amount: number,
  currency: string,
  reference: string
): Promise<BankTransactionResponse | null> {
  try {
    const response = await axios.post(`${BANK_API_URL}/api/v1/transactions`, {
      accountId,
      type,
      amount,
      currency,
      reference,
    }, {
      headers: {
        'X-Bank-Admin-Key': BANK_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    return response.data;
  } catch (err) {
    console.error('Create bank transaction error:', err);
    return null;
  }
}

export async function getBankTransaction(id: string): Promise<BankTransactionResponse | null> {
  try {
    const response = await axios.get(`${BANK_API_URL}/api/v1/transactions/${id}`, {
      headers: { 'X-Bank-Admin-Key': BANK_API_KEY },
      timeout: 5000,
    });
    return response.data;
  } catch (err) {
    console.error('Get bank transaction error:', err);
    return null;
  }
}

export async function findOrCreateBankAccount(merchantId: string): Promise<{ id: string } | null> {
  try {
    const response = await axios.get(`${BANK_API_URL}/api/v1/accounts/find-or-create/${merchantId}`, {
      headers: { 'X-Bank-Admin-Key': BANK_API_KEY },
      timeout: 5000,
    });
    return response.data;
  } catch (err) {
    console.error('Find or create bank account error:', err);
    return null;
  }
}

export async function sendWebhook(delivery: WebhookDelivery & { url: string; secretHash: string; secretPrefix: string }): Promise<boolean> {
  const timestamp = Date.now().toString();
  const payload = JSON.stringify({
    id: delivery.id,
    type: delivery.eventType,
    data: delivery.payload,
    createdAt: delivery.createdAt,
  });

  const signature = await generateWebhookSignature(payload, delivery.secretHash);
  const header = `${timestamp}.${signature}`;

  try {
    await axios.post(delivery.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': header,
        'X-Webhook-Timestamp': timestamp,
        'User-Agent': 'dev-bank-webhooks/1.0',
      },
      timeout: 10000,
    });
    return true;
  } catch (err) {
    console.error('Webhook delivery failed:', err);
    return false;
  }
}

async function generateWebhookSignature(payload: string, secretHash: string): Promise<string> {
  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', secretHash);
  hmac.update(payload);
  return hmac.digest('hex');
}

export async function processWebhookDeliveries(): Promise<void> {
  const deliveries = await queries.getPendingWebhookDeliveries(50);
  
  for (const delivery of deliveries) {
    const success = await sendWebhook(delivery as any);
    await queries.updateWebhookDeliveryStatus(delivery.id, success ? 'delivered' : 'failed');
  }
}

export async function handleBankWebhook(
  transactionId: string,
  status: 'completed' | 'failed'
): Promise<void> {
  const payment = await getPaymentByBankTransactionId(transactionId);
  if (!payment) {
    console.warn('No payment found for bank transaction:', transactionId);
    return;
  }

  if (status === 'completed') {
    await queries.updatePaymentStatus(payment.id, 'succeeded', transactionId);
    await sendPaymentWebhook(payment, 'payment.succeeded');
  } else {
    await queries.updatePaymentStatus(payment.id, 'failed', transactionId);
    await sendPaymentWebhook(payment, 'payment.failed');
  }
}

async function getPaymentByBankTransactionId(bankTransactionId: string): Promise<any> {
  const result = await queries.query<Payment>(`
    SELECT id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
    FROM payments WHERE bank_transaction_id = $1
  `, [bankTransactionId]);
  return result.rows[0] || null;
}

async function sendPaymentWebhook(payment: any, eventType: WebhookEventType): Promise<void> {
  const endpoints = await queries.query<any>(`
    SELECT id, merchant_id as "merchantId", url, secret_hash as "secretHash", secret_prefix as "secretPrefix"
    FROM webhook_endpoints WHERE merchant_id = $1
  `, [payment.merchantId]);

  for (const endpoint of endpoints.rows) {
    const delivery = await queries.createWebhookDelivery(endpoint.id, eventType, {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      metadata: payment.metadata,
    });

    await sendWebhook({ ...delivery, ...endpoint });
  }
}

export function generateClientSecret(): string {
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `pi_${randomPart}_secret_${generateId().substring(0, 24)}`;
}

import { query } from '../db/pool';
import { Payment } from '@dev-bank/shared';