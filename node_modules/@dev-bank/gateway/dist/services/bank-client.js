"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBankTransaction = createBankTransaction;
exports.getBankTransaction = getBankTransaction;
exports.findOrCreateBankAccount = findOrCreateBankAccount;
exports.sendWebhook = sendWebhook;
exports.processWebhookDeliveries = processWebhookDeliveries;
exports.handleBankWebhook = handleBankWebhook;
exports.generateClientSecret = generateClientSecret;
const axios_1 = __importDefault(require("axios"));
const shared_1 = require("@dev-bank/shared");
const queries = __importStar(require("../db/queries"));
const BANK_API_URL = process.env.GATEWAY_BANK_URL || 'http://localhost:3001';
const BANK_API_KEY = process.env.GATEWAY_BANK_API_KEY || 'sk_bank_admin_test_1234567890';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
async function createBankTransaction(accountId, type, amount, currency, reference) {
    try {
        const response = await axios_1.default.post(`${BANK_API_URL}/api/v1/transactions`, {
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
    }
    catch (err) {
        console.error('Create bank transaction error:', err);
        return null;
    }
}
async function getBankTransaction(id) {
    try {
        const response = await axios_1.default.get(`${BANK_API_URL}/api/v1/transactions/${id}`, {
            headers: { 'X-Bank-Admin-Key': BANK_API_KEY },
            timeout: 5000,
        });
        return response.data;
    }
    catch (err) {
        console.error('Get bank transaction error:', err);
        return null;
    }
}
async function findOrCreateBankAccount(merchantId) {
    try {
        const response = await axios_1.default.get(`${BANK_API_URL}/api/v1/accounts/find-or-create/${merchantId}`, {
            headers: { 'X-Bank-Admin-Key': BANK_API_KEY },
            timeout: 5000,
        });
        return response.data;
    }
    catch (err) {
        console.error('Find or create bank account error:', err);
        return null;
    }
}
async function sendWebhook(delivery) {
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
        await axios_1.default.post(delivery.url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': header,
                'X-Webhook-Timestamp': timestamp,
                'User-Agent': 'dev-bank-webhooks/1.0',
            },
            timeout: 10000,
        });
        return true;
    }
    catch (err) {
        console.error('Webhook delivery failed:', err);
        return false;
    }
}
async function generateWebhookSignature(payload, secretHash) {
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secretHash);
    hmac.update(payload);
    return hmac.digest('hex');
}
async function processWebhookDeliveries() {
    const deliveries = await queries.getPendingWebhookDeliveries(50);
    for (const delivery of deliveries) {
        const success = await sendWebhook(delivery);
        await queries.updateWebhookDeliveryStatus(delivery.id, success ? 'delivered' : 'failed');
    }
}
async function handleBankWebhook(transactionId, status) {
    const payment = await getPaymentByBankTransactionId(transactionId);
    if (!payment) {
        console.warn('No payment found for bank transaction:', transactionId);
        return;
    }
    if (status === 'completed') {
        await queries.updatePaymentStatus(payment.id, 'succeeded', transactionId);
        await sendPaymentWebhook(payment, 'payment.succeeded');
    }
    else {
        await queries.updatePaymentStatus(payment.id, 'failed', transactionId);
        await sendPaymentWebhook(payment, 'payment.failed');
    }
}
async function getPaymentByBankTransactionId(bankTransactionId) {
    const result = await queries.query(`
    SELECT id, merchant_id as "merchantId", amount_cents as amount, currency, status, idempotency_key as "idempotencyKey", metadata, client_secret as "clientSecret", created_at as "createdAt", updated_at as "updatedAt"
    FROM payments WHERE bank_transaction_id = $1
  `, [bankTransactionId]);
    return result.rows[0] || null;
}
async function sendPaymentWebhook(payment, eventType) {
    const endpoints = await queries.query(`
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
function generateClientSecret() {
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `pi_${randomPart}_secret_${(0, shared_1.generateId)().substring(0, 24)}`;
}
//# sourceMappingURL=bank-client.js.map