import { useEffect, useState } from 'react';

const TEST_MODE_INDICATOR = 'TEST MODE';

const SHOP_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  imageUrl: string;
}

interface CartItem {
  productId: string;
  quantity: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  items?: any[];
  createdAt: string;
  updatedAt: string;
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({ email: '', name: '', shippingAddress: '' });
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const resp = await fetch(`${SHOP_API_URL}/api/v1/products`);
      const data = await resp.json();
      setProducts(data.data || []);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const cartTotal = (): number => {
    return cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const createOrder = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${SHOP_API_URL}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customerEmail: customer.email,
          customerName: customer.name,
          shippingAddress: customer.shippingAddress,
          currency: 'USD'
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        setOrder(data);
      } else {
        alert('Error creating order: ' + data.message);
      }
    } catch (err) {
      console.error('Failed to create order', err);
      alert('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const checkout = async () => {
    const secretKey = prompt('Enter your Gateway Secret API Key (sk_test_...):', 'sk_test_') || '';
    if (!secretKey) return;

    if (!order) return;
    try {
      const resp = await fetch(`${GATEWAY_URL}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secretKey}`
        },
        body: JSON.stringify({
          amount: order.total,
          currency: order.currency,
          metadata: { orderId: order.id, customerEmail: order.customerEmail }
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        setPayment(data);
        await fetch(`${SHOP_API_URL}/api/v1/orders/${order.id}/pay`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: data.id, status: 'pending' })
        });
        setOrder({ ...order, payment_id: data.id, status: 'pending' } as any);
      } else {
        alert('Error creating payment: ' + data.message);
      }
    } catch (err) {
      console.error('Failed to checkout', err);
      alert('Failed to create payment. Is the Gateway running?');
    }
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Demo Online Shop
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {TEST_MODE_INDICATOR}
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow p-4">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover rounded" />
                  <h3 className="font-semibold mt-2">{product.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{product.description}</p>
                  <p className="font-bold mt-2">${(product.price / 100).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Stock: {product.stock}</p>
                  <button
                    onClick={() => addToCart(product.id)}
                    className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <CartSection
              cart={cart}
              products={products}
              onRemove={removeItem}
              onUpdate={(productId, quantity) => {
                setCart(prev => prev.map(item => item.productId === productId ? { ...item, quantity } : item));
              }}
            />

            <CustomerForm customer={customer} onChange={setCustomer} />

            <CheckoutSection
              cart={cart}
              total={cartTotal()}
              customer={customer}
              order={order}
              payment={payment}
              loading={loading}
              onCreateOrder={createOrder}
              onCheckout={checkout}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function CartSection({ cart, products, onRemove, onUpdate }: {
  cart: CartItem[];
  products: Product[];
  onRemove: (productId: string) => void;
  onUpdate: (productId: string, quantity: number) => void;
}) {
  if (cart.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Cart</h2>
        <p className="text-gray-500">Your cart is empty</p>
      </div>
    );
  }

  const getItem = (productId: string): Product | undefined => products.find(p => p.id === productId);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Cart</h2>
      <ul className="space-y-3">
        {cart.map(item => {
          const product = getItem(item.productId);
          return (
            <li key={item.productId} className="flex justify-between items-center">
              <div>
                <span className="font-medium">{product?.name || item.productId.substring(0, 8)}...</span>
                <div className="flex items-center mt-1">
                  <button
                    className="px-2 py-1 bg-gray-200 rounded-l"
                    onClick={() => onUpdate(item.productId, Math.max(1, item.quantity - 1))}
                  >-</button>
                  <span className="px-2">{item.quantity}</span>
                  <button
                    className="px-2 py-1 bg-gray-200 rounded-r"
                    onClick={() => onUpdate(item.productId, item.quantity + 1)}
                  >+</button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span>${((product?.price || 0) * item.quantity / 100).toFixed(2)}</span>
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => onRemove(item.productId)}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CustomerForm({ customer, onChange }: {
  customer: { email: string; name: string; shippingAddress: string };
  onChange: (customer: { email: string; name: string; shippingAddress: string }) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
      <input
        className="w-full border p-3 rounded mb-3"
        placeholder="Email"
        value={customer.email}
        onChange={e => onChange({ ...customer, email: e.target.value })}
      />
      <input
        className="w-full border p-3 rounded mb-3"
        placeholder="Name"
        value={customer.name}
        onChange={e => onChange({ ...customer, name: e.target.value })}
      />
      <textarea
        className="w-full border p-3 rounded mb-3"
        placeholder="Shipping Address"
        value={customer.shippingAddress}
        onChange={e => onChange({ ...customer, shippingAddress: e.target.value })}
      />
    </div>
  );
}

function CheckoutSection({ cart, total, customer, order, payment, loading, onCreateOrder, onCheckout }: {
  cart: CartItem[];
  total: number;
  customer: { email: string; name: string; shippingAddress: string };
  order: Order | null;
  payment: any;
  loading: boolean;
  onCreateOrder: () => void;
  onCheckout: () => void;
}) {
  const canCheckout = cart.length > 0 && customer.email && customer.name && customer.shippingAddress;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between text-xl font-semibold mb-4">
        <span>Total</span>
        <span>${(total / 100).toFixed(2)}</span>
      </div>

      <div className="space-y-3">
        {!order ? (
          <button
            onClick={onCreateOrder}
            disabled={loading || !canCheckout}
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Order...' : 'Create Order'}
          </button>
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm text-gray-600">Order created: {order.id.substring(0, 12)}...</p>
              <p className="text-sm text-gray-500">Status: {order.status}</p>
            </div>

            {!payment ? (
              <button
                onClick={onCheckout}
                className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700"
              >
                Proceed to Payment
              </button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-600">Payment ID: {payment.id.substring(0, 12)}...</p>
                <p className="font-medium">
                  Status: <span className={`px-2 py-1 rounded text-xs ${
                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>{payment.status}</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
