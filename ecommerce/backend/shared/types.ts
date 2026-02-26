export type UserRole = "buyer" | "seller";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

export interface UserRegistrationInput {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface AuthToken {
  userId: string;
  email: string;
  role: UserRole;
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
  sellerId?: string;
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
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  getProducts(productIds: string[]): Promise<Map<string, Product>>;
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

// ── Seller-specific types ──────────────────────────────────────────

export interface SellerSale {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  orderStatus: OrderStatus;
  buyerId: string;
  createdAt: Date;
}

export type BatchJobStatus = "pending" | "processing" | "completed" | "failed";

export interface BatchJob {
  id: string;
  sellerId: string;
  status: BatchJobStatus;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  errorCount: number;
  errors: { row: number; error: string }[];
  fileName: string;
  retryCount: number;
  maxRetries: number;
  failedAtRow: number | null;
  csvData: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SellerNotificationType = "batch_completed" | "batch_failed" | "batch_completed_with_errors";

export interface SellerNotification {
  id: string;
  sellerId: string;
  type: SellerNotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

export interface SellerDashboardStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  recentSales: SellerSale[];
  topProducts: { productId: string; productName: string; totalSold: number; revenue: number }[];
}
