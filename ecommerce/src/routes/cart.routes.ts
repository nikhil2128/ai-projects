import { Router, Response } from "express";
import { CartService } from "../services/cart.service";
import {
  AuthenticatedRequest,
  createAuthMiddleware,
} from "../middleware/auth.middleware";
import { AuthService } from "../services/auth.service";

export function createCartRouter(
  cartService: CartService,
  authService: AuthService
): Router {
  const router = Router();
  const auth = createAuthMiddleware(authService);

  router.get("/", auth, (req: AuthenticatedRequest, res: Response) => {
    const result = cartService.getCart(req.userId!);
    res.json(result.data);
  });

  router.post("/items", auth, (req: AuthenticatedRequest, res: Response) => {
    const { productId, quantity } = req.body;
    const result = cartService.addToCart(req.userId!, productId, quantity);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.put(
    "/items/:productId",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      const { quantity } = req.body;
      const result = cartService.updateCartItemQuantity(
        req.userId!,
        req.params.productId,
        quantity
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json(result.data);
    }
  );

  router.delete(
    "/items/:productId",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      const result = cartService.removeFromCart(
        req.userId!,
        req.params.productId
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json(result.data);
    }
  );

  router.delete("/", auth, (req: AuthenticatedRequest, res: Response) => {
    const result = cartService.clearCart(req.userId!);
    res.json(result.data);
  });

  return router;
}
