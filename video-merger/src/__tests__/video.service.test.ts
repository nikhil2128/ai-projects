import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoProperties } from '../types';

// Mock execFile to avoid needing real FFmpeg in tests
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { execFile } from 'child_process';
import { probeDuration, probeVideoProperties } from '../services/video.service';

const mockExecFile = vi.mocked(execFile);

function mockExecFileResponse(stdout: string): void {
  mockExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, ...rest: unknown[]) => {
      const callback =
        typeof rest[0] === 'function' ? rest[0] : rest[1];
      if (typeof callback === 'function') {
        callback(null, { stdout, stderr: '' });
      }
      return {} as ReturnType<typeof execFile>;
    }
  );
}

describe('probeDuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return duration from ffprobe output', async () => {
    mockExecFileResponse(
      JSON.stringify({
        format: { duration: '10.500000' },
      })
    );

    const duration = await probeDuration('/tmp/test.mp4');
    expect(duration).toBeCloseTo(10.5);
  });

  it('should throw when duration is missing', async () => {
    mockExecFileResponse(JSON.stringify({ format: {} }));

    await expect(probeDuration('/tmp/test.mp4')).rejects.toThrow(
      'Could not determine duration'
    );
  });
});

describe('probeVideoProperties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract video and audio properties', async () => {
    mockExecFileResponse(
      JSON.stringify({
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
            r_frame_rate: '30/1',
          },
          {
            codec_type: 'audio',
            codec_name: 'aac',
            bit_rate: '128000',
            sample_rate: '44100',
            channels: 2,
          },
        ],
        format: { duration: '60.0' },
      })
    );

    const props: VideoProperties = await probeVideoProperties('/tmp/test.mp4');
    expect(props.width).toBe(1920);
    expect(props.height).toBe(1080);
    expect(props.frameRate).toBe(30);
    expect(props.videoCodec).toBe('h264');
    expect(props.audioCodec).toBe('aac');
    expect(props.audioSampleRate).toBe(44100);
    expect(props.audioChannels).toBe(2);
  });

  it('should handle video-only files (no audio stream)', async () => {
    mockExecFileResponse(
      JSON.stringify({
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1280,
            height: 720,
            r_frame_rate: '24000/1001',
          },
        ],
        format: {},
      })
    );

    const props = await probeVideoProperties('/tmp/test.mp4');
    expect(props.width).toBe(1280);
    expect(props.height).toBe(720);
    expect(props.frameRate).toBeCloseTo(23.976, 2);
    expect(props.audioCodec).toBeNull();
  });

  it('should throw when no video stream found', async () => {
    mockExecFileResponse(
      JSON.stringify({
        streams: [{ codec_type: 'audio', codec_name: 'aac' }],
        format: {},
      })
    );

    await expect(probeVideoProperties('/tmp/test.mp4')).rejects.toThrow(
      'No video stream found'
    );
  });
});
