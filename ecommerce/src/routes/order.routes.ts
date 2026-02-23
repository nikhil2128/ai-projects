import { Router, Response } from "express";
import { OrderService } from "../services/order.service";
import {
  AuthenticatedRequest,
  createAuthMiddleware,
} from "../middleware/auth.middleware";
import { AuthService } from "../services/auth.service";

export function createOrderRouter(
  orderService: OrderService,
  authService: AuthService
): Router {
  const router = Router();
  const auth = createAuthMiddleware(authService);

  router.post("/", auth, (req: AuthenticatedRequest, res: Response) => {
    const { shippingAddress } = req.body;
    const result = orderService.createOrder({
      userId: req.userId!,
      shippingAddress,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  });

  router.get("/", auth, (req: AuthenticatedRequest, res: Response) => {
    const result = orderService.getUserOrders(req.userId!);
    res.json(result.data);
  });

  router.get("/:id", auth, (req: AuthenticatedRequest, res: Response) => {
    const result = orderService.getOrder(req.params.id, req.userId!);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result.data);
  });

  router.post(
    "/:id/cancel",
    auth,
    (req: AuthenticatedRequest, res: Response) => {
      const result = orderService.cancelOrder(req.params.id, req.userId!);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json(result.data);
    }
  );

  return router;
}
