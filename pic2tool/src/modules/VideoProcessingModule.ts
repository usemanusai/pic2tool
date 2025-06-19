import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as log from 'electron-log';
import Jimp from 'jimp';

export interface FrameInfo {
  path: string;
  timestamp: number;
  index: number;
  similarity?: number;
}

export interface ProcessingOptions {
  frameRate?: number;
  skipSimilarFrames?: boolean;
  similarityThreshold?: number;
  maxFrames?: number;
}

export class VideoProcessingModule {
  private defaultOptions: ProcessingOptions = {
    frameRate: 2, // Extract 2 frames per second
    skipSimilarFrames: true,
    similarityThreshold: 0.95,
    maxFrames: 1000
  };

  constructor() {
    log.info('VideoProcessingModule initialized');
    this.setupFFmpeg();
  }

  private setupFFmpeg(): void {
    // Try to find FFmpeg in common locations
    const possiblePaths = [
      'ffmpeg', // If in PATH
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      path.join(process.cwd(), 'ffmpeg', 'ffmpeg.exe')
    ];

    for (const ffmpegPath of possiblePaths) {
      try {
        ffmpeg.setFfmpegPath(ffmpegPath);
        log.info('FFmpeg path set to:', ffmpegPath);
        break;
      } catch (error) {
        log.warn('FFmpeg not found at:', ffmpegPath);
      }
    }
  }

  public async extractFrames(
    videoPath: string, 
    projectPath: string, 
    options: ProcessingOptions = {}
  ): Promise<FrameInfo[]> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      log.info('Extracting frames from video:', videoPath);
      log.info('Processing options:', opts);

