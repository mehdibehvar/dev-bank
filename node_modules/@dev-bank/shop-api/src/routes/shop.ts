import { Router, Request, Response } from 'express';
import * as queries from '../db/queries';
import axios from 'axios';
import { createHmac } from 'node:crypto';

const router = Router();

router.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', service: 'shop', mode: 'TEST MODE' });
});

router.get('/webhook-test', (_: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Webhook endpoint is reachable' });
});

router.post('/webhook-test', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;

    if (!signature || !timestamp) {
      res.status(400).json({ code: 'invalid_request', message: 'Missing signature headers', type: 'invalid_request_error' });
      return;
    }

    const webhookSecrets = process.env.WEBHOOK_SECRETS ? JSON.parse(process.env.WEBHOOK_SECRETS) : {};
    const secret = webhookSecrets[req.body?.id || signature.substring(0, 8)];

    if (signature && process.env.WEBHOOK_SECRETS) {
      const signedPayload = timestamp + '.' + JSON.stringify(req.body);
      const expectedSignature = createHmac('sha256', Object.values(webhookSecrets)[0] as string).update(JSON.stringify(req.body)).digest('hex');
      if (signature !== timestamp + '.' + expectedSignature && signature !== expectedSignature) {
        res.status(401).json({ code: 'invalid_signature', message: 'Invalid webhook signature', type: 'authentication_error' });
        return;
      }
    }

    const event = req.body;
    console.log('Webhook received:', JSON.stringify(event));

    if (event.type === 'payment.succeeded') {
      const orderId = event.data?.metadata?.orderId;
      if (orderId) {
        await queries.updateOrderStatus(orderId, 'paid');
      }
      res.status(200).json({ received: true });
    } else if (event.type === 'payment.failed') {
      const orderId = event.data?.metadata?.orderId;
      if (orderId) {
        await queries.updateOrderStatus(orderId, 'failed');
      }
      res.status(200).json({ received: true });
    } else {
      res.status(200).json({ received: true });
    }
  } catch (err) {
    console.error('Webhook handling error:', err);
    res.status(500).json({ code: 'server_error', message: 'Webhook handling error', type: 'api_error' });
  }
});

router.get('/products', async (_: Request, res: Response) => {
  try {
    const products = await queries.listProducts();
    res.json({ data: products });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await queries.getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ code: 'not_found', message: 'Product not found', type: 'invalid_request_error' });
      return;
    }
    res.json(product);
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const { items, customerEmail, customerName, shippingAddress, metadata, currency = 'USD' } = req.body;

    if (!items || !items.length) {
      res.status(400).json({ code: 'invalid_request', message: 'Items are required', type: 'invalid_request_error' });
      return;
    }

    let totalCents = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await queries.getProductById(item.productId);
      if (!product) {
        res.status(400).json({ code: 'not_found', message: `Product not found: ${item.productId}`, type: 'invalid_request_error' });
        return;
      }

      if (product.stock < item.quantity) {
        res.status(400).json({ code: 'insufficient_stock', message: `Insufficient stock for product: ${item.productId}`, type: 'invalid_request_error' });
        return;
      }

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price || product.price,
      });

      totalCents += (item.price || product.price) * item.quantity;
    }

    const order = await queries.createOrder(
      validatedItems,
      totalCents,
      currency,
      customerEmail,
      customerName,
      shippingAddress,
      metadata
    );

    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const order = await queries.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ code: 'not_found', message: 'Order not found', type: 'invalid_request_error' });
      return;
    }

    const items = await queries.getOrderItems(req.params.id);
    res.json({ ...order, items });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.get('/orders', async (_: Request, res: Response) => {
  try {
    const orders = await queries.listOrders();
    res.json({ data: orders });
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

router.patch('/orders/:id/pay', async (req: Request, res: Response) => {
  try {
    const { paymentId, status = 'paid' } = req.body;
    if (!paymentId) {
      res.status(400).json({ code: 'invalid_request', message: 'Payment ID is required', type: 'invalid_request_error' });
      return;
    }

    const order = await queries.updateOrderPayment(req.params.id, paymentId, status);
    if (!order) {
      res.status(404).json({ code: 'not_found', message: 'Order not found', type: 'invalid_request_error' });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error('Update order payment error:', err);
    res.status(500).json({ code: 'server_error', message: 'Internal server error', type: 'api_error' });
  }
});

export default router;