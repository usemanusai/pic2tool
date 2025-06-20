import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import MainContent from './components/MainContent';
import StatusBar from './components/StatusBar';
import ErrorBoundary from './components/ErrorBoundary';

export interface AppState {
  isRecording: boolean;
  isProcessing: boolean;
  progress: {
    percent: number;
    status: string;
  };
  generatedCode: any;
  error: string | null;
}

const App: React.FC = () => {
  console.log('🚀 App component rendering...');
  console.log('📡 electronAPI available:', !!window.electronAPI);
  console.log('🌍 Environment:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isElectron: !!window.electronAPI
  });

  const [appState, setAppState] = useState<AppState>({
    isRecording: false,
    isProcessing: false,
    progress: {
      percent: 0,
      status: window.electronAPI ? 'Ready' : 'Loading Electron API...',
    },
    generatedCode: null,
    error: null,
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('🔧 App useEffect running...');

    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('❌ electronAPI not available, waiting...');
      const checkAPI = setInterval(() => {
        if (window.electronAPI) {
          console.log('✅ electronAPI now available!');
          clearInterval(checkAPI);
          setIsInitialized(true);
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkAPI);
        if (!window.electronAPI) {
          console.error('❌ electronAPI timeout - not available after 5 seconds');
          setAppState(prev => ({
            ...prev,
            error: 'Electron API not available. Please restart the application.'
          }));
        }
      }, 5000);

      return () => clearInterval(checkAPI);
    }

    // Set up IPC listeners
    const setupListeners = () => {
      console.log('🎧 Setting up IPC listeners...');

      try {
        // Recording events
        window.electronAPI.onRecordingStarted((data: any) => {
          console.log('📹 Recording started:', data);
          setAppState((prev) => ({
            ...prev,
            isRecording: true,
            error: null,
            progress: { percent: 0, status: 'Recording...' },
          }));
        });

        window.electronAPI.onRecordingStopped((data: any) => {
          console.log('⏹️ Recording stopped:', data);
          setAppState((prev) => ({
            ...prev,
            isRecording: false,
            progress: { percent: 0, status: 'Recording complete. Ready to process.' },
          }));
        });

        // Processing events
        window.electronAPI.onProcessingProgress((data: any) => {
          console.log('⚙️ Processing progress:', data);
          setAppState((prev) => ({
            ...prev,
            isProcessing: true,
            progress: {
              percent: data.percent,
              status: data.status,
            },
          }));
        });

        window.electronAPI.onGenerationComplete((data: any) => {
          console.log('✅ Generation complete:', data);
          setAppState((prev) => ({
            ...prev,
            isProcessing: false,
            generatedCode: data.code,
            progress: { percent: 100, status: 'Code generation complete!' },
          }));
        });

        window.electronAPI.onProcessingError((data: any) => {
          console.error('❌ Processing error:', data);
          setAppState((prev) => ({
            ...prev,
            isProcessing: false,
            error: data.error,
            progress: { percent: 0, status: 'Error occurred' },
          }));
        });

        console.log('✅ All IPC listeners set up successfully');
      } catch (error) {
        console.error('❌ Error setting up IPC listeners:', error);
        setAppState(prev => ({
          ...prev,
          error: `Failed to set up IPC listeners: ${error instanceof Error ? error.message : String(error)}`
        }));
      }
    };

    setupListeners();
    setIsInitialized(true);

    // Cleanup listeners on unmount
    return () => {
      console.log('🧹 Cleaning up IPC listeners...');
      try {
        if (window.electronAPI) {
          window.electronAPI.removeAllListeners('recording-started');
          window.electronAPI.removeAllListeners('recording-stopped');
          window.electronAPI.removeAllListeners('processing-progress');
          window.electronAPI.removeAllListeners('generation-complete');
          window.electronAPI.removeAllListeners('processing-error');
        }
      } catch (error) {
        console.error('❌ Error cleaning up listeners:', error);
      }
    };
  }, []);

  const handleStartRecording = async (config: any) => {
    console.log('🎬 Starting recording with config:', config);
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      setAppState((prev) => ({ ...prev, error: null }));
      await window.electronAPI.startRecording(config);
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setAppState((prev) => ({
        ...prev,
        error: `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`,
      }));
    }
  };

  const handleStopRecording = async () => {
    try {
      await window.electronAPI.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setAppState((prev) => ({
        ...prev,
        error: `Failed to stop recording: ${error.message}`,
      }));
    }
  };

  const handleProcessVideo = async (videoPath: string, projectPath: string) => {
    try {
      setAppState((prev) => ({
        ...prev,
        error: null,
        generatedCode: null,
        progress: { percent: 0, status: 'Starting video processing...' },
      }));
      await window.electronAPI.processVideo(videoPath, projectPath);
    } catch (error) {
      console.error('Failed to process video:', error);
      setAppState((prev) => ({
        ...prev,
        error: `Failed to process video: ${error.message}`,
        isProcessing: false,
      }));
    }
  };

  const handleClearError = () => {
    setAppState((prev) => ({ ...prev, error: null }));
  };

  const handleClearResults = () => {
    setAppState((prev) => ({
      ...prev,
      generatedCode: null,
      progress: { percent: 0, status: 'Ready' },
    }));
  };

  // Show loading state if not initialized
  if (!isInitialized && !appState.error) {
    return (
      <div className="app" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Initializing Automated Development Recorder...</p>
        <p style={{ fontSize: '0.8em', color: '#666' }}>
          electronAPI: {window.electronAPI ? '✅ Available' : '❌ Loading...'}
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <ErrorBoundary fallback={<div style={{padding: '20px', color: 'red'}}>Header failed to load</div>}>
          <Header />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div style={{padding: '20px', color: 'red'}}>Main content failed to load</div>}>
          <MainContent
            appState={appState}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onProcessVideo={handleProcessVideo}
            onClearError={handleClearError}
            onClearResults={handleClearResults}
          />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div style={{padding: '20px', color: 'red'}}>Status bar failed to load</div>}>
          <StatusBar
            progress={appState.progress}
            isRecording={appState.isRecording}
            isProcessing={appState.isProcessing}
            error={appState.error}
          />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

export default App;
