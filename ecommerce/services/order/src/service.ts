import { v4 as uuidv4 } from "uuid";
import {
  Order,
  OrderCreateInput,
  OrderStatus,
  ServiceResult,
  CartServiceClient,
  ProductServiceClient,
} from "../../../shared/types";
import { OrderStore } from "./store";

export class OrderService {
  constructor(
    private store: OrderStore,
    private cartClient: CartServiceClient,
    private productClient: ProductServiceClient
  ) {}

  async createOrder(input: OrderCreateInput): Promise<ServiceResult<Order>> {
    if (!input.shippingAddress.trim()) {
      return { success: false, error: "Shipping address is required" };
    }

    const cart = await this.cartClient.getCart(input.userId);
    if (!cart || cart.items.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    for (const item of cart.items) {
      const product = await this.productClient.getProduct(item.productId);
      if (!product || product.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${item.productName}"`,
        };
      }
    }

    for (const item of cart.items) {
      const product = await this.productClient.getProduct(item.productId);
      if (product) {
        await this.productClient.updateStock(
          item.productId,
          product.stock - item.quantity
        );
      }
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
    await this.cartClient.clearCart(input.userId);

    return { success: true, data: order };
  }

  getOrder(orderId: string, userId: string): ServiceResult<Order> {
    const order = this.store.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      return { success: false, error: "Order not found" };
    }
    return { success: true, data: order };
  }

  getOrderInternal(orderId: string): ServiceResult<Order> {
    const order = this.store.findOrderById(orderId);
    if (!order) {
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
    status: OrderStatus,
    paymentId?: string
  ): ServiceResult<Order> {
    const order = this.store.findOrderById(orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "cancelled") {
      return { success: false, error: "Cannot update cancelled order" };
    }

    order.status = status;
    if (paymentId) {
      order.paymentId = paymentId;
    }
    order.updatedAt = new Date();
    this.store.updateOrder(order);
    return { success: true, data: order };
  }

  async cancelOrder(
    orderId: string,
    userId: string
  ): Promise<ServiceResult<Order>> {
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
      const product = await this.productClient.getProduct(item.productId);
      if (product) {
        await this.productClient.updateStock(
          item.productId,
          product.stock + item.quantity
        );
      }
    }

    order.status = "cancelled";
    order.updatedAt = new Date();
    this.store.updateOrder(order);
    return { success: true, data: order };
  }
}
