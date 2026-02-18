import path from 'path';
import { rm, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { MergeJob, MergeRequest, VideoChunk } from '../types';
import { listChunkKeys, downloadFile, uploadFile } from './s3.service';
import { sortChunksByTimestamp, buildTimeline } from './chunk.service';
import {
  probeDuration,
  probeVideoProperties,
  mergeSegments,
} from './video.service';

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

    // Step 2: Sort by timestamp
    const sorted = sortChunksByTimestamp(keys);

    updateJob(jobId, {
      progress: 10,
      message: `Found ${sorted.length} chunks. Downloading...`,
    });

    // Step 3: Download all chunks
    const chunks: VideoChunk[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const { key, timestampMs } = sorted[i];
      const ext = path.extname(key) || '.mp4';
      const localPath = path.join(
        chunksDir,
        `${String(i).padStart(4, '0')}${ext}`
      );

      await downloadFile(request.bucket, key, localPath);

      chunks.push({
        key,
        timestampMs,
        durationSec: 0, // filled in next step
        localPath,
      });

      const downloadProgress = 10 + Math.round((i / sorted.length) * 30);
      updateJob(jobId, {
        progress: downloadProgress,
        message: `Downloaded ${i + 1}/${sorted.length} chunks`,
      });
    }

    // Step 4: Probe duration of each chunk
    updateJob(jobId, {
      status: 'analyzing',
      progress: 40,
      message: 'Analyzing video chunks...',
    });

    for (let i = 0; i < chunks.length; i++) {
      chunks[i].durationSec = await probeDuration(chunks[i].localPath);

      const analyzeProgress = 40 + Math.round((i / chunks.length) * 15);
      updateJob(jobId, {
        progress: analyzeProgress,
        message: `Analyzed ${i + 1}/${chunks.length} chunks`,
      });
    }

    // Step 5: Get video properties from the first chunk (for gap generation)
    const videoProps = await probeVideoProperties(chunks[0].localPath);

    // Step 6: Build timeline with gap detection
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
      message: `Timeline built: ${chunks.length} chunks, ${gapCount} gaps (${Math.round(totalGapDuration)}s total gap)`,
    });

    // Step 7: Merge all segments
    const outputPath = path.join(jobDir, 'merged_output.mp4');

    updateJob(jobId, {
      progress: 65,
      message: 'Normalizing and merging segments (this may take a while)...',
    });

    await mergeSegments(timeline, videoProps, jobDir, outputPath);

    // Step 8: Upload to S3
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
    // Clean up temp directory
    await rm(jobDir, { recursive: true, force: true }).catch(() => {
      console.warn(`Failed to clean up temp dir: ${jobDir}`);
    });
  }
}
