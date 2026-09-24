"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
exports.seed = seed;
const pool_1 = require("./pool");
const shared_1 = require("@dev-bank/shared");
async function migrate() {
    console.log('Running shop database migrations...');
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price_cents BIGINT NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'shipped', 'delivered')),
      total_cents BIGINT NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      payment_id VARCHAR(255),
      payment_intent_id VARCHAR(255),
      customer_email VARCHAR(255),
      customer_name VARCHAR(255),
      shipping_address TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price_cents BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await (0, pool_1.query)(`
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `);
    console.log('Shop database migrations completed');
}
async function seed() {
    console.log('Seeding shop database...');
    const existing = await (0, pool_1.query)('SELECT COUNT(*) FROM products');
    if (parseInt(existing.rows[0].count) === 0) {
        const products = [
            { name: 'Demo T-Shirt', description: 'A soft cotton t-shirt', price: 1500, stock: 100 },
            { name: 'Demo Coffee Mug', description: 'Ceramic coffee mug', price: 850, stock: 50 },
            { name: 'Demo Notebook', description: 'A5 spiral notebook', price: 450, stock: 200 },
            { name: 'Demo Pen Set', description: 'Set of 5 colored pens', price: 600, stock: 150 },
            { name: 'Demo Sticker Pack', description: 'Pack of 10 vinyl stickers', price: 300, stock: 500 },
        ];
        for (const p of products) {
            await (0, pool_1.query)(`
        INSERT INTO products (id, name, description, price_cents, currency, stock, image_url)
        VALUES ($1, $2, $3, $4, 'USD', $5, $6)
      `, [(0, shared_1.generateId)(), p.name, p.description, p.price, p.stock, `https://picsum.photos/seed/${p.name.replace(/\s/g, '')}/200/200`]);
        }
        console.log('Created demo products');
    }
    console.log('Shop database seeded');
}
if (require.main === module) {
    migrate()
        .then(() => seed())
        .then(() => process.exit(0))
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map