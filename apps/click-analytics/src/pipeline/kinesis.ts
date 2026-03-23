import {
  KinesisClient,
  PutRecordsCommand,
  type PutRecordsRequestEntry,
} from "@aws-sdk/client-kinesis";
import { config } from "../config";
import type { QueuedEvent } from "../types";

let client: KinesisClient | null = null;

function getKinesisClient(): KinesisClient {
  if (client) return client;

  client = new KinesisClient({
    region: config.pipeline.kinesis.region,
    endpoint: config.pipeline.kinesis.endpoint,
  });

  return client;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toRecord(event: QueuedEvent): PutRecordsRequestEntry {
  return {
    Data: Buffer.from(JSON.stringify(event)),
    PartitionKey: event.websiteId || event.sessionId || "default",
  };
}

export async function pushBatchToKinesis(
  events: QueuedEvent[]
): Promise<number> {
  if (events.length === 0) return 0;
  if (!config.pipeline.kinesis.streamName) {
    throw new Error("KINESIS_STREAM_NAME is required when ingestion mode is kinesis-s3-clickhouse");
  }

  const kinesis = getKinesisClient();
  const groups = chunk(events, config.pipeline.kinesis.maxRecordsPerRequest);
  let successCount = 0;

  for (const group of groups) {
    const response = await kinesis.send(
      new PutRecordsCommand({
        StreamName: config.pipeline.kinesis.streamName,
        Records: group.map(toRecord),
      })
    );

    const failed = response.FailedRecordCount ?? 0;
    successCount += group.length - failed;
  }

  return successCount;
}
