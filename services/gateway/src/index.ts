import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import gatewayRoutes from './routes/gateway';
import { pool } from './db/pool';
import { processWebhookDeliveries } from './services/bank-client';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { code: 'rate_limit', message: 'Too many requests, please try again later', type: 'rate_limit_error' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use('/api/v1', gatewayRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ code: 'not_found', message: 'Not found', type: 'invalid_request_error' });
});

const PORT = parseInt(process.env.GATEWAY_PORT || '3000', 10);
const HOST = process.env.GATEWAY_HOST || '0.0.0.0';

async function start() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected');

    setInterval(() => {
      processWebhookDeliveries().catch(console.error);
    }, 30000);

    app.listen(PORT, HOST, () => {
      console.log(`Gateway service running on http://${HOST}:${PORT}`);
      console.log('TEST MODE enabled');
    });
  } catch (err) {
    console.error('Failed to start gateway service:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing pool...');
  await pool.end();
  process.exit(0);
});

start();

export default app;