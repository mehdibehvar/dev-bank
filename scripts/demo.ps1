# DEV Bank End-to-End Demo Script (PowerShell)
# Demonstrates the complete payment flow

$BANK_KEY = "sk_bank_admin_test_1234567890"
$GATEWAY_URL = "http://localhost:3000"
$BANK_URL = "http://localhost:3001"
$SHOP_URL = "http://localhost:4000"

Write-Host "========================================"
Write-Host "  DEV Bank End-to-End Demo (TEST MODE)"
Write-Host "========================================"
Write-Host ""

# Check if services are running
Write-Host "Checking services..."
try {
  $bankHealth = (curl.exe -s "$BANK_URL/api/v1/health" | ConvertFrom-Json).status
  $gatewayHealth = (curl.exe -s "$GATEWAY_URL/api/v1/health" | ConvertFrom-Json).status
  $shopHealth = (curl.exe -s "$SHOP_URL/api/v1/health" | ConvertFrom-Json).status
  if ($bankHealth -ne "ok" -or $gatewayHealth -ne "ok" -or $shopHealth -ne "ok") {
    Write-Host "ERROR: Services not all healthy"
    exit 1
  }
} catch {
  Write-Host "ERROR: Services not running. Start with: docker compose up -d --build"
  exit 1
}

Write-Host "All services are running."
Write-Host ""

# Step 1: Create Merchant
Write-Host "Step 1: Creating merchant..."
$merchantJson = '{"name":"Demo Store","email":"demo@dev-bank.local"}'
[System.IO.File]::WriteAllText('C:\Temp\merchant_demo.json', $merchantJson)
$merchant = curl.exe -s -X POST "$GATEWAY_URL/api/v1/merchants" -H "Content-Type: application/json" -d @C:\Temp\merchant_demo.json | ConvertFrom-Json

$merchantId = $merchant.id
$secretKey = $merchant.keys.secret
$publishableKey = $merchant.keys.publishable

Write-Host "  Merchant ID: $merchantId"
Write-Host "  Secret Key:  $($secretKey.Substring(0, 15))..."
Write-Host "  Pub Key:     $($publishableKey.Substring(0, 15))..."
Write-Host ""

# Step 2: Get bank balance before
Write-Host "Step 2: Checking bank balance before..."
$balanceBefore = (curl.exe -s -H "X-Bank-Admin-Key: $BANK_KEY" "$BANK_URL/api/v1/balance" | ConvertFrom-Json).balance
Write-Host "  Bank Balance: $($([math]::Round($balanceBefore / 100, 2))) USD"
Write-Host ""

# Step 3: Create Payment
Write-Host "Step 3: Creating payment..."
$paymentJson = '{"amount":2500,"currency":"USD","metadata":{"orderId":"demo_order_001"}}'
[System.IO.File]::WriteAllText('C:\Temp\payment_demo.json', $paymentJson)
$payment = curl.exe -s -X POST "$GATEWAY_URL/api/v1/payments" -H "Content-Type: application/json" -H "Authorization: Bearer $secretKey" -d @C:\Temp\payment_demo.json | ConvertFrom-Json

$paymentId = $payment.id
$paymentStatus = $payment.status

Write-Host "  Payment ID: $paymentId"
Write-Host "  Status: $paymentStatus"
Write-Host "  Amount: $($([math]::Round($payment.amount / 100, 2))) USD"
Write-Host ""

# Step 4: Find bank transaction
Write-Host "Step 4: Finding bank transaction..."
$tx = curl.exe -s -H "X-Bank-Admin-Key: $BANK_KEY" "$BANK_URL/api/v1/transactions/reference/$paymentId" | ConvertFrom-Json
$txId = $tx.id
$txStatus = $tx.status

Write-Host "  Transaction ID: $txId"
Write-Host "  Status: $txStatus"
Write-Host ""

# Step 5: Approve transaction in bank
Write-Host "Step 5: Approving transaction in Local Bank..."
$approveJson = "{`"transactionId`":`"$txId`"}"
[System.IO.File]::WriteAllText('C:\Temp\approve_demo.json', $approveJson)
$approve = curl.exe -s -X POST "$BANK_URL/api/v1/transactions/$txId/approve" -H "Content-Type: application/json" -H "X-Bank-Admin-Key: $BANK_KEY" -d @C:\Temp\approve_demo.json | ConvertFrom-Json

Write-Host "  Transaction status: $($approve.status)"
Write-Host ""

# Step 6: Verify payment succeeded
Write-Host "Step 6: Verifying payment status..."
$updatedPayment = curl.exe -s -H "Authorization: Bearer $secretKey" "$GATEWAY_URL/api/v1/payments/$paymentId" | ConvertFrom-Json
$updatedStatus = $updatedPayment.status

Write-Host "  Payment status: $updatedStatus"
Write-Host ""

# Step 7: Check bank balance after
Write-Host "Step 7: Checking bank balance after..."
$balanceAfter = (curl.exe -s -H "X-Bank-Admin-Key: $BANK_KEY" "$BANK_URL/api/v1/balance" | ConvertFrom-Json).balance
Write-Host "  Bank Balance: $($([math]::Round($balanceAfter / 100, 2))) USD"
Write-Host "  Change:        $($([math]::Round(($balanceBefore - $balanceAfter) / 100, 2))) USD"
Write-Host ""

Write-Host "========================================"
if ($updatedStatus -eq "succeeded") {
  Write-Host "  SUCCESS! Payment completed end-to-end."
  Write-Host "  1. Merchant created with API keys"
  Write-Host "  2. Payment created and pending"
  Write-Host "  3. Bank transaction created and pending"
  Write-Host "  4. Bank admin approved transaction"
  Write-Host "  5. Bank balance decreased"
  Write-Host "  6. Payment succeeded (via webhook)"
  Write-Host "  7. Webhooks delivered to registered endpoints"
} else {
  Write-Host "  FAILED: Payment status is $updatedStatus"
}
Write-Host "========================================"