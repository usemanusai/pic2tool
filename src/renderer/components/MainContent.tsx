import React, { useState } from 'react';
import { AppState } from '../App';
import RecordingPanel from './RecordingPanel';
import ProcessingPanel from './ProcessingPanel';
import CodeDisplay from './CodeDisplay';
import ConfigPanel from './ConfigPanel';
import ShortcutConfigPanel from './ShortcutConfigPanel';

interface MainContentProps {
  appState: AppState;
  onStartRecording: (config: any) => void;
  onStopRecording: () => void;
  onProcessVideo: (videoPath: string, projectPath: string) => void;
  onClearError: () => void;
  onClearResults: () => void;
}

const MainContent: React.FC<MainContentProps> = ({
  appState,
  onStartRecording,
  onStopRecording,
  onProcessVideo,
  onClearError,
  onClearResults,
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'process' | 'config' | 'shortcuts'>('record');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'record':
        return (
          <RecordingPanel
            isRecording={appState.isRecording}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
          />
        );
      case 'process':
        return (
          <ProcessingPanel isProcessing={appState.isProcessing} onProcessVideo={onProcessVideo} />
        );
      case 'config':
        return <ConfigPanel />;
      case 'shortcuts':
        return <ShortcutConfigPanel />;
      default:
        return null;
    }
  };

  return (
    <main className="main-content">
      {/* Error Display */}
      {appState.error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{appState.error}</span>
            <button className="error-close" onClick={onClearError}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="content-layout">
        {/* Left Panel - Controls */}
        <div className="left-panel">
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'record' ? 'active' : ''}`}
              onClick={() => setActiveTab('record')}
            >
              📹 Record
            </button>
            <button
              className={`tab-button ${activeTab === 'process' ? 'active' : ''}`}
              onClick={() => setActiveTab('process')}
            >
              ⚙️ Process
            </button>
            <button
              className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              🔧 Config
            </button>
            <button
              className={`tab-button ${activeTab === 'shortcuts' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              🎹 Shortcuts
            </button>
          </div>

          <div className="tab-content">{renderTabContent()}</div>
        </div>

        {/* Right Panel - Results */}
        <div className="right-panel">
          <CodeDisplay generatedCode={appState.generatedCode} onClearResults={onClearResults} />
        </div>
      </div>
    </main>
  );
};

export default MainContent;
