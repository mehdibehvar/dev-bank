export type Currency = 'USD' | 'EUR' | 'GBP';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type ApiKeyType = 'publishable' | 'secret' | 'webhook';
export type WebhookEventType = 'payment.created' | 'payment.succeeded' | 'payment.failed' | 'payment.cancelled';
export interface Merchant {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ApiKey {
    id: string;
    merchantId: string;
    type: ApiKeyType;
    keyPrefix: string;
    keyHash: string;
    createdAt: Date;
    revokedAt: Date | null;
}
export interface WebhookEndpoint {
    id: string;
    merchantId: string;
    url: string;
    secretHash: string;
    secretPrefix: string;
    createdAt: Date;
}
export interface Payment {
    id: string;
    merchantId: string;
    amount: number;
    currency: Currency;
    status: PaymentStatus;
    idempotencyKey: string | null;
    metadata: Record<string, unknown>;
    clientSecret?: string;
    bankTransactionId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface BankAccount {
    id: string;
    merchantId: string | null;
    balance: number;
    currency: Currency;
    createdAt: Date;
    updatedAt: Date;
}
export interface BankTransaction {
    id: string;
    accountId: string;
    type: 'credit' | 'debit';
    amount: number;
    currency: Currency;
    reference: string;
    status: TransactionStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface WebhookDelivery {
    id: string;
    endpointId: string;
    eventType: WebhookEventType;
    payload: Record<string, unknown>;
    status: 'pending' | 'delivered' | 'failed';
    attempts: number;
    lastAttemptAt: Date | null;
    nextRetryAt: Date | null;
    createdAt: Date;
}
export interface AuditLog {
    id: string;
    merchantId: string | null;
    action: string;
    ipAddress: string | null;
    userAgent: string | null;
    details: Record<string, unknown>;
    createdAt: Date;
}
export interface ApiError {
    code: string;
    message: string;
    param?: string;
    type: 'api_error' | 'authentication_error' | 'invalid_request_error' | 'rate_limit_error';
}
export interface PaginatedResponse<T> {
    data: T[];
    hasMore: boolean;
    nextCursor?: string;
}
export interface PaymentCreateRequest {
    amount: number;
    currency: Currency;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
    returnUrl?: string;
}
export interface PaymentResponse {
    id: string;
    merchantId: string;
    amount: number;
    currency: Currency;
    status: PaymentStatus;
    clientSecret?: string;
    createdAt: Date;
}
export interface BankTransactionCreateRequest {
    accountId: string;
    type: 'credit' | 'debit';
    amount: number;
    currency: Currency;
    reference: string;
}
export interface BankTransactionApproveRequest {
    transactionId: string;
}
export interface BankTransactionRejectRequest {
    transactionId: string;
    reason?: string;
}
export interface WebhookEvent {
    id: string;
    type: WebhookEventType;
    data: Record<string, unknown>;
    createdAt: Date;
}
export declare const API_KEY_PREFIXES: {
    readonly publishable: "pk_test_";
    readonly secret: "sk_test_";
    readonly webhook: "whsec_";
};
export declare const TEST_MODE = true;
export declare const TEST_MODE_INDICATOR = "TEST MODE";
//# sourceMappingURL=types.d.ts.map