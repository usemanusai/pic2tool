import { app, BrowserWindow, ipcMain, desktopCapturer, dialog, shell } from 'electron';
import * as path from 'path';
import * as log from 'electron-log';
import { SettingsManager } from '../shared/SettingsManager';
import { errorHandler } from '../shared/ErrorHandler';

// Import modules
import { RecordingModule } from '../modules/RecordingModule';
import { VideoProcessingModule } from '../modules/VideoProcessingModule';
import { VisionAnalysisModule } from '../modules/VisionAnalysisModule';
import { ActionSequenceModule } from '../modules/ActionSequenceModule';
import { CodeGenerationModule } from '../modules/CodeGenerationModule';
import { GlobalShortcutManager } from '../modules/GlobalShortcutManager';

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
  private globalShortcutManager: GlobalShortcutManager;

  constructor() {
    this.recordingModule = new RecordingModule();
    this.videoProcessingModule = new VideoProcessingModule();
    this.visionAnalysisModule = new VisionAnalysisModule();
    this.actionSequenceModule = new ActionSequenceModule();
    this.codeGenerationModule = new CodeGenerationModule();

    // Initialize global shortcut manager with callbacks
    this.globalShortcutManager = new GlobalShortcutManager({
      onRecordingToggle: this.handleGlobalRecordingToggle.bind(this),
      onShortcutConflict: this.handleShortcutConflict.bind(this)
    });

    this.setupIpcHandlers();
  }

  public async createWindow(): Promise<void> {
    const preloadPath = path.join(__dirname, 'preload.js');
    log.info(`Preload script path: ${preloadPath}`);
    log.info(`Preload script exists: ${require('fs').existsSync(preloadPath)}`);
    log.info(`Current __dirname: ${__dirname}`);

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: true,
        sandbox: false,
      },
      icon: path.join(__dirname, '../../assets/icon.png'), // We'll create this later
    });

    // Load the React app
    const isDev = process.env.NODE_ENV === 'development';
    const useDevServer = process.argv.includes('--dev') || process.env.WEBPACK_DEV_SERVER === 'true';

    if (isDev && useDevServer) {
      // Try to load from dev server first
      try {
        await this.mainWindow.loadURL('http://localhost:3000');
        this.mainWindow.webContents.openDevTools();
        log.info('Loaded from development server');
      } catch (error) {
        log.warn('Dev server not available, falling back to built files');
        const htmlPath = path.join(__dirname, 'index.html');
        await this.mainWindow.loadFile(htmlPath);
        if (isDev) this.mainWindow.webContents.openDevTools();
      }
    } else {
      // Load the built HTML file from dist directory
      const htmlPath = path.join(__dirname, 'index.html');
      await this.mainWindow.loadFile(htmlPath);

      // Open dev tools in development mode
      if (isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    log.info('Main window created successfully');

    // Initialize global shortcuts after window is created
    await this.initializeGlobalShortcuts();
  }

  private async initializeGlobalShortcuts(): Promise<void> {
    try {
      await this.globalShortcutManager.initialize();
      log.info('✅ Global shortcuts initialized');
    } catch (error) {
      log.error('❌ Failed to initialize global shortcuts:', error);
      // Don't throw error - app should continue without shortcuts
    }
  }

  private async handleGlobalRecordingToggle(): Promise<void> {
    try {
      log.info('🎹 Global recording toggle triggered');

      if (this.recordingModule.isCurrentlyRecording()) {
        log.info('⏹️ Stopping recording via global shortcut');
        const result = await this.recordingModule.stopRecording();
        this.sendToRenderer('recording-stopped', result);
        this.sendToRenderer('shortcut-notification', {
          message: 'Recording stopped via keyboard shortcut',
          type: 'success'
        });
      } else {
        log.info('🎬 Starting recording via global shortcut');
        // Use default recording config for global shortcut
        const defaultConfig = {
          sourceId: 'test', // Use test source for now
          quality: 'medium' as const
        };
        const result = await this.recordingModule.startRecording(defaultConfig);
        this.sendToRenderer('recording-started', result);
        this.sendToRenderer('shortcut-notification', {
          message: 'Recording started via keyboard shortcut',
          type: 'success'
        });
      }
    } catch (error) {
      log.error('❌ Error handling global recording toggle:', error);
      this.sendToRenderer('shortcut-notification', {
        message: `Recording error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    }
  }

  private handleShortcutConflict(shortcut: string, error: string): void {
    log.warn('⚠️ Shortcut conflict:', shortcut, error);
    this.sendToRenderer('shortcut-conflict', {
      shortcut,
      error,
      alternatives: this.globalShortcutManager.getRegisteredShortcuts()
    });
  }

  private setupIpcHandlers(): void {
    // Global shortcut handlers
    ipcMain.handle('get-shortcut-config', async () => {
      try {
        return this.globalShortcutManager.getShortcutConfig();
      } catch (error) {
        log.error('Error getting shortcut config:', error);
        throw error;
      }
    });

    ipcMain.handle('update-shortcut', async (event, shortcutType, newShortcut) => {
      try {
        return this.globalShortcutManager.updateShortcut(shortcutType, newShortcut);
      } catch (error) {
        log.error('Error updating shortcut:', error);
        throw error;
      }
    });

    ipcMain.handle('test-shortcut', async (event, accelerator) => {
      try {
        return await this.globalShortcutManager.testShortcut(accelerator);
      } catch (error) {
        log.error('Error testing shortcut:', error);
        throw error;
      }
    });

    ipcMain.handle('get-registered-shortcuts', async () => {
      try {
        return this.globalShortcutManager.getRegisteredShortcuts();
      } catch (error) {
        log.error('Error getting registered shortcuts:', error);
        throw error;
      }
    });

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
          status: 'Extracting frames from video...',
        });

        const frames = await this.videoProcessingModule.extractFrames(videoPath, projectPath);

        this.sendToRenderer('processing-progress', {
          percent: 30,
          status: 'Analyzing frames with AI vision...',
        });

        // Analyze frames with AI
        const analysisResults = await this.visionAnalysisModule.analyzeFrames(frames);

        this.sendToRenderer('processing-progress', {
          percent: 60,
          status: 'Building action sequence...',
        });

        // Generate action sequence
        const actionSequence = await this.actionSequenceModule.generateSequence(analysisResults);

        this.sendToRenderer('processing-progress', {
          percent: 80,
          status: 'Generating code...',
        });

        // Generate code
        const generatedCode = await this.codeGenerationModule.generateCode(
          actionSequence,
          projectPath
        );

        this.sendToRenderer('processing-progress', {
          percent: 100,
          status: 'Complete!',
        });

        this.sendToRenderer('generation-complete', {
          code: generatedCode,
          projectPath,
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

    // Multi-API Key Management
    ipcMain.handle('add-api-key', async (event, provider, key, options) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        const id = await visionModule.addAPIKey(provider, key, options);
        return id;
      } catch (error) {
        const appError = errorHandler.handleError(error, 'add-api-key');
        throw appError;
      }
    });

    ipcMain.handle('remove-api-key', async (event, keyId) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        const success = await visionModule.removeAPIKey(keyId);
        return success;
      } catch (error) {
        const appError = errorHandler.handleError(error, 'remove-api-key');
        throw appError;
      }
    });

    ipcMain.handle('get-api-key-status', async (_event) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return visionModule.getAPIKeyStatus();
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-api-key-status');
        throw appError;
      }
    });

    ipcMain.handle('get-free-provider-status', async (_event) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return visionModule.getFreeProviderStatus();
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-free-provider-status');
        throw appError;
      }
    });

    ipcMain.handle('get-usage-statistics', async (event) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        const stats = visionModule.getUsageStatistics();
        return Object.fromEntries(stats);
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-usage-statistics');
        throw appError;
      }
    });

    ipcMain.handle('reset-daily-usage', async (event) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        visionModule.resetDailyUsage();
        return true;
      } catch (error) {
        const appError = errorHandler.handleError(error, 'reset-daily-usage');
        throw appError;
      }
    });

    // Get available sources for recording
    ipcMain.handle('get-sources', async () => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
        });

        // Add a test source for development/testing
        const testSource = {
          id: 'test',
          name: '🎬 Test Recording (Demo Video)',
          thumbnail: Buffer.alloc(0), // Empty buffer for thumbnail
          display_id: '',
          appIcon: null
        };

        return [testSource, ...sources];
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

    // Enhanced Provider Management Handlers
    ipcMain.handle('get-providers-by-category', async (event, category) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return visionModule.enhancedProviderManager?.getProvidersByCategory(category) || {};
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-providers-by-category');
        throw appError;
      }
    });

    ipcMain.handle('get-provider-preferences', async (event) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return visionModule.enhancedProviderManager?.getProviderPreferences() || {};
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-provider-preferences');
        throw appError;
      }
    });

    ipcMain.handle('update-provider-preferences', async (event, preferences) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        visionModule.enhancedProviderManager?.updateProviderPreferences(preferences);
        return true;
      } catch (error) {
        const appError = errorHandler.handleError(error, 'update-provider-preferences');
        throw appError;
      }
    });

    ipcMain.handle('get-provider-statistics', async (event) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return visionModule.enhancedProviderManager?.getProviderStatistics() || [];
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-provider-statistics');
        throw appError;
      }
    });

    ipcMain.handle('get-budget-status', async (event) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return visionModule.enhancedProviderManager?.getBudgetStatus() || {};
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-budget-status');
        throw appError;
      }
    });

    ipcMain.handle('get-provider-recommendations', async (event) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return visionModule.enhancedProviderManager?.getProviderRecommendations() || [];
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-provider-recommendations');
        throw appError;
      }
    });

    // Model Management Handlers
    ipcMain.handle('validate-model', async (event, providerId, modelName, apiKey) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return await visionModule.validateModel(providerId, modelName, apiKey);
      } catch (error) {
        const appError = errorHandler.handleError(error, 'validate-model');
        throw appError;
      }
    });

    ipcMain.handle('discover-models', async (event, providerId, apiKey) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return await visionModule.discoverModels(providerId, apiKey);
      } catch (error) {
        const appError = errorHandler.handleError(error, 'discover-models');
        throw appError;
      }
    });

    ipcMain.handle(
      'add-custom-model',
      async (event, providerId, modelName, displayName, apiKey) => {
        try {
          const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
          const visionModule = new VisionAnalysisModule();
          return await visionModule.addCustomModel(providerId, modelName, displayName, apiKey);
        } catch (error) {
          const appError = errorHandler.handleError(error, 'add-custom-model');
          throw appError;
        }
      }
    );

    ipcMain.handle('get-model-configurations', async (event, providerId) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return visionModule.getModelConfigurations(providerId);
      } catch (error) {
        const appError = errorHandler.handleError(error, 'get-model-configurations');
        throw appError;
      }
    });

    ipcMain.handle('remove-custom-model', async (event, providerId, modelName) => {
      try {
        const { VisionAnalysisModule } = await import('../modules/VisionAnalysisModule');
        const visionModule = new VisionAnalysisModule();
        return await visionModule.removeCustomModel(providerId, modelName);
      } catch (error) {
        const appError = errorHandler.handleError(error, 'remove-custom-model');
        throw appError;
      }
    });
  }

  private sendToRenderer(channel: string, data: unknown): void {
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

app.on('before-quit', () => {
  // Clean up global shortcuts before quitting
  try {
    const recorder = new AutomatedDevelopmentRecorder();
    if (recorder['globalShortcutManager']) {
      recorder['globalShortcutManager'].destroy();
    }
  } catch (error) {
    log.error('Error cleaning up global shortcuts:', error);
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    log.warn('Blocked new window creation to:', url);
    return { action: 'deny' };
  });
});
