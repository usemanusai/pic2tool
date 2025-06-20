import { contextBridge, ipcRenderer } from 'electron';

console.log('🔧 Preload script starting...');
console.log('🔧 contextBridge available:', !!contextBridge);
console.log('🔧 ipcRenderer available:', !!ipcRenderer);

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // Recording functions
  startRecording: (config: any) => ipcRenderer.invoke('start-recording', config),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),

  // Video processing functions
  processVideo: (videoPath: string, projectPath: string) =>
    ipcRenderer.invoke('process-video', videoPath, projectPath),

  // Settings functions
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Multi-API Key Management
  addAPIKey: (provider: string, key: string, options?: any) =>
    ipcRenderer.invoke('add-api-key', provider, key, options),
  removeAPIKey: (keyId: string) => ipcRenderer.invoke('remove-api-key', keyId),
  getAPIKeyStatus: () => ipcRenderer.invoke('get-api-key-status'),
  getFreeProviderStatus: () => ipcRenderer.invoke('get-free-provider-status'),
  getUsageStatistics: () => ipcRenderer.invoke('get-usage-statistics'),
  resetDailyUsage: () => ipcRenderer.invoke('reset-daily-usage'),

  // Enhanced Provider Management
  getProvidersByCategory: (category?: string) =>
    ipcRenderer.invoke('get-providers-by-category', category),
  getProviderPreferences: () => ipcRenderer.invoke('get-provider-preferences'),
  updateProviderPreferences: (preferences: any) =>
    ipcRenderer.invoke('update-provider-preferences', preferences),
  getProviderStatistics: () => ipcRenderer.invoke('get-provider-statistics'),
  getBudgetStatus: () => ipcRenderer.invoke('get-budget-status'),
  getProviderRecommendations: () => ipcRenderer.invoke('get-provider-recommendations'),

  // Model Management
  validateModel: (providerId: string, modelName: string, apiKey?: string) =>
    ipcRenderer.invoke('validate-model', providerId, modelName, apiKey),
  discoverModels: (providerId: string, apiKey?: string) =>
    ipcRenderer.invoke('discover-models', providerId, apiKey),
  addCustomModel: (providerId: string, modelName: string, displayName: string, apiKey?: string) =>
    ipcRenderer.invoke('add-custom-model', providerId, modelName, displayName, apiKey),
  getModelConfigurations: (providerId: string) =>
    ipcRenderer.invoke('get-model-configurations', providerId),
  removeCustomModel: (providerId: string, modelName: string) =>
    ipcRenderer.invoke('remove-custom-model', providerId, modelName),

  // Source selection for recording
  getSources: () => ipcRenderer.invoke('get-sources'),

  // Event listeners for main process communications
  onRecordingStarted: (callback: (data: any) => void) => {
    ipcRenderer.on('recording-started', (event, data) => callback(data));
  },

  onRecordingStopped: (callback: (data: any) => void) => {
    ipcRenderer.on('recording-stopped', (event, data) => callback(data));
  },

  onProcessingProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('processing-progress', (event, data) => callback(data));
  },

  onGenerationComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('generation-complete', (event, data) => callback(data));
  },

  onProcessingError: (callback: (data: any) => void) => {
    ipcRenderer.on('processing-error', (event, data) => callback(data));
  },

  // File system functions
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('show-item-in-folder', fullPath),

  // Global Shortcuts
  getShortcutConfig: () => ipcRenderer.invoke('get-shortcut-config'),
  updateShortcut: (shortcutType: string, newShortcut: string) => ipcRenderer.invoke('update-shortcut', shortcutType, newShortcut),
  testShortcut: (accelerator: string) => ipcRenderer.invoke('test-shortcut', accelerator),
  getRegisteredShortcuts: () => ipcRenderer.invoke('get-registered-shortcuts'),

  // Global shortcut event listeners
  onShortcutNotification: (callback: (data: any) => void) => {
    ipcRenderer.on('shortcut-notification', (event, data) => callback(data));
  },
  onShortcutConflict: (callback: (data: any) => void) => {
    ipcRenderer.on('shortcut-conflict', (event, data) => callback(data));
  },

  // Utility functions
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the renderer process
console.log('🌉 Exposing electronAPI to main world...');
try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('✅ electronAPI exposed successfully');
  console.log('🔍 electronAPI methods:', Object.keys(electronAPI));
} catch (error) {
  console.error('❌ Failed to expose electronAPI:', error);
}

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
