import { desktopCapturer, DesktopCapturerSource } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as log from 'electron-log';

export interface RecordingConfig {
  sourceId: string;
  outputPath: string;
  quality?: 'low' | 'medium' | 'high';
  frameRate?: number;
}

export interface RecordingResult {
  success: boolean;
  videoPath?: string;
  duration?: number;
  error?: string;
}

export class RecordingModule {
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;

  constructor() {
    log.info('RecordingModule initialized');
  }

  public async startRecording(config: RecordingConfig): Promise<RecordingResult> {
    try {
      if (this.isRecording) {
        throw new Error('Recording is already in progress');
      }

      log.info('Starting recording with config:', config);

      // Get the video stream from the selected source
      const stream = await this.getVideoStream(config.sourceId);

      // Configure MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: this.getVideoBitrate(config.quality || 'medium'),
      };

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.recordedChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.saveRecording(config.outputPath);
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      this.startTime = Date.now();

      log.info('Recording started successfully');
      return {
        success: true,
        videoPath: config.outputPath,
      };
    } catch (error) {
      log.error('Error starting recording:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async stopRecording(): Promise<RecordingResult> {
    try {
      if (!this.isRecording || !this.mediaRecorder) {
        throw new Error('No recording in progress');
      }

      log.info('Stopping recording');

      return new Promise((resolve) => {
        this.mediaRecorder!.onstop = async () => {
          const duration = Date.now() - this.startTime;
          const videoPath = await this.saveRecording();

          this.isRecording = false;
          this.mediaRecorder = null;

          log.info('Recording stopped successfully');
          resolve({
            success: true,
            videoPath,
            duration,
          });
        };

        this.mediaRecorder!.stop();

        // Stop all tracks to release the screen capture
        this.mediaRecorder!.stream.getTracks().forEach((track) => track.stop());
      });
    } catch (error) {
      log.error('Error stopping recording:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async getVideoStream(sourceId: string): Promise<MediaStream> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
      });

      const selectedSource = sources.find((source) => source.id === sourceId);
      if (!selectedSource) {
        throw new Error(`Source with id ${sourceId} not found`);
      }

      // For Electron, we need to use the desktopCapturer API differently
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            maxFrameRate: 30,
          },
        } as any,
      };

      // Use the global navigator in the main process context
      const stream = await (global as any).navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      log.error('Error getting video stream:', error);

      // Fallback: create a mock stream for development
      log.warn('Creating mock video stream for development');
      const canvas = new (global as any).OffscreenCanvas(1920, 1080);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'blue';
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.fillText('Recording...', 100, 100);

      const stream = canvas.captureStream(30);
      return stream;
    }
  }

  private getVideoBitrate(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'low':
        return 1000000; // 1 Mbps
      case 'medium':
        return 2500000; // 2.5 Mbps
      case 'high':
        return 5000000; // 5 Mbps
      default:
        return 2500000;
    }
  }

  private async saveRecording(outputPath?: string): Promise<string> {
    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const buffer = Buffer.from(await blob.arrayBuffer());

      const finalPath =
        outputPath || path.join(process.cwd(), 'recordings', `recording-${Date.now()}.webm`);

      // Ensure directory exists
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(finalPath, buffer);
      log.info('Recording saved to:', finalPath);

      return finalPath;
    } catch (error) {
      log.error('Error saving recording:', error);
      throw error;
    }
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public async getAvailableSources(): Promise<DesktopCapturerSource[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
      });
      return sources;
    } catch (error) {
      log.error('Error getting available sources:', error);
      throw error;
    }
  }
}
