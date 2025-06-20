import * as fs from 'fs';
import * as path from 'path';
import * as log from 'electron-log';
import { Jimp } from 'jimp';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const ffprobePath = ffprobeStatic.path;

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
    maxFrames: 1000,
  };

  constructor() {
    log.info('VideoProcessingModule initialized');
    this.setupFFmpegBinaries();
  }

  private setupFFmpegBinaries(): void {
    // Check ffmpeg-static binary
    if (ffmpegPath) {
      log.info('✅ FFmpeg static binary available at:', ffmpegPath);
    } else {
      log.error('❌ FFmpeg static binary not available');
    }

    // Check ffprobe-static binary
    if (ffprobePath) {
      log.info('✅ FFprobe static binary available at:', ffprobePath);
    } else {
      log.error('❌ FFprobe static binary not available');
    }

    // Verify binaries exist on filesystem
    this.verifyBinaries();
  }

  private verifyBinaries(): void {
    try {
      if (ffmpegPath && fs.existsSync(ffmpegPath)) {
        log.info('✅ FFmpeg binary verified on filesystem');
      } else {
        log.error('❌ FFmpeg binary not found on filesystem:', ffmpegPath);
      }

      if (ffprobePath && fs.existsSync(ffprobePath)) {
        log.info('✅ FFprobe binary verified on filesystem');
      } else {
        log.error('❌ FFprobe binary not found on filesystem:', ffprobePath);
      }
    } catch (error) {
      log.error('❌ Error verifying binaries:', error);
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
      if (!ffprobePath) {
        reject(new Error('FFprobe not available - please ensure ffprobe-static is installed'));
        return;
      }

      if (!fs.existsSync(videoPath)) {
        reject(new Error(`Video file not found: ${videoPath}`));
        return;
      }

      log.info('🔍 Getting video info using FFprobe:', ffprobePath);
      log.info('📹 Video file:', videoPath);

      const ffprobe = spawn(ffprobePath, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ]);

      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(output);
            log.info('✅ Video metadata extracted successfully');
            resolve(metadata);
          } catch (parseError) {
            log.error('❌ Failed to parse FFprobe output:', parseError);
            reject(new Error(`Failed to parse ffprobe output: ${parseError}`));
          }
        } else {
          log.error('❌ FFprobe failed with code:', code);
          log.error('❌ FFprobe error output:', errorOutput);
          reject(new Error(`FFprobe failed with code ${code}: ${errorOutput}`));
        }
      });

      ffprobe.on('error', (error) => {
        log.error('❌ FFprobe process error:', error);
        reject(new Error(`FFprobe process error: ${error.message}`));
      });
    });
  }

  private async extractRawFrames(
    videoPath: string,
    outputDir: string,
    frameRate: number
  ): Promise<FrameInfo[]> {
    return new Promise((resolve, reject) => {
      if (!ffmpegPath) {
        reject(new Error('FFmpeg not available - please ensure ffmpeg-static is installed'));
        return;
      }

      if (!fs.existsSync(videoPath)) {
        reject(new Error(`Video file not found: ${videoPath}`));
        return;
      }

      log.info('🎬 Extracting frames using FFmpeg:', ffmpegPath);
      log.info('📹 Video file:', videoPath);
      log.info('📁 Output directory:', outputDir);
      log.info('🎯 Frame rate:', frameRate);

      const frames: FrameInfo[] = [];
      const outputPattern = path.join(outputDir, 'frame_%04d.png');

      const ffmpegProcess = spawn(ffmpegPath, [
        '-i', videoPath,
        '-vf', `fps=${frameRate}`,
        '-q:v', '2', // High quality
        '-y', // Overwrite output files
        outputPattern
      ]);

      let errorOutput = '';

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;

        // Log progress if available
        if (output.includes('frame=')) {
          log.debug('FFmpeg progress:', output.trim());
        }
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Read the generated frames
            const frameFiles = fs
              .readdirSync(outputDir)
              .filter((file) => file.startsWith('frame_') && file.endsWith('.png'))
              .sort();

            frameFiles.forEach((file, index) => {
              frames.push({
                path: path.join(outputDir, file),
                timestamp: index / frameRate,
                index: index,
              });
            });

            log.info(`Extracted ${frames.length} raw frames`);
            resolve(frames);
          } catch (error) {
            reject(new Error(`Failed to read extracted frames: ${error}`));
          }
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
        }
      });

      ffmpegProcess.on('error', (error) => {
        reject(error);
      });

      log.info('Starting frame extraction with FFmpeg');
    });
  }

  private async filterSimilarFrames(frames: FrameInfo[], threshold: number): Promise<FrameInfo[]> {
    try {
      log.info('Filtering similar frames with threshold:', threshold);

      if (frames.length === 0) return frames;

      const filteredFrames: FrameInfo[] = [frames[0]]; // Always keep first frame

      for (let i = 1; i < frames.length; i++) {
        const similarity = await this.calculateFrameSimilarity(frames[i - 1].path, frames[i].path);

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

      image1.resize({ w: width, h: height });
      image2.resize({ w: width, h: height });

      // Calculate pixel-by-pixel difference
      let totalDiff = 0;
      const totalPixels = width * height;

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const color1 = this.intToRGBA(image1.getPixelColor(x, y));
          const color2 = this.intToRGBA(image2.getPixelColor(x, y));

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
        const similarity = 1 - sizeDiff / avgSize;

        return Math.max(0, Math.min(1, similarity));
      } catch (fallbackError) {
        log.error('Fallback similarity calculation failed:', fallbackError);
        return 0;
      }
    }
  }

  /**
   * Helper function to convert integer color to RGBA (replacement for Jimp.intToRGBA)
   */
  private intToRGBA(int: number): { r: number; g: number; b: number; a: number } {
    return {
      r: (int >>> 24) & 0xff,
      g: (int >>> 16) & 0xff,
      b: (int >>> 8) & 0xff,
      a: int & 0xff,
    };
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
      if (!ffmpegPath) {
        reject(new Error('FFmpeg not available'));
        return;
      }

      const ffmpegProcess = spawn(ffmpegPath, [
        '-i', inputPath,
        '-f', format,
        '-y', // Overwrite output files
        outputPath
      ]);

      let errorOutput = '';

      ffmpegProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          log.info('Video conversion completed:', outputPath);
          resolve(outputPath);
        } else {
          log.error('Video conversion error:', errorOutput);
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
        }
      });

      ffmpegProcess.on('error', (error) => {
        log.error('Video conversion error:', error);
        reject(error);
      });
    });
  }

  public async getVideoMetadata(videoPath: string): Promise<any> {
    try {
      const info = await this.getVideoInfo(videoPath);
      const videoStream = info.streams.find((stream: any) => stream.codec_type === 'video');

      if (!videoStream) {
        throw new Error('No video stream found');
      }

      // Safely parse frame rate
      let frameRate = 0;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        frameRate = den ? num / den : num;
      }

      return {
        duration: parseFloat(info.format.duration) || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        frameRate: frameRate,
        format: info.format.format_name || 'unknown',
        size: parseInt(info.format.size) || 0,
      };
    } catch (error) {
      log.error('Error getting video metadata:', error);
      throw error;
    }
  }
}
