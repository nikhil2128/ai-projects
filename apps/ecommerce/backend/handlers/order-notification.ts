import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";
import { createPool } from "../shared/database";
import { NotificationService } from "../services/notification/src/service";
import { OrderPlacedEvent } from "../shared/types";

let service: NotificationService;

function getService(): NotificationService {
  if (!service) {
    const pool = createPool({ max: 2, idleTimeoutMillis: 60_000 });
    service = new NotificationService(pool);
  }
  return service;
}

export async function lambdaHandler(event: SQSEvent): Promise<SQSBatchResponse> {
  const failures: SQSBatchItemFailure[] = [];
  const svc = getService();

  for (const record of event.Records) {
    try {
      const snsEnvelope = JSON.parse(record.body);
      const orderEvent: OrderPlacedEvent = JSON.parse(snsEnvelope.Message);
      await svc.handleOrderPlaced(orderEvent);
    } catch (err) {
      console.error(
        `Failed to process notification for record ${record.messageId}:`,
        err
      );
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
}
