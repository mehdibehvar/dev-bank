"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyGatewayTransactionUpdate = notifyGatewayTransactionUpdate;
const axios_1 = __importDefault(require("axios"));
const GATEWAY_API_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const GATEWAY_BANK_API_KEY = process.env.BANK_ADMIN_API_KEY || 'sk_bank_admin_test_1234567890';
async function notifyGatewayTransactionUpdate(transactionId, status) {
    try {
        await axios_1.default.post(`${GATEWAY_API_URL}/api/v1/webhooks/bank`, {
            transactionId,
            status,
        }, {
            headers: {
                'X-Bank-Admin-Key': GATEWAY_BANK_API_KEY,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }
    catch (err) {
        console.error('Failed to notify gateway of transaction update:', err);
    }
}
//# sourceMappingURL=gateway-client.js.map