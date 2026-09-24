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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const queries = __importStar(require("../db/queries"));
const bank_client_1 = require("../services/bank-client");
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gateway', mode: 'TEST MODE' });
});
router.post('/merchants', async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            res.status(400).json({ code: 'invalid_request', message: 'Name and email are required', type: 'invalid_request_error' });
            return;
        }
        const existing = await queries.getMerchantByEmail(email);
        if (existing) {
            res.status(409).json({ code: 'email_exists', message: 'Merchant with this email already exists', type: 'invalid_request_error' });
            return;
        }
        const merchant = await queries.createMerchant(name, email);
        const { key: secretKey } = await queries.createApiKey(merchant.id, 'secret');
        const { key: publishableKey } = await queries.createApiKey(merchant.id, 'publishable');
        await queries.logAudit(merchant.id, 'merchant.created', req.ip, req.get('user-agent'), { name, email });
        res.status(201).json({
            ...merchant,
            keys: {
                secret: secretKey,
                publishable: publishableKey,
            },
        });
    }
    catch (err) {
        console.error('Create merchant error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/merchants', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const merchants = await queries.listMerchants(limit, offset);
        res.json({ data: merchants });
    }
    catch (err) {
        console.error('List merchants error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/merchants/:id', async (req, res) => {
    try {
        const merchant = await queries.getMerchantById(req.params.id);
        if (!merchant) {
            res.status(404).json({ code: 'not_found', message: 'Merchant not found', type: 'invalid_request_error' });
            return;
        }
        res.json(merchant);
    }
    catch (err) {
        console.error('Get merchant error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.post('/api-keys', auth_1.apiKeyAuth, auth_1.requireSecretKey, async (req, res) => {
    try {
        const { type } = req.body;
        if (!type || !['publishable', 'secret'].includes(type)) {
            res.status(400).json({ code: 'invalid_type', message: 'Type must be publishable or secret', type: 'invalid_request_error' });
            return;
        }
        const { key, apiKey } = await queries.createApiKey(req.merchant.id, type);
        await queries.logAudit(req.merchant.id, 'api_key.created', req.ip, req.get('user-agent'), { type });
        res.status(201).json({ key, ...apiKey });
    }
    catch (err) {
        console.error('Create API key error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/api-keys', auth_1.apiKeyAuth, auth_1.requireSecretKey, async (req, res) => {
    try {
        const keys = await queries.listApiKeys(req.merchant.id);
        res.json({ data: keys });
    }
    catch (err) {
        console.error('List API keys error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.delete('/api-keys/:id', auth_1.apiKeyAuth, auth_1.requireSecretKey, async (req, res) => {
    try {
        const success = await queries.revokeApiKey(req.merchant.id, req.params.id);
        if (!success) {
            res.status(404).json({ code: 'not_found', message: 'API key not found', type: 'invalid_request_error' });
            return;
        }
        await queries.logAudit(req.merchant.id, 'api_key.revoked', req.ip, req.get('user-agent'), { keyId: req.params.id });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Revoke API key error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.post('/payments', auth_1.apiKeyAuth, auth_1.requireSecretKey, auth_1.idempotencyMiddleware, auth_1.validatePaymentCreate, async (req, res) => {
    try {
        const { amount, currency = 'USD', idempotencyKey, metadata = {}, returnUrl } = req.body;
        const merchantId = req.merchant.id;
        if (idempotencyKey) {
            const existingResponse = await queries.checkIdempotencyKey(idempotencyKey);
            if (existingResponse) {
                res.status(200).json(existingResponse);
                return;
            }
        }
        const existingPayment = idempotencyKey ? await queries.getPaymentByIdempotencyKey(merchantId, idempotencyKey) : null;
        if (existingPayment) {
            res.status(200).json(existingPayment);
            return;
        }
        const clientSecret = (0, bank_client_1.generateClientSecret)();
        const payment = await queries.createPayment(merchantId, amount, currency, idempotencyKey || null, metadata, clientSecret);
        const bankAccount = await (0, bank_client_1.findOrCreateBankAccount)(merchantId);
        let bankTransactionId;
        if (bankAccount) {
            const bankTransaction = await (0, bank_client_1.createBankTransaction)(bankAccount.id, 'credit', amount, currency, payment.id);
            if (bankTransaction) {
                bankTransactionId = bankTransaction.id;
                await queries.updatePaymentStatus(payment.id, 'pending', bankTransactionId);
            }
        }
        await queries.logAudit(merchantId, 'payment.created', req.ip, req.get('user-agent'), { paymentId: payment.id, amount, currency });
        const response = {
            id: payment.id,
            merchantId: payment.merchantId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            clientSecret: payment.clientSecret,
            createdAt: payment.createdAt,
        };
        if (idempotencyKey) {
            await queries.storeIdempotencyKey(idempotencyKey, merchantId, response);
        }
        res.status(201).json(response);
    }
    catch (err) {
        console.error('Create payment error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/payments', auth_1.apiKeyAuth, auth_1.requireSecretKey, async (req, res) => {
    try {
        const { status, limit, offset } = req.query;
        const payments = await queries.listPayments(req.merchant.id, status, parseInt(limit) || 50, parseInt(offset) || 0);
        res.json({ data: payments });
    }
    catch (err) {
        console.error('List payments error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/payments/:id', auth_1.apiKeyAuth, auth_1.requireSecretKey, async (req, res) => {
    try {
        const payment = await queries.getPaymentById(req.params.id);
        if (!payment || payment.merchantId !== req.merchant.id) {
            res.status(404).json({ code: 'not_found', message: 'Payment not found', type: 'invalid_request_error' });
            return;
        }
        res.json(payment);
    }
    catch (err) {
        console.error('Get payment error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.post('/webhooks', auth_1.apiKeyAuth, auth_1.requireSecretKey, auth_1.validateWebhookCreate, async (req, res) => {
    try {
        const { url } = req.body;
        const { secret, endpoint } = await queries.createWebhookEndpoint(req.merchant.id, url);
        await queries.logAudit(req.merchant.id, 'webhook.created', req.ip, req.get('user-agent'), { url });
        res.status(201).json({ secret, ...endpoint });
    }
    catch (err) {
        console.error('Create webhook error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/webhooks', auth_1.apiKeyAuth, auth_1.requireSecretKey, async (req, res) => {
    try {
        const endpoints = await queries.listWebhookEndpoints(req.merchant.id);
        res.json({ data: endpoints });
    }
    catch (err) {
        console.error('List webhooks error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.post('/webhooks/bank', async (req, res) => {
    try {
        const authHeader = req.headers['x-bank-admin-key'];
        if (authHeader !== process.env.GATEWAY_BANK_API_KEY) {
            res.status(401).json({ code: 'unauthorized', message: 'Invalid bank API key', type: 'authentication_error' });
            return;
        }
        const { transactionId, status } = req.body;
        if (!transactionId || !['completed', 'failed'].includes(status)) {
            res.status(400).json({ code: 'invalid_request', message: 'Invalid request', type: 'invalid_request_error' });
            return;
        }
        await (0, bank_client_1.handleBankWebhook)(transactionId, status);
        res.json({ success: true });
    }
    catch (err) {
        console.error('Bank webhook error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
exports.default = router;
//# sourceMappingURL=gateway.js.map