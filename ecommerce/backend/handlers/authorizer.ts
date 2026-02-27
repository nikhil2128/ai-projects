import { Pool } from "pg";
import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult,
} from "aws-lambda";

interface AuthContext {
  userId: string;
  role: string;
}

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME ?? "ecommerce",
      user: process.env.DB_USER ?? "ecommerce",
      password: process.env.DB_PASSWORD,
      max: 1,
      idleTimeoutMillis: 120_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export async function lambdaHandler(
  event: APIGatewayRequestAuthorizerEventV2
): Promise<APIGatewaySimpleAuthorizerWithContextResult<AuthContext>> {
  const unauthorized: APIGatewaySimpleAuthorizerWithContextResult<AuthContext> = {
    isAuthorized: false,
    context: { userId: "", role: "" },
  };

  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized;
  }

  const token = authHeader.slice(7);
  if (!token) return unauthorized;

  try {
    const db = getPool();
    const result = await db.query(
      `SELECT t.user_id, u.role
       FROM auth_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token = $1`,
      [token]
    );

    if (result.rows.length === 0) return unauthorized;

    return {
      isAuthorized: true,
      context: {
        userId: result.rows[0].user_id,
        role: result.rows[0].role,
      },
    };
  } catch (err) {
    console.error("Authorizer error:", err);
    return unauthorized;
  }
}
