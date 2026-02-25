import { Router, Request, Response } from "express";
import { AuthService } from "./service";

export function createAuthRoutes(authService: AuthService): Router {
  const router = Router();

  router.post("/register", async (req: Request, res: Response) => {
    const { email, name, password } = req.body;
    const result = await authService.register({ email, name, password });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);
  });

  router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    if (!result.success) {
      res.status(401).json({ error: result.error });
      return;
    }

    res.json(result.data);
  });

  router.post("/validate-token", async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = await authService.validateToken(token);

    if (!userId) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    res.json({ userId });
  });

  return router;
}
