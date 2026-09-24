import { query, getClient } from './pool';
import { generateId } from '@dev-bank/shared';

export async function createProduct(name: string, description: string, priceCents: number, stock: number, imageUrl?: string): Promise<any> {
  const result = await query(`
    INSERT INTO products (id, name, description, price_cents, stock, image_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, description, price_cents as price, currency, stock, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
  `, [generateId(), name, description, priceCents, stock, imageUrl]);
  return result.rows[0];
}

export async function listProducts(limit = 50, offset = 0): Promise<any[]> {
  const result = await query(`
    SELECT id, name, description, price_cents as price, currency, stock, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
    FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return result.rows;
}

export async function getProductById(id: string): Promise<any | null> {
  const result = await query(`
    SELECT id, name, description, price_cents as price, currency, stock, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
    FROM products WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function updateProductStock(id: string, newStock: number): Promise<any | null> {
  const result = await query(`
    UPDATE products SET stock = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, name, description, price_cents as price, currency, stock, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
  `, [newStock, id]);
  return result.rows[0] || null;
}

export async function createOrder(
  items: { productId: string; quantity: number; price: number }[],
  totalCents: number,
  currency: string,
  customerEmail: string,
  customerName: string,
  shippingAddress: string,
  metadata: Record<string, unknown> = {}
): Promise<any> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(`
      INSERT INTO orders (id, status, total_cents, currency, customer_email, customer_name, shipping_address, metadata)
      VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7)
      RETURNING id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
    `, [generateId(), totalCents, currency, customerEmail, customerName, shippingAddress, JSON.stringify(metadata)]);
    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (id, order_id, product_id, quantity, price_cents)
        VALUES ($1, $2, $3, $4, $5)
      `, [generateId(), order.id, item.productId, item.quantity, item.price]);
    }

    await client.query('COMMIT');
    return order;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function updateOrderPayment(orderId: string, paymentId: string, status: string): Promise<any | null> {
  const result = await query(`
    UPDATE orders SET payment_id = $1, status = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
  `, [paymentId, status, orderId]);
  return result.rows[0] || null;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<any | null> {
  const result = await query(`
    UPDATE orders SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
  `, [status, orderId]);
  return result.rows[0] || null;
}

export async function getOrderById(id: string): Promise<any | null> {
  const result = await query(`
    SELECT id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
    FROM orders WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function listOrders(limit = 50, offset = 0): Promise<any[]> {
  const result = await query(`
    SELECT id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
    FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return result.rows;
}

export async function getOrderItems(orderId: string): Promise<any[]> {
  const result = await query(`
    SELECT oi.id, oi.order_id as "orderId", oi.product_id as "productId", oi.quantity, oi.price_cents as price,
           p.name, p.description, p.price_cents as productPrice, p.currency, p.image_url as "imageUrl"
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `, [orderId]);
  return result.rows;
}