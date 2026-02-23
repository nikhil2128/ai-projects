import { Router, Response } from "express";
import { PaymentService } from "../services/payment.service";
import {
  AuthenticatedRequest,
  createAuthMiddleware,
} from "../middleware/auth.middleware";
import { AuthService } from "../services/auth.service";

export function createPaymentRouter(
  paymentService: PaymentService,
  authService: AuthService
): Router {
  const router = Router();
  const auth = createAuthMiddleware(authService);

  router.post("/", auth, (req: AuthenticatedRequest, res: Response) => {
    const { orderId, method } = req.body;
    const result = paymentService.processPayment({
      orderId,
      userId: req.userId!,
      method,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  router.get("/:id", auth, (req: AuthenticatedRequest, res: Response) => {
    const result = paymentService.getPayment(req.params.id, req.userId!);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.get(
    "/order/:orderId",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      const result = paymentService.getPaymentByOrderId(
        req.params.orderId,
        req.userId!
      );
      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }
      res.json(result.data);
    }
  );

  router.post(
    "/:id/refund",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      const result = paymentService.refundPayment(req.params.id, req.userId!);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json(result.data);
    }
  );

  return router;
}
