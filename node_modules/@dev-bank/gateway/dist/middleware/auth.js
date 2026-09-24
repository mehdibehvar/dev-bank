"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
exports.requireSecretKey = requireSecretKey;
exports.idempotencyMiddleware = idempotencyMiddleware;
exports.validatePaymentCreate = validatePaymentCreate;
exports.validateWebhookCreate = validateWebhookCreate;
exports.maskSensitiveData = maskSensitiveData;
const queries_1 = require("../db/queries");
async function apiKeyAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            code: 'authentication_required',
            message: 'Missing or invalid Authorization header',
            type: 'authentication_error',
        });
        return;
    }
    const key = authHeader.substring(7);
    const verified = await (0, queries_1.verifyApiKey)(key);
    if (!verified) {
        res.status(401).json({
            code: 'invalid_api_key',
            message: 'Invalid API key',
            type: 'authentication_error',
        });
        return;
    }
    req.merchant = { id: verified.merchantId };
    req.apiKeyType = verified.type;
    next();
}
function requireSecretKey(req, res, next) {
    if (req.apiKeyType !== 'secret') {
        res.status(403).json({
            code: 'forbidden',
            message: 'This endpoint requires a secret API key',
            type: 'authentication_error',
        });
        return;
    }
    next();
}
function idempotencyMiddleware(req, res, next) {
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
        req.idempotencyKey = idempotencyKey;
    }
    next();
}
function validatePaymentCreate(req, res, next) {
    const { amount, currency } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
            code: 'invalid_amount',
            message: 'Amount must be a positive number',
            type: 'invalid_request_error',
            param: 'amount',
        });
        return;
    }
    if (currency && !['USD', 'EUR', 'GBP'].includes(currency)) {
        res.status(400).json({
            code: 'invalid_currency',
            message: 'Currency must be USD, EUR, or GBP',
            type: 'invalid_request_error',
            param: 'currency',
        });
        return;
    }
    next();
}
function validateWebhookCreate(req, res, next) {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
        res.status(400).json({
            code: 'invalid_url',
            message: 'URL is required and must be a string',
            type: 'invalid_request_error',
            param: 'url',
        });
        return;
    }
    try {
        new URL(url);
    }
    catch {
        res.status(400).json({
            code: 'invalid_url',
            message: 'URL must be a valid URL',
            type: 'invalid_request_error',
            param: 'url',
        });
        return;
    }
    next();
}
function maskSensitiveData(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (body && typeof body === 'object') {
            const masked = JSON.parse(JSON.stringify(body), (key, value) => {
                if (typeof value === 'string') {
                    if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password')) {
                        if (value.startsWith('sk_') || value.startsWith('whsec_') || value.startsWith('pk_')) {
                            return value.substring(0, 8) + '...' + value.substring(value.length - 4);
                        }
                    }
                }
                return value;
            });
            return originalJson(masked);
        }
        return originalJson(body);
    };
    next();
}
//# sourceMappingURL=auth.js.map