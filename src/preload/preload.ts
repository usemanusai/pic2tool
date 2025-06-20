import { contextBridge, ipcRenderer } from 'electron';

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

  // Utility functions
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
