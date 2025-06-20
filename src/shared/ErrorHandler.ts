import * as log from 'electron-log';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  stack?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCallbacks: ((error: AppError) => void)[] = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public onError(callback: (error: AppError) => void): void {
    this.errorCallbacks.push(callback);
  }

  public handleError(error: any, context?: string): AppError {
    const appError: AppError = {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      details: error,
      timestamp: new Date(),
      stack: error?.stack,
    };

    // Log the error
    log.error(`[${context || 'Unknown'}] ${appError.code}: ${appError.message}`, appError.details);

    // Notify callbacks
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(appError);
      } catch (callbackError) {
        log.error('Error in error callback:', callbackError);
      }
    });

    return appError;
  }

  private getErrorCode(error: any): string {
    if (error?.code) return error.code;
    if (error?.name) return error.name;
    if (typeof error === 'string') return 'GENERIC_ERROR';
    return 'UNKNOWN_ERROR';
  }

  private getErrorMessage(error: any): string {
    if (error?.message) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  }

  public createError(code: string, message: string, details?: any): AppError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
    };
  }

  public isNetworkError(error: any): boolean {
    const networkCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'];
    return (
      networkCodes.includes(error?.code) ||
      error?.message?.includes('network') ||
      error?.message?.includes('fetch')
    );
  }

  public isAPIError(error: any): boolean {
    return (
      error?.response?.status >= 400 ||
      error?.message?.includes('API') ||
      error?.message?.includes('rate limit')
    );
  }

  public isFileSystemError(error: any): boolean {
    const fsCodes = ['ENOENT', 'EACCES', 'EPERM', 'EEXIST', 'EMFILE'];
    return fsCodes.includes(error?.code);
  }

  public getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case 'ENOENT':
        return 'File or directory not found. Please check the path and try again.';
      case 'EACCES':
      case 'EPERM':
        return 'Permission denied. Please check file permissions or run as administrator.';
      case 'ENOTFOUND':
        return 'Network connection failed. Please check your internet connection.';
      case 'ECONNREFUSED':
        return 'Connection refused. The service may be unavailable.';
      case 'ETIMEDOUT':
        return 'Request timed out. Please try again later.';
      case 'RATE_LIMIT_ERROR':
        return 'API rate limit exceeded. Please wait a moment and try again.';
      case 'INVALID_API_KEY':
        return 'Invalid API key. Please check your configuration.';
      case 'FFMPEG_ERROR':
        return 'Video processing failed. Please ensure FFmpeg is installed and the video file is valid.';
      case 'RECORDING_ERROR':
        return 'Screen recording failed. Please check permissions and try again.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  // Static method for simple error logging
  public static logError(message: string, error?: any): void {
    log.error(message, error);
    if (error) {
      ErrorHandler.getInstance().handleError(error, message);
    }
  }
}

// Specific error types
export class RecordingError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RecordingError';
  }
}

export class VideoProcessingError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VideoProcessingError';
  }
}

export class VisionAnalysisError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VisionAnalysisError';
  }
}

export class CodeGenerationError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CodeGenerationError';
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();
