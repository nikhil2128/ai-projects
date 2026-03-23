import path from 'path';
import { rm, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { ChunkInfo, MergeJob, MergeRequest, VideoChunk, VideoProperties } from '../types';
import { pMap } from '../utils';
import { listChunkKeys, downloadFile, uploadFile } from './s3.service';
import { sortChunksByTimestamp, buildTimeline } from './chunk.service';
import { probeChunkInfo, mergeSegments } from './video.service';

/** In-memory store for merge job status */
const jobs = new Map<string, MergeJob>();

export function getJob(id: string): MergeJob | undefined {
  return jobs.get(id);
}

export function getAllJobs(): MergeJob[] {
  return Array.from(jobs.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

function updateJob(id: string, updates: Partial<MergeJob>): void {
  const job = jobs.get(id);
  if (job) {
    Object.assign(job, updates, { updatedAt: new Date() });
  }
}

/**
 * Start an asynchronous merge job. Returns the job ID immediately;
 * the caller can poll getJob() for status updates.
 */
export function startMergeJob(request: MergeRequest): string {
  const jobId = uuidv4();
  const now = new Date();

  const job: MergeJob = {
    id: jobId,
    status: 'queued',
    progress: 0,
    message: 'Job queued',
    outputKey: request.outputKey,
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(jobId, job);

  // Fire and forget — process in background
  processMergeJob(jobId, request).catch((err) => {
    console.error(`Merge job ${jobId} failed:`, err);
    updateJob(jobId, {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      message: 'Merge failed',
    });
  });

  return jobId;
}

async function processMergeJob(
  jobId: string,
  request: MergeRequest
): Promise<void> {
  const jobDir = path.join(config.processing.tempDir, jobId);
  const chunksDir = path.join(jobDir, 'chunks');

  try {
    await mkdir(chunksDir, { recursive: true });

    // Step 1: List chunk keys from S3
    updateJob(jobId, {
      status: 'downloading',
      progress: 5,
      message: 'Listing video chunks from S3...',
    });

    const keys = await listChunkKeys(request.bucket, request.chunkPrefix);

    if (keys.length === 0) {
      throw new Error(
        `No video chunks found under prefix: ${request.chunkPrefix}`
      );
    }

    const sorted = sortChunksByTimestamp(keys);

    updateJob(jobId, {
      progress: 10,
      message: `Found ${sorted.length} chunks. Downloading and analyzing...`,
    });

    // Step 2: Download + probe each chunk in parallel.
    // Each worker downloads a chunk then immediately probes it, overlapping
    // network I/O with ffprobe across workers.
    const chunks: VideoChunk[] = new Array(sorted.length);
    const chunkInfos: ChunkInfo[] = new Array(sorted.length);
    let completedCount = 0;

    await pMap(
      sorted,
      async ({ key, timestampMs }, i) => {
        const ext = path.extname(key) || '.mp4';
        const localPath = path.join(
          chunksDir,
          `${String(i).padStart(4, '0')}${ext}`
        );

        await downloadFile(request.bucket, key, localPath);
        const info = await probeChunkInfo(localPath);

        chunks[i] = { key, timestampMs, durationSec: info.durationSec, localPath };
        chunkInfos[i] = info;

        completedCount++;
        updateJob(jobId, {
          progress: 10 + Math.round((completedCount / sorted.length) * 40),
          message: `Processed ${completedCount}/${sorted.length} chunks`,
        });
      },
      config.processing.downloadConcurrency
    );

    // Step 3: Build video properties from the first chunk
    const ref = chunkInfos[0];
    const videoProps: VideoProperties = {
      width: ref.width,
      height: ref.height,
      frameRate: ref.frameRate,
      videoCodec: ref.videoCodec,
      audioCodec: ref.audioCodec,
      audioBitrate: null,
      audioSampleRate: ref.audioSampleRate,
      audioChannels: ref.audioChannels,
    };

    // Step 4: Identify chunks that already match the target codec params.
    // When all chunks come from the same recording session they are almost
    // always identical, letting us skip the expensive re-encode entirely.
    const compatiblePaths = new Set<string>();

    for (let i = 0; i < chunks.length; i++) {
      const info = chunkInfos[i];
      if (
        info.videoCodec === ref.videoCodec &&
        info.pixFmt === ref.pixFmt &&
        info.width === ref.width &&
        info.height === ref.height &&
        Math.abs(info.frameRate - ref.frameRate) < 0.1 &&
        info.audioCodec === ref.audioCodec &&
        info.audioSampleRate === ref.audioSampleRate &&
        info.audioChannels === ref.audioChannels
      ) {
        compatiblePaths.add(chunks[i].localPath);
      }
    }

    const incompatibleCount = chunks.length - compatiblePaths.size;
    const skipNormalization = incompatibleCount === 0;

    // Step 5: Build timeline with gap detection
    updateJob(jobId, {
      status: 'merging',
      progress: 55,
      message: 'Building timeline and detecting gaps...',
    });

    const timeline = buildTimeline(chunks);

    const gapCount = timeline.filter((s) => s.type === 'gap').length;
    const totalGapDuration = timeline
      .filter((s) => s.type === 'gap')
      .reduce((sum, s) => sum + s.durationSec, 0);

    updateJob(jobId, {
      progress: 60,
      message:
        `Timeline: ${chunks.length} chunks, ${gapCount} gaps (${Math.round(totalGapDuration)}s). ` +
        (skipNormalization
          ? 'All chunks compatible — skipping re-encode.'
          : `${incompatibleCount} chunks need normalization.`),
    });

    // Step 6: Merge all segments
    const outputPath = path.join(jobDir, 'merged_output.mp4');

    updateJob(jobId, {
      progress: 65,
      message: skipNormalization
        ? 'Merging segments (fast — no re-encoding needed)...'
        : `Normalizing ${incompatibleCount} chunks and merging...`,
    });

    await mergeSegments(timeline, videoProps, jobDir, outputPath, compatiblePaths);

    // Step 7: Upload to S3
    updateJob(jobId, {
      status: 'uploading',
      progress: 90,
      message: 'Uploading merged video to S3...',
    });

    const s3Uri = await uploadFile(
      request.bucket,
      request.outputKey,
      outputPath
    );

    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      message: `Merge complete. Uploaded to ${s3Uri}`,
    });
  } finally {
    await rm(jobDir, { recursive: true, force: true }).catch(() => {
      console.warn(`Failed to clean up temp dir: ${jobDir}`);
    });
  }
}
