import { Router, Request, Response } from "express";
import { FavoriteStore } from "./favoriteStore";
import { ProductStore } from "./store";

export function createFavoriteRoutes(
  favoriteStore: FavoriteStore,
  productStore: ProductStore
): Router {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const productIds = await favoriteStore.getProductIds(userId);
    res.json({ productIds });
  });

  router.get("/products", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const productIds = await favoriteStore.getProductIds(userId);
    const products = [];
    for (const id of productIds) {
      const p = await productStore.findProductById(id);
      if (p) products.push(p);
    }
    res.json(products);
  });

  router.post("/check", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) {
      res.status(400).json({ error: "productIds array required" });
      return;
    }
    const favorited = await favoriteStore.checkBatch(
      userId,
      productIds.slice(0, 100)
    );
    res.json({ favorited });
  });

  router.post("/:productId", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    await favoriteStore.add(userId, req.params.productId);
    res.json({ success: true });
  });

  router.delete("/:productId", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    await favoriteStore.remove(userId, req.params.productId);
    res.json({ success: true });
  });

  return router;
}
