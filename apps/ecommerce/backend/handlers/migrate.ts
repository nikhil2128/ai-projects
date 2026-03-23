import { createPool } from "../shared/database";
import { runMigrations } from "../shared/migrations";
import type { CloudFormationCustomResourceEvent, Context } from "aws-lambda";

/**
 * CloudFormation Custom Resource handler that runs database migrations
 * during stack create/update. Sends a response back to CloudFormation
 * to signal success or failure.
 */
export async function lambdaHandler(
  event: CloudFormationCustomResourceEvent,
  context: Context
): Promise<void> {
  const responseUrl = event.ResponseURL;
  const physicalResourceId = context.logStreamName;

  try {
    if (event.RequestType === "Delete") {
      await sendResponse(responseUrl, {
        Status: "SUCCESS",
        PhysicalResourceId: physicalResourceId,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
      });
      return;
    }

    console.log("Running database migrations...");
    const pool = createPool({ max: 1, connectionTimeoutMillis: 30_000 });

    try {
      await runMigrations(pool);
      console.log("Migrations completed successfully");
    } finally {
      await pool.end();
    }

    await sendResponse(responseUrl, {
      Status: "SUCCESS",
      PhysicalResourceId: physicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
    });
  } catch (err) {
    console.error("Migration failed:", err);
    await sendResponse(responseUrl, {
      Status: "FAILED",
      Reason: err instanceof Error ? err.message : "Migration failed",
      PhysicalResourceId: physicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
    });
  }
}

async function sendResponse(url: string, body: Record<string, unknown>): Promise<void> {
  const payload = JSON.stringify(body);
  await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "", "Content-Length": String(payload.length) },
    body: payload,
  });
}
