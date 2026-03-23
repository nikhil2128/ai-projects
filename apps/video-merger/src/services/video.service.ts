import { execFile } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { config } from '../config';
import { ChunkInfo, VideoProperties, TimelineSegment } from '../types';
import { pMap } from '../utils';

const execFileAsync = promisify(execFile);

/**
 * Probe a video file and return its duration in seconds.
 */
export async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync(config.ffmpeg.ffprobePath, [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const duration = parseFloat(data.format?.duration);

  if (isNaN(duration)) {
    throw new Error(`Could not determine duration for: ${filePath}`);
  }

  return duration;
}

/**
 * Probe a video file and return its properties (resolution, codecs, etc.)
 * Used to generate matching black segments.
 */
export async function probeVideoProperties(
  filePath: string
): Promise<VideoProperties> {
  const { stdout } = await execFileAsync(config.ffmpeg.ffprobePath, [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find(
    (s: Record<string, string>) => s.codec_type === 'video'
  );
  const audioStream = data.streams?.find(
    (s: Record<string, string>) => s.codec_type === 'audio'
  );

  if (!videoStream) {
    throw new Error(`No video stream found in: ${filePath}`);
  }

  // Parse frame rate from r_frame_rate (e.g., "30/1" or "30000/1001")
  let frameRate = 30;
  if (videoStream.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
    if (den && den > 0) {
      frameRate = num / den;
    }
  }

  return {
    width: parseInt(videoStream.width, 10) || 1920,
    height: parseInt(videoStream.height, 10) || 1080,
    frameRate,
    videoCodec: videoStream.codec_name || 'h264',
    audioCodec: audioStream?.codec_name || null,
    audioBitrate: audioStream?.bit_rate
      ? `${Math.round(parseInt(audioStream.bit_rate, 10) / 1000)}k`
      : null,
    audioSampleRate: audioStream?.sample_rate
      ? parseInt(audioStream.sample_rate, 10)
      : null,
    audioChannels: audioStream?.channels
      ? parseInt(audioStream.channels, 10)
      : null,
  };
}

/**
 * Probe a video file and return both duration and full codec properties
 * in a single ffprobe invocation (replaces separate probeDuration + probeVideoProperties calls).
 */
export async function probeChunkInfo(filePath: string): Promise<ChunkInfo> {
  const { stdout } = await execFileAsync(config.ffmpeg.ffprobePath, [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find(
    (s: Record<string, string>) => s.codec_type === 'video'
  );
  const audioStream = data.streams?.find(
    (s: Record<string, string>) => s.codec_type === 'audio'
  );

  if (!videoStream) {
    throw new Error(`No video stream found in: ${filePath}`);
  }

  const duration = parseFloat(data.format?.duration);
  if (isNaN(duration)) {
    throw new Error(`Could not determine duration for: ${filePath}`);
  }

  let frameRate = 30;
  if (videoStream.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
    if (den && den > 0) frameRate = num / den;
  }

  return {
    durationSec: duration,
    width: parseInt(videoStream.width, 10) || 1920,
    height: parseInt(videoStream.height, 10) || 1080,
    frameRate,
    videoCodec: videoStream.codec_name || 'h264',
    pixFmt: videoStream.pix_fmt || 'yuv420p',
    audioCodec: audioStream?.codec_name || null,
    audioSampleRate: audioStream?.sample_rate
      ? parseInt(audioStream.sample_rate, 10)
      : null,
    audioChannels: audioStream?.channels
      ? parseInt(audioStream.channels, 10)
      : null,
  };
}

/**
 * Generate a black video (with silent audio if the source has audio) matching
 * the source video properties. Returns the path to the generated file.
 */
export async function generateBlackSegment(
  durationSec: number,
  props: VideoProperties,
  outputPath: string
): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const args: string[] = [
    '-y',
    // Black video source
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${props.width}x${props.height}:r=${Math.round(props.frameRate)}:d=${durationSec}`,
  ];

  // Add silent audio if source has audio
  if (props.audioCodec) {
    args.push(
      '-f',
      'lavfi',
      '-i',
      `anullsrc=r=${props.audioSampleRate || 44100}:cl=${props.audioChannels === 1 ? 'mono' : 'stereo'}`
    );
  }

  args.push(
    '-t',
    String(durationSec),
    // Video encoding — use h264 for broad compatibility
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-tune',
    'stillimage',
    '-pix_fmt',
    'yuv420p'
  );

  if (props.audioCodec) {
    args.push('-c:a', 'aac', '-shortest');
  }

  args.push(outputPath);

  await execFileAsync(config.ffmpeg.ffmpegPath, args);

  return outputPath;
}

/**
 * Re-encode a chunk to ensure consistent codec parameters for concatenation.
 * This prevents concat issues from varying codec settings across chunks.
 */
async function normalizeChunk(
  inputPath: string,
  outputPath: string,
  props: VideoProperties
): Promise<void> {
  const args: string[] = [
    '-y',
    '-i',
    inputPath,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(Math.round(props.frameRate)),
    '-s',
    `${props.width}x${props.height}`,
  ];

  if (props.audioCodec) {
    args.push(
      '-c:a',
      'aac',
      '-ar',
      String(props.audioSampleRate || 44100),
      '-ac',
      String(props.audioChannels || 2)
    );
  } else {
    args.push('-an');
  }

  args.push(outputPath);

  await execFileAsync(config.ffmpeg.ffmpegPath, args, {
    timeout: 5 * 60 * 1000, // 5 min per chunk
  });
}

/**
 * Concatenate all timeline segments (real chunks + gap fillers) into a single
 * output video using FFmpeg's concat demuxer.
 *
 * Compatible chunks (matching codec params) are used directly without re-encoding.
 * Only incompatible chunks are normalized, and all processing runs in parallel.
 */
export async function mergeSegments(
  segments: TimelineSegment[],
  props: VideoProperties,
  jobDir: string,
  outputPath: string,
  compatiblePaths: Set<string> = new Set()
): Promise<string> {
  await mkdir(jobDir, { recursive: true });

  const normalizedDir = path.join(jobDir, 'normalized');
  await mkdir(normalizedDir, { recursive: true });

  const gapDir = path.join(jobDir, 'gaps');
  await mkdir(gapDir, { recursive: true });

  const concatPaths: string[] = new Array(segments.length);
  const workItems: Array<{
    segment: TimelineSegment;
    dest: string;
  }> = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.type === 'chunk' && compatiblePaths.has(seg.filePath)) {
      concatPaths[i] = seg.filePath;
    } else if (seg.type === 'chunk') {
      const dest = path.join(
        normalizedDir,
        `chunk_${String(i).padStart(4, '0')}.mp4`
      );
      concatPaths[i] = dest;
      workItems.push({ segment: seg, dest });
    } else {
      const dest = path.join(
        gapDir,
        `gap_${String(i).padStart(4, '0')}.mp4`
      );
      concatPaths[i] = dest;
      workItems.push({ segment: seg, dest });
    }
  }

  await pMap(
    workItems,
    async ({ segment, dest }) => {
      if (segment.type === 'chunk') {
        await normalizeChunk(segment.filePath, dest, props);
      } else {
        await generateBlackSegment(segment.durationSec, props, dest);
      }
    },
    config.processing.normalizeConcurrency
  );

  const concatListPath = path.join(jobDir, 'concat_list.txt');
  const concatEntries = concatPaths.map((p) => `file '${p}'`);
  await writeFile(concatListPath, concatEntries.join('\n'), 'utf-8');

  await execFileAsync(
    config.ffmpeg.ffmpegPath,
    [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    {
      timeout: 30 * 60 * 1000,
    }
  );

  return outputPath;
}
