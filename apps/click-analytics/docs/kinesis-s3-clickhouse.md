# Kinesis -> S3 -> ClickHouse pipeline

This is the recommended production ingestion path for very high event volume:

1. Worker publishes click batches to Amazon Kinesis Data Streams.
2. Amazon Data Firehose reads Kinesis and writes compressed JSON files to S3.
3. ClickHouse `S3Queue` reads new S3 objects and materialized view inserts into `click_events`.

## Application configuration

Set these values in the worker environment:

- `INGESTION_MODE=kinesis-s3-clickhouse`
- `AWS_REGION=<region>`
- `KINESIS_STREAM_NAME=<stream-name>`
- `KINESIS_ENDPOINT=` (optional for localstack/testing)

In this mode, Redis stream entries are ACKed only after all records are accepted by Kinesis.

## AWS setup

### 1) Kinesis Data Stream

- Create a stream (on-demand is usually best for bursty traffic).
- Name it to match `KINESIS_STREAM_NAME`.

### 2) Firehose delivery stream

- Source: the Kinesis stream above.
- Destination: S3 bucket.
- Format: keep raw JSON (no transform needed).
- Compression: `GZIP`.
- Prefix suggestion:
  - `click-events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/`

### 3) ClickHouse ingestion objects

Run `docs/clickhouse-s3-pipeline.sql` after replacing placeholders:

- `<bucket>`
- `<region>`
- S3 key prefix/glob

## Operational notes

- Keep Firehose buffering small (for near-real-time analytics) or larger (for lower cost).
- Use S3 lifecycle rules to transition old objects to cheaper tiers.
- Keep ClickHouse TTL aligned with retention requirements.
