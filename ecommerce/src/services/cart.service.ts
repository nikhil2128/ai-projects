import { v4 as uuidv4 } from "uuid";
import { Cart, ServiceResult } from "../types";
import { InMemoryStore } from "../store/in-memory-store";

export class CartService {
  constructor(private store: InMemoryStore) {}

  addToCart(
    userId: string,
    productId: string,
    quantity: number
  ): ServiceResult<Cart> {
    if (quantity < 1) {
      return { success: false, error: "Quantity must be at least 1" };
    }

    const product = this.store.findProductById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const cart = this.getOrCreateCart(userId);
    const existingItem = cart.items.find((i) => i.productId === productId);
    const currentQty = existingItem ? existingItem.quantity : 0;

    if (currentQty + quantity > product.stock) {
      return {
        success: false,
        error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${currentQty + quantity}`,
      };
    }

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
      });
    }

    cart.updatedAt = new Date();
    this.store.saveCart(cart);
    return { success: true, data: cart };
  }

  removeFromCart(userId: string, productId: string): ServiceResult<Cart> {
    const cart = this.getOrCreateCart(userId);
    const idx = cart.items.findIndex((i) => i.productId === productId);

    if (idx === -1) {
      return { success: false, error: "Item not found in cart" };
    }

    cart.items.splice(idx, 1);
    cart.updatedAt = new Date();
    this.store.saveCart(cart);
    return { success: true, data: cart };
  }

  updateCartItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): ServiceResult<Cart> {
    if (quantity === 0) {
      return this.removeFromCart(userId, productId);
    }

    const product = this.store.findProductById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (quantity > product.stock) {
      return {
        success: false,
        error: `Insufficient stock for "${product.name}". Available: ${product.stock}`,
      };
    }

    const cart = this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.productId === productId);

    if (!item) {
      return { success: false, error: "Item not found in cart" };
    }

    item.quantity = quantity;
    cart.updatedAt = new Date();
    this.store.saveCart(cart);
    return { success: true, data: cart };
  }

  getCart(userId: string): ServiceResult<Cart> {
    const cart = this.getOrCreateCart(userId);
    return { success: true, data: cart };
  }

  clearCart(userId: string): ServiceResult<Cart> {
    const cart = this.getOrCreateCart(userId);
    cart.items = [];
    cart.updatedAt = new Date();
    this.store.saveCart(cart);
    return { success: true, data: cart };
  }

  getCartTotal(userId: string): number {
    const cart = this.getOrCreateCart(userId);
    return cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  private getOrCreateCart(userId: string): Cart {
    let cart = this.store.getCart(userId);
    if (!cart) {
      cart = {
        id: uuidv4(),
        userId,
        items: [],
        updatedAt: new Date(),
      };
      this.store.saveCart(cart);
    }
    return cart;
  }
}
