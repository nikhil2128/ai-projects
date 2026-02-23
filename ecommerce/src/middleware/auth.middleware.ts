import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function createAuthMiddleware(authService: AuthService) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.slice(7);
    const userId = authService.validateToken(token);

    if (!userId) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = userId;
    next();
  };
}
