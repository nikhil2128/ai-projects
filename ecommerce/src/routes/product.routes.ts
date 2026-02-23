import { Router, Request, Response } from "express";
import { ProductService } from "../services/product.service";

export function createProductRouter(productService: ProductService): Router {
  const router = Router();

  router.get("/", (req: Request, res: Response) => {
    const { keyword, category, minPrice, maxPrice } = req.query;
    const result = productService.searchProducts({
      keyword: keyword as string | undefined,
      category: category as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    res.json(result.data);
  });

  router.get("/:id", (req: Request, res: Response) => {
    const result = productService.getProductById(req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.post("/", (req: Request, res: Response) => {
    const result = productService.createProduct(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  return router;
}
