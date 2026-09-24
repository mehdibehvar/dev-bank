import axios from 'axios';

const GATEWAY_API_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const GATEWAY_BANK_API_KEY = process.env.BANK_ADMIN_API_KEY || 'sk_bank_admin_test_1234567890';

export async function notifyGatewayTransactionUpdate(transactionId: string, status: 'completed' | 'failed'): Promise<void> {
  try {
    await axios.post(`${GATEWAY_API_URL}/api/v1/webhooks/bank`, {
      transactionId,
      status,
    }, {
      headers: {
        'X-Bank-Admin-Key': GATEWAY_BANK_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  } catch (err) {
    console.error('Failed to notify gateway of transaction update:', err);
  }
}
