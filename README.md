# DEV Bank

A local, simulated payment infrastructure for testing and development.

## Architecture

```
Online Shop (Frontend) → Shop Backend API
                          ↓
                    Payment Gateway API
                          ↓
                       Local Bank API
```

The Online Shop never directly accesses the Bank database. It communicates through the Payment Gateway API.

## Quick Start

```bash
docker compose up -d --build
sleep 10
```

| Service | URL |
|---------|-----|
| Merchant Dashboard | http://localhost:5173 |
| Demo Shop | http://localhost:5174 |
| Bank Dashboard | http://localhost:5175 |
| Gateway API | http://localhost:3000 |
| Bank API | http://localhost:3001 |
| Shop API | http://localhost:4000 |

## Services

| Service | Path | Port |
|---------|------|------|
| Local Bank API | `services/bank` | 3001 |
| Payment Gateway API | `services/gateway` | 3000 |
| Shop Backend API | `services/shop` | 4000 |
| Merchant Dashboard | `web/dashboard` | 5173 |
| Shop Frontend | `web/shop` | 5174 |
| Bank Dashboard | `web/bank-dashboard` | 5175 |
| Shared Types | `packages/shared` | - |

## Quick Demo

```bash
# 1. Create merchant (saves secret key)
M=$(curl -s -X POST http://localhost:3000/api/v1/merchants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@demo.com"}')

# 2. Create payment (use the returned secret key)
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d '{"amount":1000,"currency":"USD"}'

# 3. Approve in bank dashboard (http://localhost:5175)
#    Transaction -> Approve
# 4. Payment status updates to "succeeded"
```

See [docs/README.md](docs/README.md) for full documentation, including [Docker setup](docs/DOCKER.md).

## Running Tests

```bash
npm test
```

## License

MIT
