import { describe, it, expect } from 'vitest';
import {
  parseTimestampFromFilename,
  sortChunksByTimestamp,
  buildTimeline,
} from '../services/chunk.service';
import { VideoChunk } from '../types';

describe('parseTimestampFromFilename', () => {
  it('should parse Unix millisecond timestamps', () => {
    const ts = parseTimestampFromFilename('1708185600000.mp4');
    expect(ts).toBe(1708185600000);
  });

  it('should parse Unix second timestamps and convert to ms', () => {
    const ts = parseTimestampFromFilename('1708185600.mp4');
    expect(ts).toBe(1708185600000);
  });

  it('should parse ISO 8601 filenames', () => {
    const ts = parseTimestampFromFilename('2024-02-17T12:00:00Z.mp4');
    expect(ts).toBe(new Date('2024-02-17T12:00:00Z').getTime());
  });

  it('should parse ISO 8601 with milliseconds', () => {
    const ts = parseTimestampFromFilename('2024-02-17T12:00:00.000Z.mp4');
    expect(ts).toBe(new Date('2024-02-17T12:00:00.000Z').getTime());
  });

  it('should handle full S3 key paths', () => {
    const ts = parseTimestampFromFilename(
      'recordings/session-123/1708185600000.mp4'
    );
    expect(ts).toBe(1708185600000);
  });

  it('should handle .webm extension', () => {
    const ts = parseTimestampFromFilename('1708185600000.webm');
    expect(ts).toBe(1708185600000);
  });

  it('should throw on unparseable filenames', () => {
    expect(() => parseTimestampFromFilename('random-name.mp4')).toThrow(
      'Unable to parse timestamp'
    );
  });

  it('should throw on empty basename', () => {
    expect(() => parseTimestampFromFilename('.mp4')).toThrow(
      'Unable to parse timestamp'
    );
  });
});

describe('sortChunksByTimestamp', () => {
  it('should sort chunks chronologically', () => {
    const keys = [
      'prefix/1708185630000.mp4',
      'prefix/1708185600000.mp4',
      'prefix/1708185610000.mp4',
    ];

    const sorted = sortChunksByTimestamp(keys);

    expect(sorted).toHaveLength(3);
    expect(sorted[0].timestampMs).toBe(1708185600000);
    expect(sorted[1].timestampMs).toBe(1708185610000);
    expect(sorted[2].timestampMs).toBe(1708185630000);
  });

  it('should handle a single chunk', () => {
    const sorted = sortChunksByTimestamp(['prefix/1708185600000.mp4']);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].timestampMs).toBe(1708185600000);
  });

  it('should handle empty array', () => {
    const sorted = sortChunksByTimestamp([]);
    expect(sorted).toHaveLength(0);
  });
});

describe('buildTimeline', () => {
  function makeChunk(
    timestampMs: number,
    durationSec: number,
    index: number
  ): VideoChunk {
    return {
      key: `prefix/${timestampMs}.mp4`,
      timestampMs,
      durationSec,
      localPath: `/tmp/chunk_${index}.mp4`,
    };
  }

  it('should build timeline with no gaps', () => {
    const chunks: VideoChunk[] = [
      makeChunk(1000000, 10, 0), // 0-10s
      makeChunk(1010000, 10, 1), // 10-20s (starts exactly when prev ends)
      makeChunk(1020000, 10, 2), // 20-30s
    ];

    const timeline = buildTimeline(chunks);

    expect(timeline).toHaveLength(3);
    expect(timeline.every((s) => s.type === 'chunk')).toBe(true);
  });

  it('should detect gaps between chunks', () => {
    const chunks: VideoChunk[] = [
      makeChunk(1000000, 10, 0), // 0-10s
      makeChunk(1020000, 10, 1), // 20-30s (10s gap from 10-20s)
    ];

    const timeline = buildTimeline(chunks);

    expect(timeline).toHaveLength(3);
    expect(timeline[0].type).toBe('chunk');
    expect(timeline[1].type).toBe('gap');
    expect(timeline[1].durationSec).toBeCloseTo(10, 1);
    expect(timeline[1].startSec).toBeCloseTo(10, 1);
    expect(timeline[2].type).toBe('chunk');
  });

  it('should ignore small gaps below threshold', () => {
    const chunks: VideoChunk[] = [
      makeChunk(1000000, 10, 0), // 0-10s
      makeChunk(1010200, 10, 1), // 10.2s start (0.2s gap — below 0.5s default threshold)
    ];

    const timeline = buildTimeline(chunks);

    expect(timeline).toHaveLength(2);
    expect(timeline.every((s) => s.type === 'chunk')).toBe(true);
  });

  it('should handle multiple gaps', () => {
    const chunks: VideoChunk[] = [
      makeChunk(1000000, 5, 0), // 0-5s
      makeChunk(1010000, 5, 1), // 10-15s (5s gap)
      makeChunk(1025000, 5, 2), // 25-30s (10s gap)
    ];

    const timeline = buildTimeline(chunks);

    const gaps = timeline.filter((s) => s.type === 'gap');
    expect(gaps).toHaveLength(2);
    expect(gaps[0].durationSec).toBeCloseTo(5, 1);
    expect(gaps[1].durationSec).toBeCloseTo(10, 1);
  });

  it('should return empty timeline for empty chunks', () => {
    const timeline = buildTimeline([]);
    expect(timeline).toHaveLength(0);
  });

  it('should handle single chunk', () => {
    const chunks: VideoChunk[] = [makeChunk(1000000, 10, 0)];

    const timeline = buildTimeline(chunks);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('chunk');
    expect(timeline[0].startSec).toBe(0);
    expect(timeline[0].durationSec).toBe(10);
  });

  it('should enforce max duration by stopping at the limit', () => {
    // With default 60-min max, create chunks that exceed it
    const chunks: VideoChunk[] = [
      makeChunk(0, 3500, 0), // 0-3500s (~58.3 min)
      makeChunk(3500000, 300, 1), // 3500-3800s (would exceed 3600s)
    ];

    const timeline = buildTimeline(chunks);

    // Second chunk starts at 3500s which is within 3600s max,
    // but its duration should be clamped to 100s (3600-3500)
    expect(timeline).toHaveLength(2);
    expect(timeline[1].durationSec).toBeCloseTo(100, 1);
  });

  it('should skip chunks that start beyond max duration', () => {
    const chunks: VideoChunk[] = [
      makeChunk(0, 10, 0), // 0-10s
      makeChunk(3700000, 10, 1), // 3700s — beyond 3600s max
    ];

    const timeline = buildTimeline(chunks);

    // Only first chunk should be included (gap detection stops)
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('chunk');
  });
});
