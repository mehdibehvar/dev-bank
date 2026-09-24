"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = createProduct;
exports.listProducts = listProducts;
exports.getProductById = getProductById;
exports.updateProductStock = updateProductStock;
exports.createOrder = createOrder;
exports.updateOrderPayment = updateOrderPayment;
exports.updateOrderStatus = updateOrderStatus;
exports.getOrderById = getOrderById;
exports.listOrders = listOrders;
exports.getOrderItems = getOrderItems;
const pool_1 = require("./pool");
const shared_1 = require("@dev-bank/shared");
async function createProduct(name, description, priceCents, stock, imageUrl) {
    const result = await (0, pool_1.query)(`
    INSERT INTO products (id, name, description, price_cents, stock, image_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, description, price_cents as price, currency, stock, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
  `, [(0, shared_1.generateId)(), name, description, priceCents, stock, imageUrl]);
    return result.rows[0];
}
async function listProducts(limit = 50, offset = 0) {
    const result = await (0, pool_1.query)(`
    SELECT id, name, description, price_cents as price, currency, stock, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
    FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2
  `, [limit, offset]);
    return result.rows;
}
async function getProductById(id) {
    const result = await (0, pool_1.query)(`
    SELECT id, name, description, price_cents as price, currency, stock, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
    FROM products WHERE id = $1
  `, [id]);
    return result.rows[0] || null;
}
async function updateProductStock(id, newStock) {
    const result = await (0, pool_1.query)(`
    UPDATE products SET stock = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, name, description, price_cents as price, currency, stock, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
  `, [newStock, id]);
    return result.rows[0] || null;
}
async function createOrder(items, totalCents, currency, customerEmail, customerName, shippingAddress, metadata = {}) {
    const client = await (0, pool_1.getClient)();
    try {
        await client.query('BEGIN');
        const orderResult = await client.query(`
      INSERT INTO orders (id, status, total_cents, currency, customer_email, customer_name, shipping_address, metadata)
      VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7)
      RETURNING id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
    `, [(0, shared_1.generateId)(), totalCents, currency, customerEmail, customerName, shippingAddress, JSON.stringify(metadata)]);
        const order = orderResult.rows[0];
        for (const item of items) {
            await client.query(`
        INSERT INTO order_items (id, order_id, product_id, quantity, price_cents)
        VALUES ($1, $2, $3, $4, $5)
      `, [(0, shared_1.generateId)(), order.id, item.productId, item.quantity, item.price]);
        }
        await client.query('COMMIT');
        return order;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
async function updateOrderPayment(orderId, paymentId, status) {
    const result = await (0, pool_1.query)(`
    UPDATE orders SET payment_id = $1, status = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
  `, [paymentId, status, orderId]);
    return result.rows[0] || null;
}
async function updateOrderStatus(orderId, status) {
    const result = await (0, pool_1.query)(`
    UPDATE orders SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
  `, [status, orderId]);
    return result.rows[0] || null;
}
async function getOrderById(id) {
    const result = await (0, pool_1.query)(`
    SELECT id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
    FROM orders WHERE id = $1
  `, [id]);
    return result.rows[0] || null;
}
async function listOrders(limit = 50, offset = 0) {
    const result = await (0, pool_1.query)(`
    SELECT id, status, total_cents as total, currency, customer_email as "customerEmail", customer_name as "customerName", shipping_address as "shippingAddress", metadata, created_at as "createdAt", updated_at as "updatedAt"
    FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2
  `, [limit, offset]);
    return result.rows;
}
async function getOrderItems(orderId) {
    const result = await (0, pool_1.query)(`
    SELECT oi.id, oi.order_id as "orderId", oi.product_id as "productId", oi.quantity, oi.price_cents as price,
           p.name, p.description, p.price_cents as productPrice, p.currency, p.image_url as "imageUrl"
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `, [orderId]);
    return result.rows;
}
//# sourceMappingURL=queries.js.map