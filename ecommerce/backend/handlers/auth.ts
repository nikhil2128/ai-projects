import serverlessExpress from "@vendia/serverless-express";
import express from "express";
import { createPool } from "../shared/database";
import { createApp } from "../services/auth/src/app";
import { injectAuthorizerContext } from "./middleware";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";

let cachedHandler: ReturnType<typeof serverlessExpress>;

async function bootstrap() {
  const pool = createPool({ max: 2, idleTimeoutMillis: 60_000 });

  const { app: authApp } = createApp(pool);

  const app = express();
  app.use(injectAuthorizerContext);
  app.use("/api/auth", authApp);

  cachedHandler = serverlessExpress({ app });
}

export async function lambdaHandler(event: APIGatewayProxyEventV2, context: Context) {
  if (!cachedHandler) await bootstrap();
  return cachedHandler(event, context);
}
