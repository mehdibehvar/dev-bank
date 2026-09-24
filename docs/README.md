# DEV Bank

A local, simulated payment infrastructure for testing and development.

This system replicates a real payment gateway stack with:

- **Payment Gateway API** - handles merchants, API keys, payments, and webhooks
- **Local Bank** - manages accounts, transactions, and balances
- **Demo Online Shop** - a complete e-commerce shop that integrates with the gateway
- **Merchant Dashboard** - dashboard for managing merchants, API keys, payments
- **Bank Dashboard** - dashboard for reviewing and approving transactions

All money is simulated. The system runs entirely locally.

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Services](#services)
- [API Documentation](#api-documentation)
- [End-to-End Demo Flow](#end-to-end-demo-flow)
- [Testing](#testing)
- [Security](#security)
- [Development](#development)
- [Environment Variables](#environment-variables)

## Architecture

```
Online Shop (Frontend)  ──────►  Shop Backend API
                                    │
                                    ▼
                            Payment Gateway API
                                    │
                                    ▼
                              Local Bank API
```

**Key Separation:** The Online Shop never directly accesses the Bank database. It communicates through the Payment Gateway API, which acts as an intermediary between the Shop and the Bank.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- npm 10+

### Using Docker Compose

```bash
# Start all services
docker compose up -d --build

# Wait for services to start
sleep 10

# Verify services are running
curl http://localhost:3001/api/v1/health  # Bank
curl http://localhost:3000/api/v1/health  # Gateway
curl http://localhost:4000/api/v1/health  # Shop
```

### Web Interfaces

| Service        | URL                    |
|----------------|------------------------|
| Merchant Dashboard | http://localhost:5173 |
| Demo Shop      | http://localhost:5174   |
| Bank Dashboard | http://localhost:5175  |

## Services

### 1. Local Bank API (`services/bank`)

Manages bank accounts and transactions. Supports approve/reject workflow.

**Port:** 3001

**Admin Key Header:** `X-Bank-Admin-Key: sk_bank_admin_test_1234567890`

### 2. Payment Gateway API (`services/gateway`)

Handles merchants, API keys, payments, and webhooks. Acts as the middle layer between the Shop and the Bank.

**Port:** 3000

**Auth:** `Authorization: Bearer <secret_key>`

### 3. Shop Backend API (`services/shop`)

E-commerce store with products, orders, and checkout integration.

**Port:** 4000

### 4. React Frontends (`web/`)

- `web/dashboard` - Merchant dashboard (port 5173)
- `web/shop` - Demo online shop (port 5174)
- `web/bank-dashboard` - Bank admin dashboard (port 5175)

## API Documentation

### Payment Gateway API

#### Merchants

```
POST   /api/v1/merchants       Create a new merchant (auto-generates API keys)
GET    /api/v1/merchants       List all merchants
GET    /api/v1/merchants/:id   Get merchant details
```

**Create Merchant:**
```bash
curl -X POST http://localhost:3000/api/v1/merchants \
  -H "Content-Type: application/json" \
  -d '{"name":"My Store","email":"store@example.com"}'
```

**Response:**
```json
{
  "id": "merchant-uuid",
  "name": "My Store",
  "email": "store@example.com",
  "keys": {
    "secret": "sk_test_...",
    "publishable": "pk_test_..."
  }
}
```

#### API Keys

```
POST   /api/v1/api-keys       Generate a new API key
GET    /api/v1/api-keys       List API keys
DELETE /api/v1/api-keys/:id   Revoke an API key
```

*Requires Bearer token authentication with a secret key*

#### Payments

```
POST   /api/v1/payments       Create a payment
GET    /api/v1/payments       List payments
GET    /api/v1/payments/:id   Get payment details
```

**Create Payment:**
```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_test_..." \
  -d '{"amount":1500,"currency":"USD","metadata":{"orderId":"ord_123"}}'
```

**Response:**
```json
{
  "id": "payment-uuid",
  "merchantId": "...",
  "amount": 1500,
  "currency": "USD",
  "status": "pending",
  "clientSecret": "pi_...",
  "createdAt": "2026-..."
}
```

#### Webhooks

```
POST   /api/v1/webhooks       Register a webhook endpoint
GET    /api/v1/webhooks       List webhook endpoints
```

*Requires Bearer token authentication with a secret key*

### Local Bank API

```
GET    /api/v1/health          Health check
GET    /api/v1/balance         Get bank balance
POST   /api/v1/accounts        Create an account
GET    /api/v1/accounts/:id    Get account
GET    /api/v1/accounts/merchant/:merchantId  Get account by merchant
GET    /api/v1/accounts/find-or-create/:merchantId  Find or create account
POST   /api/v1/transactions    Create a transaction
GET    /api/v1/transactions     List transactions
GET    /api/v1/transactions/:id Get transaction
POST   /api/v1/transactions/:id/approve  Approve transaction
POST   /api/v1/transactions/:id/reject  Reject transaction
```

## End-to-End Demo Flow

### Complete Payment Flow

1. **Create Merchant**
```bash
curl -X POST http://localhost:3000/api/v1/merchants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Store","email":"test@example.com"}'
```
Note the `id` (merchant ID) and `keys.secret` (API secret key).

2. **Create Payment**
```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_test_..." \
  -d '{"amount":5000,"currency":"USD"}'
```
Note the payment `id` - it will be `pending`.

3. **Find Bank Transaction**
```bash
curl -H "X-Bank-Admin-Key: sk_bank_admin_test_1234567890" \
  http://localhost:3001/api/v1/transactions/reference/{payment_id}
```

4. **Approve Transaction** (Bank Dashboard)
```bash
curl -X POST http://localhost:3001/api/v1/transactions/{tx_id}/approve \
  -H "Content-Type: application/json" \
  -H "X-Bank-Admin-Key: sk_bank_admin_test_1234567890" \
  -d '{"transactionId":"{tx_id}"}'
```

5. **Verify Payment Succeeded**
```bash
curl -H "Authorization: Bearer sk_test_..." \
  http://localhost:3000/api/v1/payments/{payment_id}
```

6. **Check Bank Balance Decreased**
```bash
curl -H "X-Bank-Admin-Key: sk_bank_admin_test_1234567890" \
  http://localhost:3001/api/v1/balance
```

## Testing

```bash
# Run all tests
npm test

# Run specific service tests
npx jest --config=jest.config.js --testPathPattern="tests/bank"
npx jest --config=jest.config.js --testPathPattern="tests/gateway"
npx jest --config=jest.config.js --testPathPattern="tests/shop"
```

## Security

This system implements the following security practices:

- **API Authentication**: Secret keys for server-side operations, publishable keys for client-side
- **Secure API Key Handling**: Keys are hashed (SHA-256) before storage; only prefixes are visible in listings
- **Secret Key Separation**: Publishable keys cannot perform sensitive operations
- **Webhook Signature Verification**: HMAC-SHA256 signatures on webhook payloads
- **Input Validation**: Zod schema validation on all inputs
- **Rate Limiting**: Per-IP rate limiting on all endpoints
- **Idempotency**: Idempotency keys prevent duplicate payments
- **Database Transactions**: Multi-step operations use atomic transactions
- **Authorization**: Secret key required for sensitive operations
- **Sensitive Data Masking**: Key values are masked in list responses
- **Audit Logs**: All actions are logged with IP and user agent

**TEST MODE:** All keys use `pk_test_`, `sk_test_`, `whsec_` prefixes. A visible TEST MODE indicator is shown in all dashboards.

## Development

### Local Development (without Docker)

```bash
# Start databases (Docker)
docker compose up -d bank-db gateway-db shop-db redis

# Run migrations
cd services/bank && npm run db:migrate
cd services/gateway && npm run db:migrate
cd services/shop && npm run db:migrate

# Start services
cd services/bank && npm run dev
cd services/gateway && npm run dev
cd services/shop && npm run dev

# Start frontend apps
cd web/dashboard && npm install && npm run dev
cd web/shop && npm install && npm run dev
cd web/bank-dashboard && npm install && npm run dev
```

### Running Tests

```bash
npm test
```

### TypeScript Compilation

```bash
npm run typecheck
```

## Environment Variables

Each service reads configuration from environment variables. See `.env.example` for all available options.

**Key prefixes:**
- `pk_test_` - Publishable keys (client-side safe)
- `sk_test_` - Secret keys (server-side only)
- `whsec_` - Webhook endpoint secrets

**Important:** Never expose Secret Keys in frontend code. Secret keys should only be used server-side.
