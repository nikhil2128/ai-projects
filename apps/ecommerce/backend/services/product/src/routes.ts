import { Router, Request, Response } from "express";
import { ProductService } from "./service";

export function createProductRoutes(productService: ProductService): Router {
  const router = Router();

  router.get("/internal/:id", async (req: Request, res: Response) => {
    const result = await productService.getProductById(req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.post("/internal/batch", async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids array is required" });
      return;
    }
    if (ids.length > 100) {
      res.status(400).json({ error: "Maximum 100 ids per batch request" });
      return;
    }
    const result = await productService.getProductsByIds(ids);
    res.json(result.data);
  });

  router.put("/internal/stock/:id", async (req: Request, res: Response) => {
    const { stock } = req.body;
    const result = await productService.updateStock(req.params.id, stock);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.get("/", async (req: Request, res: Response) => {
    const { keyword, category, minPrice, maxPrice, page, limit } = req.query;
    const result = await productService.searchProducts({
      keyword: keyword as string | undefined,
      category: category as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result.data);
  });

  router.get("/:id", async (req: Request, res: Response) => {
    const result = await productService.getProductById(req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.post("/", async (req: Request, res: Response) => {
    const result = await productService.createProduct(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  return router;
}
