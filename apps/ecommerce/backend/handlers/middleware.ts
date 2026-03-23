import { Request, Response, NextFunction } from "express";

/**
 * Bridges API Gateway Lambda authorizer context into Express headers.
 *
 * The Lambda authorizer returns { userId, role } in the authorizer context.
 * Serverless-express exposes the original event at req.apiGateway.event.
 * This middleware copies those values into the x-user-id / x-user-role headers
 * so the existing route handlers continue to work without modification.
 */
export function injectAuthorizerContext(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const event = (req as any).apiGateway?.event;
  const authorizer =
    event?.requestContext?.authorizer?.lambda ??
    event?.requestContext?.authorizer;

  if (authorizer?.userId) {
    req.headers["x-user-id"] = authorizer.userId;
  }
  if (authorizer?.role) {
    req.headers["x-user-role"] = authorizer.role;
  }

  next();
}
