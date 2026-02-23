import { Cart } from "../../../shared/types";

export class CartStore {
  private carts: Map<string, Cart> = new Map();

  getCart(userId: string): Cart | undefined {
    return this.carts.get(userId);
  }

  saveCart(cart: Cart): void {
    this.carts.set(cart.userId, cart);
  }
}
