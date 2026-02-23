import { v4 as uuidv4 } from "uuid";
import { Payment, PaymentInput, ServiceResult } from "../types";
import { InMemoryStore } from "../store/in-memory-store";

export class PaymentService {
  constructor(private store: InMemoryStore) {}

  processPayment(input: PaymentInput): ServiceResult<Payment> {
    const order = this.store.findOrderById(input.orderId);
    if (!order || order.userId !== input.userId) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "cancelled") {
      return {
        success: false,
        error: `Cannot pay for a cancelled order`,
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

    order.status = "confirmed";
    order.paymentId = payment.id;
    order.updatedAt = new Date();
    this.store.updateOrder(order);

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

  refundPayment(paymentId: string, userId: string): ServiceResult<Payment> {
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

    const order = this.store.findOrderById(payment.orderId);
    if (order) {
      order.status = "cancelled";
      order.updatedAt = new Date();
      this.store.updateOrder(order);

      for (const item of order.items) {
        const product = this.store.findProductById(item.productId);
        if (product) {
          product.stock += item.quantity;
          this.store.updateProduct(product);
        }
      }
    }

    return { success: true, data: payment };
  }
}
