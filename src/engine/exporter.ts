import { BufferTarget, CanvasSource, Mp4OutputFormat, Output } from 'mediabunny';

export type Mp4ExportOptions = {
  canvas: HTMLCanvasElement;
  duration: number;
  fps?: number;
  width?: number;
  height?: number;
  renderFrame: (timeSeconds: number) => void;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

const yieldToBrowser = (): Promise<void> => new Promise(resolve => window.setTimeout(resolve, 0));

export async function exportMp4(options: Mp4ExportOptions): Promise<Blob> {
  const { canvas, duration, renderFrame, signal, onProgress, fps = 30, width = 1920, height = 1080 } = options;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Duration must be greater than zero.');
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw new Error('Frame rate must be between 1 and 60 FPS.');
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    throw new Error('This browser does not expose WebCodecs. Use a recent Chromium-based browser over HTTPS or localhost.');
  }
  const { canEncodeVideo } = await import('mediabunny');
  const canEncode = await canEncodeVideo('avc', { width, height, bitrate: 8_000_000, frameRate: fps });
  if (!canEncode) throw new Error('H.264 encoding is unavailable in this browser/device. Try Chrome or Edge with hardware video encoding enabled.');

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(canvas, { codec: 'avc', bitrate: 8_000_000, latencyMode: 'quality' });
  output.addVideoTrack(source, { frameRate: fps });
  let started = false;
  try {
    await output.start();
    started = true;
    const frameDuration = 1 / fps;
    const frameCount = Math.ceil(duration * fps);
    for (let frame = 0; frame < frameCount; frame++) {
      if (signal?.aborted) throw new DOMException('Export canceled.', 'AbortError');
      const timestamp = frame * frameDuration;
      renderFrame(timestamp);
      await source.add(timestamp, frameDuration);
      if (frame % 5 === 0 || frame === frameCount - 1) {
        onProgress?.((frame + 1) / frameCount);
        await yieldToBrowser();
      }
    }
    await output.finalize();
    const buffer = target.buffer;
    if (!buffer || buffer.byteLength === 0) throw new Error('MP4 encoder returned an empty file.');
    return new Blob([buffer], { type: 'video/mp4' });
  } catch (error) {
    if (started && (output.state === 'started' || output.state === 'pending')) await output.cancel().catch(() => undefined);
    throw error;
  }
}
