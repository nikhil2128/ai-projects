import { Router, Request, Response } from "express";
import { PaymentService } from "./service";

export function createPaymentRoutes(paymentService: PaymentService): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const { orderId, method } = req.body;
    const result = await paymentService.processPayment({
      orderId,
      userId,
      method,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  router.get("/:id", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const result = await paymentService.getPayment(req.params.id, userId);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.get("/order/:orderId", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const result = await paymentService.getPaymentByOrderId(
      req.params.orderId,
      userId
    );
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.post("/:id/refund", async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "User ID required" });
      return;
    }
    const result = await paymentService.refundPayment(req.params.id, userId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  return router;
}
