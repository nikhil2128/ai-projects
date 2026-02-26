export type UserRole = "buyer" | "seller";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
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
  createdAt: string;
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
  updatedAt: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "credit_card" | "debit_card" | "paypal";
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
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}

export interface SellerSale {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  orderStatus: OrderStatus;
  buyerId: string;
  createdAt: string;
}

export interface SellerDashboardStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  recentSales: SellerSale[];
  topProducts: { productId: string; productName: string; totalSold: number; revenue: number }[];
}

export interface ProductCreateInput {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
}

export interface BatchUploadResult {
  created: number;
  errors: { index: number; error: string }[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
