export declare function createProduct(name: string, description: string, priceCents: number, stock: number, imageUrl?: string): Promise<any>;
export declare function listProducts(limit?: number, offset?: number): Promise<any[]>;
export declare function getProductById(id: string): Promise<any | null>;
export declare function updateProductStock(id: string, newStock: number): Promise<any | null>;
export declare function createOrder(items: {
    productId: string;
    quantity: number;
    price: number;
}[], totalCents: number, currency: string, customerEmail: string, customerName: string, shippingAddress: string, metadata?: Record<string, unknown>): Promise<any>;
export declare function updateOrderPayment(orderId: string, paymentId: string, status: string): Promise<any | null>;
export declare function updateOrderStatus(orderId: string, status: string): Promise<any | null>;
export declare function getOrderById(id: string): Promise<any | null>;
export declare function listOrders(limit?: number, offset?: number): Promise<any[]>;
export declare function getOrderItems(orderId: string): Promise<any[]>;
//# sourceMappingURL=queries.d.ts.map