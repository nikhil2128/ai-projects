import { Router, Request, Response } from "express";
import { OrderService } from "./service";

export function createOrderRoutes(orderService: OrderService): Router {
  const router = Router();

  // ── Internal endpoints (service-to-service) ──────────────────────

  router.get("/internal/:id", async (req: Request, res: Response) => {
    const result = await orderService.getOrderInternal(req.params.id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.put("/internal/:id/status", async (req: Request, res: Response) => {
    const { status, paymentId } = req.body;
    const result = await orderService.updateOrderStatus(
      req.params.id,
      status,
      paymentId
    );
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  // ── Public endpoints (via gateway, x-user-id header required) ───

  router.post("/", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const { shippingAddress } = req.body;
    const result = await orderService.createOrder({
      userId,
      shippingAddress,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  router.get("/", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await orderService.getUserOrders(userId, page, limit);
    res.json(result.data);
  });

  router.get("/:id", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const result = await orderService.getOrder(req.params.id, userId);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.post("/:id/cancel", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const result = await orderService.cancelOrder(req.params.id, userId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  return router;
}
