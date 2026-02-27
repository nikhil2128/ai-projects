import serverlessExpress from "@vendia/serverless-express";
import express, { Request, Response, NextFunction } from "express";
import { createPool } from "../shared/database";
import { createApp } from "../services/product/src/app";
import { injectAuthorizerContext } from "./middleware";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";

let cachedHandler: ReturnType<typeof serverlessExpress>;

async function bootstrap() {
  const pool = createPool({ max: 2, idleTimeoutMillis: 60_000 });

  const { app: productApp } = createApp(pool);

  const app = express();
  app.use(injectAuthorizerContext);
  app.use("/api/products", productApp);

  // The product app mounts favorite routes at /favorites internally,
  // so prepend /favorites before forwarding to match the sub-router.
  app.use("/api/favorites", (req: Request, res: Response, next: NextFunction) => {
    req.url = `/favorites${req.url}`;
    productApp(req, res, next);
  });

  cachedHandler = serverlessExpress({ app });
}

export async function lambdaHandler(event: APIGatewayProxyEventV2, context: Context) {
  if (!cachedHandler) await bootstrap();
  return cachedHandler(event, context);
}
