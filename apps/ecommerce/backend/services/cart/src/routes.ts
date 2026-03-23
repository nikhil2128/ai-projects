import { Router, Request, Response } from "express";
import { CartService } from "./service";

export function createCartRoutes(cartService: CartService): Router {
  const router = Router();

  // ── Internal endpoints (service-to-service) ──────────────────────

  router.get("/internal/:userId", async (req: Request, res: Response) => {
    const result = await cartService.getCart(req.params.userId);
    res.json(result.data);
  });

  router.delete("/internal/:userId", async (req: Request, res: Response) => {
    const result = await cartService.clearCart(req.params.userId);
    res.json(result.data);
  });

  // ── Public endpoints (via gateway, x-user-id header required) ───

  router.get("/", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const result = await cartService.getCart(userId);
    res.json(result.data);
  });

  router.post("/items", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const { productId, quantity } = req.body;
    const result = await cartService.addToCart(userId, productId, quantity);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.put("/items/:productId", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const { quantity } = req.body;
    const result = await cartService.updateCartItemQuantity(
      userId,
      req.params.productId,
      quantity
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.delete("/items/:productId", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const result = await cartService.removeFromCart(userId, req.params.productId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.delete("/", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const result = await cartService.clearCart(userId);
    res.json(result.data);
  });

  return router;
}
