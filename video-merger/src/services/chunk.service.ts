import path from 'path';
import { VideoChunk, TimelineSegment } from '../types';
import { config } from '../config';

/**
 * Parse a timestamp from a chunk filename.
 *
 * Supports:
 *   - Unix milliseconds: "1708185600000.mp4"
 *   - Unix seconds: "1708185600.mp4"
 *   - ISO 8601: "2024-02-17T12:00:00Z.mp4" or "2024-02-17T12:00:00.000Z.mp4"
 *
 * Returns timestamp in milliseconds since epoch.
 */
export function parseTimestampFromFilename(filename: string): number {
  const basename = path.basename(filename, path.extname(filename));

  // Try numeric timestamp first (ms or seconds)
  const numericValue = Number(basename);
  if (!isNaN(numericValue) && isFinite(numericValue)) {
    // Heuristic: if value is > 1e12, treat as milliseconds; otherwise seconds
    if (numericValue > 1e12) {
      return numericValue;
    }
    return numericValue * 1000;
  }

  // Try ISO 8601 date string
  const date = new Date(basename);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  throw new Error(
    `Unable to parse timestamp from filename: "${filename}". ` +
      'Expected Unix timestamp (ms or s) or ISO 8601 format.'
  );
}

/**
 * Sort chunk keys by their parsed timestamp and return VideoChunk stubs
 * (without duration or localPath — those are filled in after download + probe).
 */
export function sortChunksByTimestamp(
  keys: string[]
): Array<{ key: string; timestampMs: number }> {
  return keys
    .map((key) => ({
      key,
      timestampMs: parseTimestampFromFilename(key),
    }))
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

/**
 * Build the full timeline by interleaving real chunks with gap-filler segments.
 *
 * For each consecutive pair of chunks:
 *   expectedNextStart = chunk[i].timestamp + chunk[i].duration
 *   actualNextStart   = chunk[i+1].timestamp
 *   gap               = actualNextStart - expectedNextStart
 *
 * If gap > threshold (0.5s), insert a black video segment.
 */
export function buildTimeline(
  chunks: VideoChunk[],
  gapThresholdSec: number = 0.5
): TimelineSegment[] {
  if (chunks.length === 0) return [];

  const maxDurationSec = config.processing.maxDurationMinutes * 60;
  const timelineOriginMs = chunks[0].timestampMs;
  const segments: TimelineSegment[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const startSec = (chunk.timestampMs - timelineOriginMs) / 1000;

    // Enforce max duration: skip chunks that start beyond the limit
    if (startSec >= maxDurationSec) break;

    // Clamp chunk duration if it would exceed max
    const effectiveDuration = Math.min(
      chunk.durationSec,
      maxDurationSec - startSec
    );

    // Check if there's a gap before this chunk (for i > 0)
    if (i > 0) {
      const prevChunk = chunks[i - 1];
      const prevEndMs =
        prevChunk.timestampMs + prevChunk.durationSec * 1000;
      const gapMs = chunk.timestampMs - prevEndMs;
      const gapSec = gapMs / 1000;

      if (gapSec > gapThresholdSec) {
        const gapStartSec = (prevEndMs - timelineOriginMs) / 1000;
        const effectiveGapDuration = Math.min(
          gapSec,
          maxDurationSec - gapStartSec
        );

        if (effectiveGapDuration > 0) {
          segments.push({
            type: 'gap',
            filePath: '', // filled later by video service
            startSec: gapStartSec,
            durationSec: effectiveGapDuration,
          });
        }
      }
    }

    segments.push({
      type: 'chunk',
      filePath: chunk.localPath,
      startSec,
      durationSec: effectiveDuration,
    });
  }

  return segments;
}
