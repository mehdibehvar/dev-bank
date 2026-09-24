import { Merchant, ApiKey, WebhookEndpoint, Payment, WebhookDelivery, ApiKeyType } from '@dev-bank/shared';
export declare function createMerchant(name: string, email: string): Promise<Merchant>;
export declare function getMerchantById(id: string): Promise<Merchant | null>;
export declare function getMerchantByEmail(email: string): Promise<Merchant | null>;
export declare function listMerchants(limit?: number, offset?: number): Promise<Merchant[]>;
export declare function createApiKey(merchantId: string, type: 'publishable' | 'secret'): Promise<{
    key: string;
    apiKey: ApiKey;
}>;
export declare function getApiKeyByPrefix(prefix: string): Promise<ApiKey | null>;
export declare function listApiKeys(merchantId: string): Promise<ApiKey[]>;
export declare function revokeApiKey(merchantId: string, keyId: string): Promise<boolean>;
export declare function verifyApiKey(key: string): Promise<{
    merchantId: string;
    type: ApiKeyType;
} | null>;
export { query, getClient } from './pool';
export declare function createWebhookEndpoint(merchantId: string, url: string): Promise<{
    secret: string;
    endpoint: WebhookEndpoint;
}>;
export declare function listWebhookEndpoints(merchantId: string): Promise<WebhookEndpoint[]>;
export declare function createPayment(merchantId: string, amount: number, currency: string, idempotencyKey: string | null, metadata: Record<string, unknown>, clientSecret: string): Promise<Payment>;
export declare function getPaymentById(id: string): Promise<Payment | null>;
export declare function getPaymentByIdempotencyKey(merchantId: string, idempotencyKey: string): Promise<Payment | null>;
export declare function updatePaymentStatus(id: string, status: 'pending' | 'succeeded' | 'failed' | 'cancelled', bankTransactionId?: string): Promise<Payment | null>;
export declare function listPayments(merchantId: string, status?: string, limit?: number, offset?: number): Promise<Payment[]>;
export declare function createWebhookDelivery(endpointId: string, eventType: string, payload: Record<string, unknown>): Promise<WebhookDelivery>;
export declare function getPendingWebhookDeliveries(limit?: number): Promise<WebhookDelivery[]>;
export declare function updateWebhookDeliveryStatus(id: string, status: 'delivered' | 'failed', attempt?: boolean): Promise<void>;
export declare function logAudit(merchantId: string | null, action: string, ip: string | null | undefined, userAgent: string | null | undefined, details: Record<string, unknown>): Promise<void>;
export declare function checkIdempotencyKey(key: string): Promise<Record<string, unknown> | null>;
export declare function storeIdempotencyKey(key: string, merchantId: string, response: Record<string, unknown>, ttlHours?: number): Promise<void>;
//# sourceMappingURL=queries.d.ts.map