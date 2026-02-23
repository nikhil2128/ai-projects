import { v4 as uuidv4 } from "uuid";
import {
  Payment,
  PaymentInput,
  ServiceResult,
  OrderServiceClient,
  ProductServiceClient,
} from "../../../shared/types";
import { PaymentStore } from "./store";

export class PaymentService {
  constructor(
    private store: PaymentStore,
    private orderClient: OrderServiceClient,
    private productClient: ProductServiceClient
  ) {}

  async processPayment(input: PaymentInput): Promise<ServiceResult<Payment>> {
    const order = await this.orderClient.getOrder(input.orderId);
    if (!order || order.userId !== input.userId) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "cancelled") {
      return {
        success: false,
        error: "Cannot pay for a cancelled order",
      };
    }

    const existingPayment = this.store.findPaymentByOrderId(input.orderId);
    if (existingPayment && existingPayment.status === "completed") {
      return {
        success: false,
        error: "Order has already been paid for",
      };
    }

    const payment: Payment = {
      id: uuidv4(),
      orderId: input.orderId,
      userId: input.userId,
      amount: order.totalAmount,
      method: input.method,
      status: "completed",
      transactionId: `txn_${uuidv4().slice(0, 12)}`,
      createdAt: new Date(),
    };

    this.store.addPayment(payment);

    await this.orderClient.updateOrderStatus(
      input.orderId,
      "confirmed",
      payment.id
    );

    return { success: true, data: payment };
  }

  getPayment(paymentId: string, userId: string): ServiceResult<Payment> {
    const payment = this.store.findPaymentById(paymentId);
    if (!payment || payment.userId !== userId) {
      return { success: false, error: "Payment not found" };
    }
    return { success: true, data: payment };
  }

  getPaymentByOrderId(
    orderId: string,
    userId: string
  ): ServiceResult<Payment> {
    const payment = this.store.findPaymentByOrderId(orderId);
    if (!payment || payment.userId !== userId) {
      return { success: false, error: "Payment not found for this order" };
    }
    return { success: true, data: payment };
  }

  async refundPayment(
    paymentId: string,
    userId: string
  ): Promise<ServiceResult<Payment>> {
    const payment = this.store.findPaymentById(paymentId);
    if (!payment || payment.userId !== userId) {
      return { success: false, error: "Payment not found" };
    }

    if (payment.status !== "completed") {
      return {
        success: false,
        error: `Cannot refund payment with status "${payment.status}"`,
      };
    }

    payment.status = "refunded";
    this.store.updatePayment(payment);

    const order = await this.orderClient.getOrder(payment.orderId);
    if (order) {
      await this.orderClient.updateOrderStatus(payment.orderId, "cancelled");

      for (const item of order.items) {
        const product = await this.productClient.getProduct(item.productId);
        if (product) {
          await this.productClient.updateStock(
            item.productId,
            product.stock + item.quantity
          );
        }
      }
    }

    return { success: true, data: payment };
  }
}
