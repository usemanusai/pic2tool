import React from 'react';

interface StatusBarProps {
  progress: {
    percent: number;
    status: string;
  };
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ progress, isRecording, isProcessing, error }) => {
  const getStatusIcon = () => {
    if (error) return '❌';
    if (isRecording) return '🔴';
    if (isProcessing) return '⚙️';
    if (progress.percent === 100) return '✅';
    return '⚪';
  };

  const getStatusClass = () => {
    if (error) return 'error';
    if (isRecording) return 'recording';
    if (isProcessing) return 'processing';
    if (progress.percent === 100) return 'complete';
    return 'ready';
  };

  return (
    <div className={`status-bar ${getStatusClass()}`}>
      <div className="status-content">
        <div className="status-info">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{progress.status}</span>
        </div>

        {(isProcessing || progress.percent > 0) && (
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.percent}%` }}></div>
            </div>
            <span className="progress-percent">{progress.percent}%</span>
          </div>
        )}

        <div className="status-details">
          {isRecording && (
            <span className="recording-indicator">
              <span className="recording-dot"></span>
              REC
            </span>
          )}
          {isProcessing && <span className="processing-indicator">Processing...</span>}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
