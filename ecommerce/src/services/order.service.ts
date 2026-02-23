import { v4 as uuidv4 } from "uuid";
import {
  Order,
  OrderCreateInput,
  OrderStatus,
  ServiceResult,
} from "../types";
import { InMemoryStore } from "../store/in-memory-store";

export class OrderService {
  constructor(private store: InMemoryStore) {}

  createOrder(input: OrderCreateInput): ServiceResult<Order> {
    if (!input.shippingAddress.trim()) {
      return { success: false, error: "Shipping address is required" };
    }

    const cart = this.store.getCart(input.userId);
    if (!cart || cart.items.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    for (const item of cart.items) {
      const product = this.store.findProductById(item.productId);
      if (!product || product.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${item.productName}"`,
        };
      }
    }

    for (const item of cart.items) {
      const product = this.store.findProductById(item.productId)!;
      product.stock -= item.quantity;
      this.store.updateProduct(product);
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const now = new Date();
    const order: Order = {
      id: uuidv4(),
      userId: input.userId,
      items: cart.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount,
      status: "pending",
      shippingAddress: input.shippingAddress,
      createdAt: now,
      updatedAt: now,
    };

    this.store.addOrder(order);

    cart.items = [];
    cart.updatedAt = new Date();
    this.store.saveCart(cart);

    return { success: true, data: order };
  }

  getOrder(orderId: string, userId: string): ServiceResult<Order> {
    const order = this.store.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      return { success: false, error: "Order not found" };
    }
    return { success: true, data: order };
  }

  getUserOrders(userId: string): ServiceResult<Order[]> {
    const orders = this.store.findOrdersByUserId(userId);
    return { success: true, data: orders };
  }

  updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): ServiceResult<Order> {
    const order = this.store.findOrderById(orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "cancelled") {
      return { success: false, error: "Cannot update cancelled order" };
    }

    order.status = status;
    order.updatedAt = new Date();
    this.store.updateOrder(order);
    return { success: true, data: order };
  }

  cancelOrder(orderId: string, userId: string): ServiceResult<Order> {
    const order = this.store.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "shipped" || order.status === "delivered") {
      return {
        success: false,
        error: `Cannot cancel order with status "${order.status}"`,
      };
    }

    for (const item of order.items) {
      const product = this.store.findProductById(item.productId);
      if (product) {
        product.stock += item.quantity;
        this.store.updateProduct(product);
      }
    }

    order.status = "cancelled";
    order.updatedAt = new Date();
    this.store.updateOrder(order);
    return { success: true, data: order };
  }
}
