"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const gateway_1 = __importDefault(require("./routes/gateway"));
const pool_1 = require("./db/pool");
const bank_client_1 = require("./services/bank-client");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { code: 'rate_limit', message: 'Too many requests, please try again later', type: 'rate_limit_error' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use('/api/v1', gateway_1.default);
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
});
app.use((_req, res) => {
    res.status(404).json({ code: 'not_found', message: 'Not found', type: 'invalid_request_error' });
});
const PORT = parseInt(process.env.GATEWAY_PORT || '3000', 10);
const HOST = process.env.GATEWAY_HOST || '0.0.0.0';
async function start() {
    try {
        await pool_1.pool.query('SELECT NOW()');
        console.log('Database connected');
        setInterval(() => {
            (0, bank_client_1.processWebhookDeliveries)().catch(console.error);
        }, 30000);
        app.listen(PORT, HOST, () => {
            console.log(`Gateway service running on http://${HOST}:${PORT}`);
            console.log('TEST MODE enabled');
        });
    }
    catch (err) {
        console.error('Failed to start gateway service:', err);
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing pool...');
    await pool_1.pool.end();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, closing pool...');
    await pool_1.pool.end();
    process.exit(0);
});
start();
exports.default = app;
//# sourceMappingURL=index.js.map