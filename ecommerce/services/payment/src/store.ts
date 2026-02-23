import { Payment } from "../../../shared/types";

export class PaymentStore {
  private payments: Map<string, Payment> = new Map();

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
