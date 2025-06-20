import '@testing-library/jest-dom';

// Mock Electron APIs
const mockElectronAPI = {
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  processVideo: jest.fn(),
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  getSources: jest.fn(),
  onRecordingStarted: jest.fn(),
  onRecordingStopped: jest.fn(),
  onProcessingProgress: jest.fn(),
  onGenerationComplete: jest.fn(),
  onProcessingError: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock MediaRecorder
global.MediaRecorder = class MockMediaRecorder {
  constructor() {}
  start() {}
  stop() {}
  ondataavailable = null;
  onstop = null;
  stream = {
    getTracks: () => [{ stop: () => {} }],
  };
} as any;

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: () => {} }],
    }),
  },
  writable: true,
});

// Suppress console warnings in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag Warning')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
