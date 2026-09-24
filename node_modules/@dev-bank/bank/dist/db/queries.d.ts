import { BankAccount, BankTransaction } from '@dev-bank/shared';
export declare function createAccount(merchantId: string | null, initialBalanceCents?: number, currency?: string): Promise<BankAccount>;
export declare function getAccountById(id: string): Promise<BankAccount | null>;
export declare function getAccountByMerchantId(merchantId: string): Promise<BankAccount | null>;
export declare function updateAccountBalance(accountId: string, amountCents: number): Promise<BankAccount | null>;
export declare function createTransaction(accountId: string, type: 'credit' | 'debit', amountCents: number, currency: string, reference: string): Promise<BankTransaction>;
export declare function getTransactionById(id: string): Promise<BankTransaction | null>;
export declare function getTransactionByReference(reference: string): Promise<BankTransaction | null>;
export declare function updateTransactionStatus(id: string, status: 'pending' | 'completed' | 'failed'): Promise<BankTransaction | null>;
export declare function listTransactions(accountId?: string, status?: string, limit?: number, offset?: number): Promise<BankTransaction[]>;
export declare function getBankBalance(): Promise<{
    balance: number;
    currency: string;
}>;
export declare function getReserveAccount(): Promise<{
    id: string;
    balance: number;
} | null>;
export declare function logAudit(merchantId: string | null, action: string, ip: string | null | undefined, userAgent: string | null | undefined, details: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=queries.d.ts.map