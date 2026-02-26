import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { SellerService } from "./service";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(fn: AsyncHandler): AsyncHandler {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      console.error(`Unhandled error in ${req.method} ${req.path}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
}

export function createSellerRoutes(sellerService: SellerService): Router {
  const router = Router();

  function getSellerId(req: Request): string | null {
    const userId = req.headers["x-user-id"] as string;
    const role = req.headers["x-user-role"] as string;
    if (!userId || role !== "seller") return null;
    return userId;
  }

  function requireSeller(req: Request, res: Response): string | null {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      res.status(403).json({ error: "Seller access required" });
      return null;
    }
    return sellerId;
  }

  // ── Dashboard ──────────────────────────────────────────────────

  router.get("/dashboard", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.getDashboard(sellerId);
    res.json(result.data);
  }));

  // ── Products CRUD ──────────────────────────────────────────────

  router.get("/products", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await sellerService.getProducts(sellerId, page, limit);
    res.json(result.data);
  }));

  router.post("/products", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.createProduct(sellerId, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  }));

  router.post("/products/batch", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const { products } = req.body;
    const result = await sellerService.batchCreateProducts(sellerId, products);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  }));

  // ── Batch upload (CSV) ─────────────────────────────────────────

  router.post("/products/batch-upload", upload.single("file"), asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "CSV file is required" });
      return;
    }
    const csvData = file.buffer.toString("utf-8");
    const fileName = file.originalname || "upload.csv";
    const result = await sellerService.startBatchUpload(sellerId, csvData, fileName);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(202).json(result.data);
  }));

  router.post("/products/batch-jobs/:id/retry", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.retryBatchJob(sellerId, req.params.id);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(202).json(result.data);
  }));

  router.get("/products/batch-jobs", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.getRecentBatchJobs(sellerId);
    res.json(result.data);
  }));

  router.get("/products/batch-jobs/:id", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.getBatchJobStatus(sellerId, req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  }));

  // ── Product update/delete ──────────────────────────────────────

  router.put("/products/:id", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.updateProduct(sellerId, req.params.id, req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  }));

  router.delete("/products/:id", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.deleteProduct(sellerId, req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  }));

  // ── Sales ──────────────────────────────────────────────────────

  router.get("/sales", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await sellerService.getSales(sellerId, page, limit);
    res.json(result.data);
  }));

  // ── Notifications ──────────────────────────────────────────────

  router.get("/notifications", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.getNotifications(sellerId);
    res.json(result.data);
  }));

  router.get("/notifications/unread-count", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.getUnreadCount(sellerId);
    res.json(result.data);
  }));

  router.post("/notifications/:id/read", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    const result = await sellerService.markNotificationRead(sellerId, req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  }));

  router.post("/notifications/read-all", asyncHandler(async (req, res) => {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return;
    await sellerService.markAllNotificationsRead(sellerId);
    res.json({ success: true });
  }));

  return router;
}
