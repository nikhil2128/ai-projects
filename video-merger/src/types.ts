/** Represents a single video chunk stored on S3 */
export interface VideoChunk {
  /** S3 object key */
  key: string;
  /** Parsed timestamp (ms since epoch) from the chunk filename */
  timestampMs: number;
  /** Duration of the chunk in seconds (obtained via ffprobe) */
  durationSec: number;
  /** Local file path after downloading from S3 */
  localPath: string;
}

/** A segment in the final merge timeline — either a real chunk or a generated gap filler */
export interface TimelineSegment {
  type: 'chunk' | 'gap';
  /** Local file path to the video file (real chunk or generated black video) */
  filePath: string;
  /** Start time in the final video (seconds from beginning) */
  startSec: number;
  /** Duration of this segment in seconds */
  durationSec: number;
}

/** Video properties extracted from the first chunk (used for generating matching black segments) */
export interface VideoProperties {
  width: number;
  height: number;
  frameRate: number;
  videoCodec: string;
  audioCodec: string | null;
  audioBitrate: string | null;
  audioSampleRate: number | null;
  audioChannels: number | null;
}

/** Request payload for the merge endpoint */
export interface MergeRequest {
  /** S3 bucket name */
  bucket: string;
  /** S3 prefix where video chunks are stored (e.g., "recordings/session-123/") */
  chunkPrefix: string;
  /** S3 key for the output merged video */
  outputKey: string;
}

/** Progress status for a merge job */
export interface MergeJob {
  id: string;
  status: 'queued' | 'downloading' | 'analyzing' | 'merging' | 'uploading' | 'completed' | 'failed';
  progress: number;
  message: string;
  outputKey?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
