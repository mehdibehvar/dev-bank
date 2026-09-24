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
const gateway_client_1 = require("../services/gateway-client");
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'bank', mode: 'TEST MODE' });
});
router.get('/balance', auth_1.bankAdminAuth, async (req, res) => {
    try {
        const balance = await queries.getBankBalance();
        res.json({ balance: balance.balance, currency: balance.currency });
    }
    catch (err) {
        console.error('Get balance error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.post('/accounts', auth_1.bankAdminAuth, async (req, res) => {
    try {
        const { merchantId, initialBalance, currency } = req.body;
        const account = await queries.createAccount(merchantId || null, initialBalance || 0, currency || 'USD');
        res.status(201).json(account);
    }
    catch (err) {
        console.error('Create account error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/accounts/merchant/:merchantId', auth_1.bankAdminAuth, async (req, res) => {
    try {
        const account = await queries.getAccountByMerchantId(req.params.merchantId);
        if (!account) {
            res.status(404).json({ code: 'not_found', message: 'Account not found for merchant', type: 'invalid_request_error' });
            return;
        }
        res.json(account);
    }
    catch (err) {
        console.error('Get account by merchant error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/accounts/:id', auth_1.bankAdminAuth, async (req, res) => {
    try {
        const account = await queries.getAccountById(req.params.id);
        if (!account) {
            res.status(404).json({ code: 'not_found', message: 'Account not found', type: 'invalid_request_error' });
            return;
        }
        res.json(account);
    }
    catch (err) {
        console.error('Get account error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/accounts/find-or-create/:merchantId', auth_1.bankAdminAuth, async (req, res) => {
    try {
        let account = await queries.getAccountByMerchantId(req.params.merchantId);
        if (!account) {
            account = await queries.createAccount(req.params.merchantId, 100000000, 'USD');
        }
        res.json(account);
    }
    catch (err) {
        console.error('Find or create account error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.post('/transactions', auth_1.validateTransaction, async (req, res) => {
    try {
        const { accountId, type, amount, currency, reference } = req.body;
        const transaction = await queries.createTransaction(accountId, type, amount, currency, reference);
        res.status(201).json(transaction);
    }
    catch (err) {
        console.error('Create transaction error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/transactions', auth_1.bankAdminAuth, async (req, res) => {
    try {
        const { accountId, status, limit, offset } = req.query;
        const transactions = await queries.listTransactions(accountId, status, parseInt(limit) || 50, parseInt(offset) || 0);
        res.json({ data: transactions });
    }
    catch (err) {
        console.error('List transactions error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/transactions/:id', async (req, res) => {
    try {
        const transaction = await queries.getTransactionById(req.params.id);
        if (!transaction) {
            res.status(404).json({ code: 'not_found', message: 'Transaction not found', type: 'invalid_request_error' });
            return;
        }
        res.json(transaction);
    }
    catch (err) {
        console.error('Get transaction error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.get('/transactions/reference/:reference', async (req, res) => {
    try {
        const transaction = await queries.getTransactionByReference(req.params.reference);
        if (!transaction) {
            res.status(404).json({ code: 'not_found', message: 'Transaction not found', type: 'invalid_request_error' });
            return;
        }
        res.json(transaction);
    }
    catch (err) {
        console.error('Get transaction by reference error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.post('/transactions/:id/approve', auth_1.bankAdminAuth, auth_1.validateApproveReject, async (req, res) => {
    try {
        const { transactionId } = req.body;
        const transaction = await queries.getTransactionById(transactionId);
        if (!transaction) {
            res.status(404).json({ code: 'not_found', message: 'Transaction not found', type: 'invalid_request_error' });
            return;
        }
        if (transaction.status !== 'pending') {
            res.status(400).json({ code: 'invalid_status', message: 'Transaction is not pending', type: 'invalid_request_error' });
            return;
        }
        const updatedTransaction = await queries.updateTransactionStatus(transactionId, 'completed');
        if (updatedTransaction) {
            await queries.updateAccountBalance(updatedTransaction.accountId, updatedTransaction.type === 'credit' ? updatedTransaction.amount : -updatedTransaction.amount);
            if (updatedTransaction.type === 'credit') {
                const reserveAccount = await queries.getReserveAccount();
                if (reserveAccount) {
                    await queries.updateAccountBalance(reserveAccount.id, -updatedTransaction.amount);
                }
            }
        }
        await queries.logAudit(null, 'transaction.approved', req.ip || null, req.get('user-agent') || null, { transactionId });
        await (0, gateway_client_1.notifyGatewayTransactionUpdate)(transactionId, 'completed');
        res.json(updatedTransaction);
    }
    catch (err) {
        console.error('Approve transaction error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
router.post('/transactions/:id/reject', auth_1.bankAdminAuth, auth_1.validateApproveReject, async (req, res) => {
    try {
        const { transactionId } = req.body;
        const transaction = await queries.getTransactionById(transactionId);
        if (!transaction) {
            res.status(404).json({ code: 'not_found', message: 'Transaction not found', type: 'invalid_request_error' });
            return;
        }
        if (transaction.status !== 'pending') {
            res.status(400).json({ code: 'invalid_status', message: 'Transaction is not pending', type: 'invalid_request_error' });
            return;
        }
        const updatedTransaction = await queries.updateTransactionStatus(transactionId, 'failed');
        await queries.logAudit(null, 'transaction.rejected', req.ip || null, req.get('user-agent') || null, { transactionId });
        await (0, gateway_client_1.notifyGatewayTransactionUpdate)(transactionId, 'failed');
        res.json(updatedTransaction);
    }
    catch (err) {
        console.error('Reject transaction error:', err);
        res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
    }
});
exports.default = router;
//# sourceMappingURL=bank.js.map