export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserRegistrationInput {
  email: string;
  name: string;
  password: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface AuthToken {
  userId: string;
  email: string;
  token: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
  createdAt: Date;
}

export interface ProductCreateInput {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
}

export interface ProductSearchQuery {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  updatedAt: Date;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderCreateInput {
  userId: string;
  shippingAddress: string;
}

export type PaymentMethod = "credit_card" | "debit_card" | "paypal";

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: Date;
}

export interface PaymentInput {
  orderId: string;
  userId: string;
  method: PaymentMethod;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Inter-service client interfaces ────────────────────────────────

export interface ProductServiceClient {
  getProduct(productId: string): Promise<Product | null>;
  updateStock(productId: string, newStock: number): Promise<boolean>;
}

export interface CartServiceClient {
  getCart(userId: string): Promise<Cart | null>;
  clearCart(userId: string): Promise<void>;
}

export interface OrderServiceClient {
  getOrder(orderId: string): Promise<Order | null>;
  updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentId?: string
  ): Promise<boolean>;
}
