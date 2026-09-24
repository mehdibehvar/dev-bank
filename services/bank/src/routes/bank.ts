import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { bankAdminAuth, validateTransaction, validateApproveReject } from '../middleware/auth';
import * as queries from '../db/queries';
import { notifyGatewayTransactionUpdate } from '../services/gateway-client';
import { BankTransactionCreateRequest, BankTransactionApproveRequest, BankTransactionRejectRequest } from '@dev-bank/shared';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'bank', mode: 'TEST MODE' });
});

router.get('/balance', bankAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const balance = await queries.getBankBalance();
    res.json({ balance: balance.balance, currency: balance.currency });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/accounts', bankAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { merchantId, initialBalance, currency } = req.body;
    const account = await queries.createAccount(
      merchantId || null,
      initialBalance || 0,
      currency || 'USD'
    );
    res.status(201).json(account);
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/accounts/merchant/:merchantId', bankAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const account = await queries.getAccountByMerchantId(req.params.merchantId);
    if (!account) {
      res.status(404).json({ code: 'not_found', message: 'Account not found for merchant', type: 'invalid_request_error' });
      return;
    }
    res.json(account);
  } catch (err) {
    console.error('Get account by merchant error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/accounts/:id', bankAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const account = await queries.getAccountById(req.params.id);
    if (!account) {
      res.status(404).json({ code: 'not_found', message: 'Account not found', type: 'invalid_request_error' });
      return;
    }
    res.json(account);
  } catch (err) {
    console.error('Get account error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/accounts/find-or-create/:merchantId', bankAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let account = await queries.getAccountByMerchantId(req.params.merchantId);
    if (!account) {
      account = await queries.createAccount(req.params.merchantId, 100000000, 'USD');
    }
    res.json(account);
  } catch (err) {
    console.error('Find or create account error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/transactions', validateTransaction, async (req: Request, res: Response) => {
  try {
    const { accountId, type, amount, currency, reference } = req.body as BankTransactionCreateRequest;
    const transaction = await queries.createTransaction(accountId, type, amount, currency, reference);
    res.status(201).json(transaction);
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/transactions', bankAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { accountId, status, limit, offset } = req.query;
    const transactions = await queries.listTransactions(
      accountId as string,
      status as string,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json({ data: transactions });
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await queries.getTransactionById(req.params.id);
    if (!transaction) {
      res.status(404).json({ code: 'not_found', message: 'Transaction not found', type: 'invalid_request_error' });
      return;
    }
    res.json(transaction);
  } catch (err) {
    console.error('Get transaction error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/transactions/reference/:reference', async (req: Request, res: Response) => {
  try {
    const transaction = await queries.getTransactionByReference(req.params.reference);
    if (!transaction) {
      res.status(404).json({ code: 'not_found', message: 'Transaction not found', type: 'invalid_request_error' });
      return;
    }
    res.json(transaction);
  } catch (err) {
    console.error('Get transaction by reference error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/transactions/:id/approve', bankAdminAuth, validateApproveReject, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId } = req.body as BankTransactionApproveRequest;
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

    await notifyGatewayTransactionUpdate(transactionId, 'completed');

    res.json(updatedTransaction);
  } catch (err) {
    console.error('Approve transaction error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/transactions/:id/reject', bankAdminAuth, validateApproveReject, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId } = req.body as BankTransactionRejectRequest;
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

    await notifyGatewayTransactionUpdate(transactionId, 'failed');

    res.json(updatedTransaction);
  } catch (err) {
    console.error('Reject transaction error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

export default router;
