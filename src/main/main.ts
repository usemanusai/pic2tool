import { app, BrowserWindow, ipcMain, desktopCapturer, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as log from 'electron-log';
import { SettingsManager } from '../shared/SettingsManager';
import { errorHandler } from '../shared/ErrorHandler';

// Import modules
import { RecordingModule } from '../modules/RecordingModule';
import { VideoProcessingModule } from '../modules/VideoProcessingModule';
import { VisionAnalysisModule } from '../modules/VisionAnalysisModule';
import { ActionSequenceModule } from '../modules/ActionSequenceModule';
import { CodeGenerationModule } from '../modules/CodeGenerationModule';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Initialize settings manager
const settingsManager = new SettingsManager();

class AutomatedDevelopmentRecorder {
  private mainWindow: BrowserWindow | null = null;
  private recordingModule: RecordingModule;
  private videoProcessingModule: VideoProcessingModule;
  private visionAnalysisModule: VisionAnalysisModule;
  private actionSequenceModule: ActionSequenceModule;
  private codeGenerationModule: CodeGenerationModule;

  constructor() {
    this.recordingModule = new RecordingModule();
    this.videoProcessingModule = new VideoProcessingModule();
    this.visionAnalysisModule = new VisionAnalysisModule();
    this.actionSequenceModule = new ActionSequenceModule();
    this.codeGenerationModule = new CodeGenerationModule();

    this.setupIpcHandlers();
  }

  public async createWindow(): Promise<void> {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
      icon: path.join(__dirname, '../../assets/icon.png'), // We'll create this later
    });

    // Load the React app
    if (process.env.NODE_ENV === 'development') {
      await this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    log.info('Main window created successfully');
  }

  private setupIpcHandlers(): void {
    // Recording handlers
    ipcMain.handle('start-recording', async (event, config) => {
      try {
        log.info('Starting recording with config:', config);
        const result = await this.recordingModule.startRecording(config);
        this.sendToRenderer('recording-started', result);
        return result;
      } catch (error) {
        log.error('Error starting recording:', error);
        throw error;
      }
    });

    ipcMain.handle('stop-recording', async () => {
      try {
        log.info('Stopping recording');
        const result = await this.recordingModule.stopRecording();
        this.sendToRenderer('recording-stopped', result);
        return result;
      } catch (error) {
        log.error('Error stopping recording:', error);
        throw error;
      }
    });

    // Video processing handlers
    ipcMain.handle('process-video', async (event, videoPath, projectPath) => {
      try {
        log.info('Processing video:', videoPath);
        
        // Extract frames
        this.sendToRenderer('processing-progress', { 
          percent: 10, 
          status: 'Extracting frames from video...' 
        });
        
        const frames = await this.videoProcessingModule.extractFrames(videoPath, projectPath);
        
        this.sendToRenderer('processing-progress', { 
          percent: 30, 
          status: 'Analyzing frames with AI vision...' 
        });
        
        // Analyze frames with AI
        const analysisResults = await this.visionAnalysisModule.analyzeFrames(frames);
        
        this.sendToRenderer('processing-progress', { 
          percent: 60, 
          status: 'Building action sequence...' 
        });
        
        // Generate action sequence
        const actionSequence = await this.actionSequenceModule.generateSequence(analysisResults);
        
        this.sendToRenderer('processing-progress', { 
          percent: 80, 
          status: 'Generating code...' 
        });
        
        // Generate code
        const generatedCode = await this.codeGenerationModule.generateCode(actionSequence, projectPath);
        
        this.sendToRenderer('processing-progress', { 
          percent: 100, 
          status: 'Complete!' 
        });
        
        this.sendToRenderer('generation-complete', { 
          code: generatedCode, 
          projectPath 
        });
        
        return generatedCode;
      } catch (error) {
        log.error('Error processing video:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.sendToRenderer('processing-error', { error: errorMessage });
        throw error;
      }
    });

    // Settings handlers
    ipcMain.handle('get-settings', () => {
      try {
        return settingsManager.getSettings();
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-settings');
        throw appError;
      }
    });

    ipcMain.handle('save-settings', (event, settings) => {
      try {
        settingsManager.saveSettings(settings);
        log.info('Settings saved');
        return true;
      } catch (error) {
        const appError = errorHandler.handleError(error, 'save-settings');
        throw appError;
      }
    });

    ipcMain.handle('add-api-key', (event, service, key, name) => {
      try {
        const id = settingsManager.addApiKey(service, key, name);
        return id;
      } catch (error) {
        const appError = errorHandler.handleError(error, 'add-api-key');
        throw appError;
      }
    });

    ipcMain.handle('remove-api-key', (event, id) => {
      try {
        settingsManager.removeApiKey(id);
        return true;
      } catch (error) {
        const appError = errorHandler.handleError(error, 'remove-api-key');
        throw appError;
      }
    });

    // Get available sources for recording
    ipcMain.handle('get-sources', async () => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen']
        });
        return sources;
      } catch (error) {
        log.error('Error getting sources:', error);
        throw error;
      }
    });

    // File dialog handlers
    ipcMain.handle('show-open-dialog', async (event, options) => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, options);
        return result;
      } catch (error) {
        log.error('Error showing open dialog:', error);
        throw error;
      }
    });

    ipcMain.handle('show-save-dialog', async (event, options) => {
      try {
        const result = await dialog.showSaveDialog(this.mainWindow!, options);
        return result;
      } catch (error) {
        log.error('Error showing save dialog:', error);
        throw error;
      }
    });

    // Open external links
    ipcMain.handle('open-external', async (event, url) => {
      try {
        await shell.openExternal(url);
        return true;
      } catch (error) {
        log.error('Error opening external URL:', error);
        throw error;
      }
    });

    // Show item in folder
    ipcMain.handle('show-item-in-folder', async (event, fullPath) => {
      try {
        shell.showItemInFolder(fullPath);
        return true;
      } catch (error) {
        log.error('Error showing item in folder:', error);
        throw error;
      }
    });
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

// App event handlers
app.whenReady().then(async () => {
  const recorder = new AutomatedDevelopmentRecorder();
  await recorder.createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await recorder.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    log.warn('Blocked new window creation to:', url);
    return { action: 'deny' };
  });
});