      // Create frames directory
      const framesDir = path.join(projectPath, 'frames');
      if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
      }

      // Get video duration and info
      const videoInfo = await this.getVideoInfo(videoPath);
      log.info('Video info:', videoInfo);

      // Extract frames at specified rate
      const rawFrames = await this.extractRawFrames(videoPath, framesDir, opts.frameRate!);
      
      // Filter similar frames if enabled
      let finalFrames = rawFrames;
      if (opts.skipSimilarFrames) {
        finalFrames = await this.filterSimilarFrames(rawFrames, opts.similarityThreshold!);
      }

      // Limit number of frames if specified
      if (opts.maxFrames && finalFrames.length > opts.maxFrames) {
        finalFrames = this.selectRepresentativeFrames(finalFrames, opts.maxFrames);
      }

      log.info(`Extracted ${finalFrames.length} frames from ${rawFrames.length} total frames`);
      return finalFrames;

    } catch (error) {
      log.error('Error extracting frames:', error);
      throw error;
    }
  }

  private async getVideoInfo(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  private async extractRawFrames(
    videoPath: string, 
    outputDir: string, 
    frameRate: number
  ): Promise<FrameInfo[]> {
    return new Promise((resolve, reject) => {
      const frames: FrameInfo[] = [];
      let frameIndex = 0;

      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=${frameRate}`,
          '-q:v 2' // High quality
        ])
        .output(path.join(outputDir, 'frame_%04d.png'))
        .on('start', (commandLine) => {
          log.info('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          log.debug('Processing progress:', progress.percent);
        })
        .on('end', () => {
          // Read the generated frames
          const frameFiles = fs.readdirSync(outputDir)
            .filter(file => file.startsWith('frame_') && file.endsWith('.png'))
            .sort();

          frameFiles.forEach((file, index) => {
            frames.push({
              path: path.join(outputDir, file),
              timestamp: index / frameRate,
              index: index
            });
          });

          log.info(`Extracted ${frames.length} raw frames`);
          resolve(frames);
        })
        .on('error', (err) => {
          log.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });
  }

  private async filterSimilarFrames(
    frames: FrameInfo[], 
    threshold: number
  ): Promise<FrameInfo[]> {
    try {
      log.info('Filtering similar frames with threshold:', threshold);
      
      if (frames.length === 0) return frames;

      const filteredFrames: FrameInfo[] = [frames[0]]; // Always keep first frame
      
      for (let i = 1; i < frames.length; i++) {
        const similarity = await this.calculateFrameSimilarity(
          frames[i - 1].path, 
          frames[i].path
        );
        
        frames[i].similarity = similarity;
        
        if (similarity < threshold) {
          filteredFrames.push(frames[i]);
        } else {
          log.debug(`Skipping similar frame ${i} (similarity: ${similarity})`);
        }
      }

      log.info(`Filtered ${frames.length - filteredFrames.length} similar frames`);
      return filteredFrames;

    } catch (error) {
      log.error('Error filtering similar frames:', error);
      // Return all frames if filtering fails
      return frames;
    }
  }

  private async calculateFrameSimilarity(frame1Path: string, frame2Path: string): Promise<number> {
    try {
      // Use Jimp for actual image comparison
      const image1 = await Jimp.read(frame1Path);
      const image2 = await Jimp.read(frame2Path);

      // Resize images to a smaller size for faster comparison
      const width = 64;
      const height = 64;

      image1.resize(width, height);
      image2.resize(width, height);

      // Calculate pixel-by-pixel difference
      let totalDiff = 0;
      const totalPixels = width * height;

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const color1 = Jimp.intToRGBA(image1.getPixelColor(x, y));
          const color2 = Jimp.intToRGBA(image2.getPixelColor(x, y));

          // Calculate color difference
          const rDiff = Math.abs(color1.r - color2.r);
          const gDiff = Math.abs(color1.g - color2.g);
          const bDiff = Math.abs(color1.b - color2.b);

          const pixelDiff = (rDiff + gDiff + bDiff) / (3 * 255);
          totalDiff += pixelDiff;
        }
      }

      const avgDiff = totalDiff / totalPixels;
      const similarity = 1 - avgDiff;

      return Math.max(0, Math.min(1, similarity));
    } catch (error) {
      log.error('Error calculating frame similarity:', error);

      // Fallback to file size comparison
      try {
        const stats1 = fs.statSync(frame1Path);
        const stats2 = fs.statSync(frame2Path);

        const sizeDiff = Math.abs(stats1.size - stats2.size);
        const avgSize = (stats1.size + stats2.size) / 2;
        const similarity = 1 - (sizeDiff / avgSize);

        return Math.max(0, Math.min(1, similarity));
      } catch (fallbackError) {
        log.error('Fallback similarity calculation failed:', fallbackError);
        return 0;
      }
    }
  }

  private selectRepresentativeFrames(frames: FrameInfo[], maxFrames: number): FrameInfo[] {
    if (frames.length <= maxFrames) return frames;

    const step = frames.length / maxFrames;
    const selected: FrameInfo[] = [];

    for (let i = 0; i < maxFrames; i++) {
      const index = Math.floor(i * step);
      selected.push(frames[index]);
    }

    log.info(`Selected ${selected.length} representative frames from ${frames.length} total`);
    return selected;
  }

  public async convertVideoFormat(
    inputPath: string, 
    outputPath: string, 
    format: string = 'mp4'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .format(format)
        .on('end', () => {
          log.info('Video conversion completed:', outputPath);
          resolve(outputPath);
        })
        .on('error', (err) => {
          log.error('Video conversion error:', err);
          reject(err);
        })
        .run();
    });
  }

  public async getVideoMetadata(videoPath: string): Promise<any> {
    try {
      const info = await this.getVideoInfo(videoPath);
      return {
        duration: info.format.duration,
        width: info.streams[0].width,
        height: info.streams[0].height,
        frameRate: eval(info.streams[0].r_frame_rate),
        format: info.format.format_name,
        size: info.format.size
      };
    } catch (error) {
      log.error('Error getting video metadata:', error);
      throw error;
    }
  }
}
