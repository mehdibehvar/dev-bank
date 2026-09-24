import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { apiKeyAuth, requireSecretKey, idempotencyMiddleware, validatePaymentCreate, validateWebhookCreate, maskSensitiveData } from '../middleware/auth';
import * as queries from '../db/queries';
import { generateClientSecret, createBankTransaction, findOrCreateBankAccount, handleBankWebhook } from '../services/bank-client';
import { PaymentCreateRequest } from '@dev-bank/shared';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'gateway', mode: 'TEST MODE' });
});

router.post('/merchants', async (req: Request, res: Response) => {
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
  } catch (err) {
    console.error('Create merchant error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/merchants', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const merchants = await queries.listMerchants(limit, offset);
    res.json({ data: merchants });
  } catch (err) {
    console.error('List merchants error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/merchants/:id', async (req: Request, res: Response) => {
  try {
    const merchant = await queries.getMerchantById(req.params.id);
    if (!merchant) {
      res.status(404).json({ code: 'not_found', message: 'Merchant not found', type: 'invalid_request_error' });
      return;
    }
    res.json(merchant);
  } catch (err) {
    console.error('Get merchant error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/api-keys', apiKeyAuth, requireSecretKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.body;
    if (!type || !['publishable', 'secret'].includes(type)) {
      res.status(400).json({ code: 'invalid_type', message: 'Type must be publishable or secret', type: 'invalid_request_error' });
      return;
    }

    const { key, apiKey } = await queries.createApiKey(req.merchant!.id, type);
    await queries.logAudit(req.merchant!.id, 'api_key.created', req.ip, req.get('user-agent'), { type });
    res.status(201).json({ key, ...apiKey });
  } catch (err) {
    console.error('Create API key error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/api-keys', apiKeyAuth, requireSecretKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const keys = await queries.listApiKeys(req.merchant!.id);
    res.json({ data: keys });
  } catch (err) {
    console.error('List API keys error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.delete('/api-keys/:id', apiKeyAuth, requireSecretKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await queries.revokeApiKey(req.merchant!.id, req.params.id);
    if (!success) {
      res.status(404).json({ code: 'not_found', message: 'API key not found', type: 'invalid_request_error' });
      return;
    }
    await queries.logAudit(req.merchant!.id, 'api_key.revoked', req.ip, req.get('user-agent'), { keyId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error('Revoke API key error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/payments', apiKeyAuth, requireSecretKey, idempotencyMiddleware, validatePaymentCreate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, currency = 'USD', idempotencyKey, metadata = {}, returnUrl } = req.body as PaymentCreateRequest;
    const merchantId = req.merchant!.id;

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

    const clientSecret = generateClientSecret();
    const payment = await queries.createPayment(merchantId, amount, currency, idempotencyKey || null, metadata, clientSecret);

    const bankAccount = await findOrCreateBankAccount(merchantId);

    let bankTransactionId: string | undefined;
    if (bankAccount) {
      const bankTransaction = await createBankTransaction(
        bankAccount.id,
        'credit',
        amount,
        currency,
        payment.id
      );
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
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/payments', apiKeyAuth, requireSecretKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    const payments = await queries.listPayments(
      req.merchant!.id,
      status as string,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json({ data: payments });
  } catch (err) {
    console.error('List payments error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/payments/:id', apiKeyAuth, requireSecretKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = await queries.getPaymentById(req.params.id);
    if (!payment || payment.merchantId !== req.merchant!.id) {
      res.status(404).json({ code: 'not_found', message: 'Payment not found', type: 'invalid_request_error' });
      return;
    }
    res.json(payment);
  } catch (err) {
    console.error('Get payment error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/webhooks', apiKeyAuth, requireSecretKey, validateWebhookCreate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = req.body;
    const { secret, endpoint } = await queries.createWebhookEndpoint(req.merchant!.id, url);
    await queries.logAudit(req.merchant!.id, 'webhook.created', req.ip, req.get('user-agent'), { url });
    res.status(201).json({ secret, ...endpoint });
  } catch (err) {
    console.error('Create webhook error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/webhooks', apiKeyAuth, requireSecretKey, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const endpoints = await queries.listWebhookEndpoints(req.merchant!.id);
    res.json({ data: endpoints });
  } catch (err) {
    console.error('List webhooks error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/webhooks/bank', async (req: Request, res: Response) => {
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

    await handleBankWebhook(transactionId, status);
    res.json({ success: true });
  } catch (err) {
    console.error('Bank webhook error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

export default router;