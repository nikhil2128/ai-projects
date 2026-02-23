import {
  User,
  Product,
  Cart,
  Order,
  Payment,
} from "../types";

export class InMemoryStore {
  private users: Map<string, User> = new Map();
  private products: Map<string, Product> = new Map();
  private carts: Map<string, Cart> = new Map();
  private orders: Map<string, Order> = new Map();
  private payments: Map<string, Payment> = new Map();
  private tokens: Map<string, string> = new Map(); // token -> userId

  // ── Users ──────────────────────────────────────────────────────
  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  findUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  findUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  // ── Tokens ─────────────────────────────────────────────────────
  storeToken(token: string, userId: string): void {
    this.tokens.set(token, userId);
  }

  getUserIdByToken(token: string): string | undefined {
    return this.tokens.get(token);
  }

  // ── Products ───────────────────────────────────────────────────
  addProduct(product: Product): void {
    this.products.set(product.id, product);
  }

  findProductById(id: string): Product | undefined {
    return this.products.get(id);
  }

  getAllProducts(): Product[] {
    return Array.from(this.products.values());
  }

  updateProduct(product: Product): void {
    this.products.set(product.id, product);
  }

  // ── Carts ──────────────────────────────────────────────────────
  getCart(userId: string): Cart | undefined {
    return this.carts.get(userId);
  }

  saveCart(cart: Cart): void {
    this.carts.set(cart.userId, cart);
  }

  // ── Orders ─────────────────────────────────────────────────────
  addOrder(order: Order): void {
    this.orders.set(order.id, order);
  }

  findOrderById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  findOrdersByUserId(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (o) => o.userId === userId
    );
  }

  updateOrder(order: Order): void {
    this.orders.set(order.id, order);
  }

  // ── Payments ───────────────────────────────────────────────────
  addPayment(payment: Payment): void {
    this.payments.set(payment.id, payment);
  }

  findPaymentById(id: string): Payment | undefined {
    return this.payments.get(id);
  }

  findPaymentByOrderId(orderId: string): Payment | undefined {
    for (const payment of this.payments.values()) {
      if (payment.orderId === orderId) return payment;
    }
    return undefined;
  }

  updatePayment(payment: Payment): void {
    this.payments.set(payment.id, payment);
  }
}
