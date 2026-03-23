-- ClickHouse objects for S3-based ingestion.
-- Assumes Firehose writes gzipped JSONEachRow files to S3 where each row
-- is the same payload produced by the worker (QueuedEvent in camelCase).
--
-- Replace <bucket>, <region>, and path pattern before running.
-- If your database name is not click_analytics, update the TO target.

CREATE TABLE IF NOT EXISTS click_events_raw_s3_queue
(
  websiteId String,
  sessionId String,
  pageUrl String,
  elementTag String,
  elementId Nullable(String),
  elementClass Nullable(String),
  elementText Nullable(String),
  xPos UInt32,
  yPos UInt32,
  viewportWidth UInt32,
  viewportHeight UInt32,
  referrer Nullable(String),
  userAgent Nullable(String),
  ip Nullable(String),
  metadata Nullable(String),
  receivedAt String
)
ENGINE = S3Queue(
  'https://<bucket>.s3.<region>.amazonaws.com/click-events/year=*/month=*/day=*/*.json.gz',
  'JSONEachRow',
  'gzip'
)
SETTINGS
  mode = 'unordered',
  after_processing = 'keep',
  keeper_path = '/click-analytics/s3queue/v1';

CREATE MATERIALIZED VIEW IF NOT EXISTS click_events_raw_s3_mv
TO click_analytics.click_events
AS
SELECT
  websiteId AS website_id,
  sessionId AS session_id,
  pageUrl AS page_url,
  elementTag AS element_tag,
  elementId AS element_id,
  elementClass AS element_class,
  elementText AS element_text,
  xPos AS x_pos,
  yPos AS y_pos,
  viewportWidth AS viewport_w,
  viewportHeight AS viewport_h,
  referrer,
  userAgent AS user_agent,
  ip,
  metadata,
  parseDateTime64BestEffort(receivedAt) AS event_time
FROM click_events_raw_s3_queue;
