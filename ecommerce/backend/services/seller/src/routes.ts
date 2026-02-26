import { Router, Request, Response } from "express";
import { SellerService } from "./service";

export function createSellerRoutes(sellerService: SellerService): Router {
  const router = Router();

  function getSellerId(req: Request): string | null {
    const userId = req.headers["x-user-id"] as string;
    const role = req.headers["x-user-role"] as string;
    if (!userId || role !== "seller") return null;
    return userId;
  }

  router.get("/dashboard", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const result = await sellerService.getDashboard(sellerId);
    res.json(result.data);
  });

  router.get("/products", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await sellerService.getProducts(sellerId, page, limit);
    res.json(result.data);
  });

  router.post("/products", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const result = await sellerService.createProduct(sellerId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  router.post("/products/batch", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const { products } = req.body;
    const result = await sellerService.batchCreateProducts(sellerId, products);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  router.post("/products/batch-upload", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const { csvData, fileName } = req.body;
    if (!csvData || typeof csvData !== "string") {
      res.status(400).json({ error: "csvData is required" });
      return;
    }
    const result = await sellerService.startBatchUpload(sellerId, csvData, fileName ?? "upload.csv");
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(202).json(result.data);
  });

  router.get("/products/batch-jobs", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const result = await sellerService.getRecentBatchJobs(sellerId);
    res.json(result.data);
  });

  router.get("/products/batch-jobs/:id", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const result = await sellerService.getBatchJobStatus(sellerId, req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.put("/products/:id", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const result = await sellerService.updateProduct(sellerId, req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.delete("/products/:id", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const result = await sellerService.deleteProduct(sellerId, req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  router.get("/sales", async (req: Request, res: Response) => {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return;
    }
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await sellerService.getSales(sellerId, page, limit);
    res.json(result.data);
  });

  return router;
}
