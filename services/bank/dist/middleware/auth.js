"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankAdminAuth = bankAdminAuth;
exports.validateTransaction = validateTransaction;
exports.validateApproveReject = validateApproveReject;
function bankAdminAuth(req, res, next) {
    const apiKey = req.headers['x-bank-admin-key'];
    const expectedKey = process.env.BANK_ADMIN_API_KEY;
    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
        res.status(401).json({
            code: 'unauthorized',
            message: 'Invalid or missing bank admin API key',
            type: 'authentication_error',
        });
        return;
    }
    req.bankAdmin = true;
    next();
}
function validateTransaction(req, res, next) {
    const { accountId, type, amount, currency, reference } = req.body;
    if (!accountId || !type || !amount || !currency || !reference) {
        res.status(400).json({
            code: 'invalid_request',
            message: 'Missing required fields: accountId, type, amount, currency, reference',
            type: 'invalid_request_error',
        });
        return;
    }
    if (!['credit', 'debit'].includes(type)) {
        res.status(400).json({
            code: 'invalid_type',
            message: 'Type must be "credit" or "debit"',
            type: 'invalid_request_error',
        });
        return;
    }
    if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
            code: 'invalid_amount',
            message: 'Amount must be a positive number',
            type: 'invalid_request_error',
        });
        return;
    }
    next();
}
function validateApproveReject(req, res, next) {
    const { transactionId } = req.body;
    if (!transactionId) {
        res.status(400).json({
            code: 'invalid_request',
            message: 'Missing required field: transactionId',
            type: 'invalid_request_error',
        });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map