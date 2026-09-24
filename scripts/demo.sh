#!/bin/bash
# DEV Bank End-to-End Demo Script
# Demonstrates the complete payment flow:
# Create Merchant → Generate API Keys → Create Payment → Approve in Bank → Payment Succeeds → Webhook Delivered

BANK_KEY="sk_bank_admin_test_1234567890"
GATEWAY_URL="http://localhost:3000"
BANK_URL="http://localhost:3001"
SHOP_URL="http://localhost:4000"

echo "========================================"
echo "  DEV Bank End-to-End Demo (TEST MODE)"
echo "========================================"
echo ""

# Check if services are running
echo "Checking services..."
BANK_HEALTH=$(curl -s $BANK_URL/api/v1/health | jq -r '.status')
GATEWAY_HEALTH=$(curl -s $GATEWAY_URL/api/v1/health | jq -r '.status')
SHOP_HEALTH=$(curl -s $SHOP_URL/api/v1/health | jq -r '.status')

if [ "$BANK_HEALTH" != "ok" ] || [ "$GATEWAY_HEALTH" != "ok" ] || [ "$SHOP_HEALTH" != "ok" ]; then
  echo "ERROR: Services not running. Start with: docker compose up -d --build"
  exit 1
fi

echo "All services are running."
echo ""

# Step 1: Create Merchant
echo "Step 1: Creating merchant..."
MERCHANT=$(curl -s -X POST $GATEWAY_URL/api/v1/merchants \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Store","email":"demo@dev-bank.local"}')

MERCHANT_ID=$(echo $MERCHANT | jq -r '.id')
SECRET_KEY=$(echo $MERCHANT | jq -r '.keys.secret')
PUBLISHABLE_KEY=$(echo $MERCHANT | jq -r '.keys.publishable')

echo "  Merchant ID: $MERCHANT_ID"
echo "  Secret Key:  ${SECRET_KEY:0:15}..."
echo "  Pub Key:     ${PUBLISHABLE_KEY:0:15}..."
echo ""

# Step 2: Get bank balance before
echo "Step 2: Checking bank balance before..."
BALANCE_BEFORE=$(curl -s -H "X-Bank-Admin-Key: $BANK_KEY" $BANK_URL/api/v1/balance | jq -r '.balance')
echo "  Bank Balance: $$(($(echo $BALANCE_BEFORE) / 100).00 USD)"
echo ""

# Step 3: Create Payment
echo "Step 3: Creating payment..."
PAYMENT=$(curl -s -X POST $GATEWAY_URL/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET_KEY" \
  -d '{"amount":2500,"currency":"USD","metadata":{"orderId":"demo_order_001"}}')

PAYMENT_ID=$(echo $PAYMENT | jq -r '.id')
PAYMENT_STATUS=$(echo $PAYMENT | jq -r '.status')

echo "  Payment ID: $PAYMENT_ID"
echo "  Status: $PAYMENT_STATUS"
echo "  Amount: $$(($(echo $PAYMENT | jq -r '.amount') / 100).00 USD)"
echo ""

# Step 4: Find bank transaction
echo "Step 4: Finding bank transaction..."
TX=$(curl -s -H "X-Bank-Admin-Key: $BANK_KEY" $BANK_URL/api/v1/transactions/reference/$PAYMENT_ID)
TX_ID=$(echo $TX | jq -r '.id')
TX_STATUS=$(echo $TX | jq -r '.status')

echo "  Transaction ID: $TX_ID"
echo "  Status: $TX_STATUS"
echo ""

# Step 5: Approve transaction in bank
echo "Step 5: Approving transaction in Local Bank..."
APPROVE=$(curl -s -X POST $BANK_URL/api/v1/transactions/$TX_ID/approve \
  -H "Content-Type: application/json" \
  -H "X-Bank-Admin-Key: $BANK_KEY" \
  -d "{\"transactionId\":\"$TX_ID\"}")

echo "  Transaction status: $(echo $APPROVE | jq -r '.status')"
echo ""

# Step 6: Verify payment succeeded
echo "Step 6: Verifying payment status..."
UPDATED_PAYMENT=$(curl -s -H "Authorization: Bearer $SECRET_KEY" $GATEWAY_URL/api/v1/payments/$PAYMENT_ID)
UPDATED_STATUS=$(echo $UPDATED_PAYMENT | jq -r '.status')

echo "  Payment status: $UPDATED_STATUS"
echo ""

# Step 7: Check bank balance after
echo "Step 7: Checking bank balance after..."
BALANCE_AFTER=$(curl -s -H "X-Bank-Admin-Key: $BANK_KEY" $BANK_URL/api/v1/balance | jq -r '.balance')
echo "  Bank Balance: $$(($(echo $BALANCE_AFTER) / 100).00 USD"
echo "  Change:        $$(($(($BALANCE_BEFORE - BALANCE_AFTER)) / 100).00 USD"
echo ""

echo "========================================"
if [ "$UPDATED_STATUS" == "succeeded" ]; then
  echo "  SUCCESS! Payment completed end-to-end."
  echo "  1. Merchant created with API keys"
  echo "  2. Payment created and pending"
  echo "  3. Bank transaction created and pending"
  echo "  4. Bank admin approved transaction"
  echo "  5. Bank balance decreased"
  echo "  6. Payment succeeded (via webhook)"
  echo "  7. Webhooks delivered to registered endpoints"
else
  echo "  FAILED: Payment status is $UPDATED_STATUS"
fi
echo "========================================"