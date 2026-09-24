import { WebhookDelivery } from '@dev-bank/shared';
interface BankTransactionResponse {
    id: string;
    accountId: string;
    type: 'credit' | 'debit';
    amount: number;
    currency: string;
    reference: string;
    status: string;
}
export declare function createBankTransaction(accountId: string, type: 'credit' | 'debit', amount: number, currency: string, reference: string): Promise<BankTransactionResponse | null>;
export declare function getBankTransaction(id: string): Promise<BankTransactionResponse | null>;
export declare function findOrCreateBankAccount(merchantId: string): Promise<{
    id: string;
} | null>;
export declare function sendWebhook(delivery: WebhookDelivery & {
    url: string;
    secretHash: string;
    secretPrefix: string;
}): Promise<boolean>;
export declare function processWebhookDeliveries(): Promise<void>;
export declare function handleBankWebhook(transactionId: string, status: 'completed' | 'failed'): Promise<void>;
export declare function generateClientSecret(): string;
export {};
//# sourceMappingURL=bank-client.d.ts.map