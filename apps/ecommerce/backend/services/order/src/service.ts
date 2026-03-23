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

    const productIds = cart.items.map((item) => item.productId);
    const products = await this.productClient.getProducts(productIds);

    for (const item of cart.items) {
      const product = products.get(item.productId);
      if (!product || product.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${item.productName}"`,
        };
      }
    }

    await Promise.all(
      cart.items.map((item) => {
        const product = products.get(item.productId)!;
        return this.productClient.updateStock(
          item.productId,
          product.stock - item.quantity
        );
      })
    );

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

    await this.store.addOrder(order);
    await this.cartClient.clearCart(input.userId);

    return { success: true, data: order };
  }

  async getOrder(orderId: string, userId: string): Promise<ServiceResult<Order>> {
    const order = await this.store.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      return { success: false, error: "Order not found" };
    }
    return { success: true, data: order };
  }

  async getOrderInternal(orderId: string): Promise<ServiceResult<Order>> {
    const order = await this.store.findOrderById(orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }
    return { success: true, data: order };
  }

  async getUserOrders(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<ServiceResult<{ data: Order[]; total: number; page: number; limit: number; totalPages: number }>> {
    const allOrders = await this.store.findOrdersByUserId(userId);
    const total = allOrders.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const orders = allOrders.slice(offset, offset + limit);
    return {
      success: true,
      data: { data: orders, total, page, limit, totalPages },
    };
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentId?: string
  ): Promise<ServiceResult<Order>> {
    const order = await this.store.findOrderById(orderId);
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
    await this.store.updateOrder(order);
    return { success: true, data: order };
  }

  async cancelOrder(
    orderId: string,
    userId: string
  ): Promise<ServiceResult<Order>> {
    const order = await this.store.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "shipped" || order.status === "delivered") {
      return {
        success: false,
        error: `Cannot cancel order with status "${order.status}"`,
      };
    }

    const productIds = order.items.map((item) => item.productId);
    const products = await this.productClient.getProducts(productIds);

    await Promise.all(
      order.items.map((item) => {
        const product = products.get(item.productId);
        if (product) {
          return this.productClient.updateStock(
            item.productId,
            product.stock + item.quantity
          );
        }
        return Promise.resolve();
      })
    );

    order.status = "cancelled";
    order.updatedAt = new Date();
    await this.store.updateOrder(order);
    return { success: true, data: order };
  }
}
