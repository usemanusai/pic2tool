import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import MainContent from './components/MainContent';
import StatusBar from './components/StatusBar';

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
  const [appState, setAppState] = useState<AppState>({
    isRecording: false,
    isProcessing: false,
    progress: {
      percent: 0,
      status: 'Ready'
    },
    generatedCode: null,
    error: null
  });

  useEffect(() => {
    // Set up IPC listeners
    const setupListeners = () => {
      // Recording events
      window.electronAPI.onRecordingStarted((data: any) => {
        console.log('Recording started:', data);
        setAppState(prev => ({
          ...prev,
          isRecording: true,
          error: null,
          progress: { percent: 0, status: 'Recording...' }
        }));
      });

      window.electronAPI.onRecordingStopped((data: any) => {
        console.log('Recording stopped:', data);
        setAppState(prev => ({
          ...prev,
          isRecording: false,
          progress: { percent: 0, status: 'Recording complete. Ready to process.' }
        }));
      });

      // Processing events
      window.electronAPI.onProcessingProgress((data: any) => {
        console.log('Processing progress:', data);
        setAppState(prev => ({
          ...prev,
          isProcessing: true,
          progress: {
            percent: data.percent,
            status: data.status
          }
        }));
      });

      window.electronAPI.onGenerationComplete((data: any) => {
        console.log('Generation complete:', data);
        setAppState(prev => ({
          ...prev,
          isProcessing: false,
          generatedCode: data.code,
          progress: { percent: 100, status: 'Code generation complete!' }
        }));
      });

      window.electronAPI.onProcessingError((data: any) => {
        console.error('Processing error:', data);
        setAppState(prev => ({
          ...prev,
          isProcessing: false,
          error: data.error,
          progress: { percent: 0, status: 'Error occurred' }
        }));
      });
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeAllListeners('recording-started');
      window.electronAPI.removeAllListeners('recording-stopped');
      window.electronAPI.removeAllListeners('processing-progress');
      window.electronAPI.removeAllListeners('generation-complete');
      window.electronAPI.removeAllListeners('processing-error');
    };
  }, []);

  const handleStartRecording = async (config: any) => {
    try {
      setAppState(prev => ({ ...prev, error: null }));
      await window.electronAPI.startRecording(config);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setAppState(prev => ({
        ...prev,
        error: `Failed to start recording: ${error.message}`
      }));
    }
  };

  const handleStopRecording = async () => {
    try {
      await window.electronAPI.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setAppState(prev => ({
        ...prev,
        error: `Failed to stop recording: ${error.message}`
      }));
    }
  };

  const handleProcessVideo = async (videoPath: string, projectPath: string) => {
    try {
      setAppState(prev => ({ 
        ...prev, 
        error: null,
        generatedCode: null,
        progress: { percent: 0, status: 'Starting video processing...' }
      }));
      await window.electronAPI.processVideo(videoPath, projectPath);
    } catch (error) {
      console.error('Failed to process video:', error);
      setAppState(prev => ({
        ...prev,
        error: `Failed to process video: ${error.message}`,
        isProcessing: false
      }));
    }
  };

  const handleClearError = () => {
    setAppState(prev => ({ ...prev, error: null }));
  };

  const handleClearResults = () => {
    setAppState(prev => ({
      ...prev,
      generatedCode: null,
      progress: { percent: 0, status: 'Ready' }
    }));
  };

  return (
    <div className="app">
      <Header />
      <MainContent
        appState={appState}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onProcessVideo={handleProcessVideo}
        onClearError={handleClearError}
        onClearResults={handleClearResults}
      />
      <StatusBar
        progress={appState.progress}
        isRecording={appState.isRecording}
        isProcessing={appState.isProcessing}
        error={appState.error}
      />
    </div>
  );
};

export default App;
