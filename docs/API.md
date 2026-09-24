# API Endpoints

This document describes all API endpoints available in the DEV Bank system.

## Common Headers

| Header | Description | Required For |
|--------|-------------|-------------|
| `Authorization: Bearer sk_test_...` | Secret API key | Gateway write operations |
| `X-Bank-Admin-Key: sk_bank_admin_test_...` | Bank admin key | Bank admin operations |
| `Idempotency-Key: ...` | Prevents duplicate requests | Payment creation |

## Payment Gateway API (port 3000)

### Merchants

#### `POST /api/v1/merchants`
Create a new merchant with auto-generated API keys.

**Request Body:**
```json
{
  "name": "Store Name",
  "email": "owner@example.com"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Store Name",
  "email": "owner@example.com",
  "createdAt": "2026-09-24T...",
  "updatedAt": "2026-09-24T...",
  "keys": {
    "secret": "sk_test_...",
    "publishable": "pk_test_..."
  }
}
```

#### `GET /api/v1/merchants`
List all merchants.

#### `GET /api/v1/merchants/:id`
Get a specific merchant by ID.

### API Keys

#### `POST /api/v1/api-keys`
Generate a new API key for a merchant.

**Requires:** `Authorization: Bearer <secret_key>`

**Request Body:**
```json
{
  "type": "publishable" | "secret"
}
```

**Response (201):**
```json
{
  "key": "sk_test_..." | "pk_test_...",
  "id": "uuid",
  "merchantId": "uuid",
  "type": "secret",
  "keyPrefix": "sk_test_",
  "createdAt": "2026-09-24T...",
  "revokedAt": null
}
```

#### `GET /api/v1/api-keys`
List all API keys for a merchant (keys are masked).

#### `DELETE /api/v1/api-keys/:id`
Revoke an API key.

### Payments

#### `POST /api/v1/payments`
Create a new payment.

**Requires:** `Authorization: Bearer <secret_key>`
**Optional:** `Idempotency-Key` header

**Request Body:**
```json
{
  "amount": 1500,
  "currency": "USD",
  "metadata": {},
  "idempotencyKey": "unique-key"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "merchantId": "uuid",
  "amount": 1500,
  "currency": "USD",
  "status": "pending",
  "clientSecret": "pi_...",
  "createdAt": "2026-09-24T..."
}
```

#### `GET /api/v1/payments`
List payments for a merchant.

#### `GET /api/v1/payments/:id`
Get a specific payment by ID.

### Webhooks

#### `POST /api/v1/webhooks`
Register a webhook endpoint for a merchant.

**Request Body:**
```json
{
  "url": "https://your-shop.com/webhook"
}
```

**Response (201):**
```json
{
  "secret": "whsec_...",
  "id": "uuid",
  "merchantId": "uuid",
  "url": "https://your-shop.com/webhook",
  "secretPrefix": "whsec_",
  "createdAt": "2026-09-24T..."
}
```

#### `GET /api/v1/webhooks`
List all webhook endpoints for a merchant.

### Internal

#### `POST /api/v1/webhooks/bank`
Receive notifications from the Local Bank when transactions are approved/rejected.

**Requires:** `X-Bank-Admin-Key` header

## Local Bank API (port 3001)

All bank admin operations require the `X-Bank-Admin-Key` header.

### Health

#### `GET /api/v1/health`
Health check endpoint.

### Balance

#### `GET /api/v1/balance`
Get the bank's general reserve balance.

### Accounts

#### `POST /api/v1/accounts`
Create a new bank account.

#### `GET /api/v1/accounts/:id`
Get a specific account by ID.

#### `GET /api/v1/accounts/merchant/:merchantId`
Get a merchant's bank account.

#### `GET /api/v1/accounts/find-or-create/:merchantId`
Find or create a merchant's account (used by gateway).

### Transactions

#### `POST /api/v1/transactions`
Create a transaction (used internally by gateway).

**Request Body:**
```json
{
  "accountId": "uuid",
  "type": "credit" | "debit",
  "amount": 1500,
  "currency": "USD",
  "reference": "payment_id"
}
```

#### `GET /api/v1/transactions`
List transactions (admin only).

#### `GET /api/v1/transactions/:id`
Get a specific transaction by ID.

#### `GET /api/v1/transactions/reference/:reference`
Get a transaction by reference (payment ID).

#### `POST /api/v1/transactions/:id/approve`
Approve a pending transaction (admin only).

#### `POST /api/v1/transactions/:id/reject`
Reject a pending transaction (admin only).

## Shop Backend API (port 4000)

### Health

#### `GET /api/v1/health`
Health check endpoint.

### Products

#### `GET /api/v1/products`
List all products in the store.

#### `GET /api/v1/products/:id`
Get a specific product.

### Orders

#### `POST /api/v1/orders`
Create a new order.

**Request Body:**
```json
{
  "items": [{"productId": "uuid", "quantity": 1}],
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "shippingAddress": "123 Main St"
}
```

#### `GET /api/v1/orders/:id`
Get order details including items.

#### `GET /api/v1/orders`
List all orders.

#### `PATCH /api/v1/orders/:id/pay`
Update order payment status.

**Request Body:**
```json
{
  "paymentId": "uuid",
  "status": "paid" | "failed" | "pending"
}
```

#### `POST /api/v1/webhook-test`
Receive webhook notifications from the gateway (for `payment.succeeded` events).
