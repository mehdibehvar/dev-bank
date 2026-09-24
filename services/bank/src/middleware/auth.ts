import { Request, Response, NextFunction } from 'express';
import { BankTransaction } from '@dev-bank/shared';

export interface AuthenticatedRequest extends Request {
  bankAdmin?: boolean;
}

export function bankAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-bank-admin-key'] as string;
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

export function validateTransaction(req: Request, res: Response, next: NextFunction): void {
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

export function validateApproveReject(req: Request, res: Response, next: NextFunction): void {
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