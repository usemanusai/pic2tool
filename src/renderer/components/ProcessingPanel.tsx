import React, { useState } from 'react';

interface ProcessingPanelProps {
  isProcessing: boolean;
  onProcessVideo: (videoPath: string, projectPath: string) => void;
}

const ProcessingPanel: React.FC<ProcessingPanelProps> = ({
  isProcessing,
  onProcessVideo
}) => {
  const [videoPath, setVideoPath] = useState<string>('');
  const [projectPath, setProjectPath] = useState<string>('');

  const handleFileSelect = async (type: 'video' | 'project') => {
    try {
      if (type === 'video') {
        const result = await window.electronAPI.showOpenDialog({
          title: 'Select Video File',
          filters: [
            { name: 'Video Files', extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
          setVideoPath(result.filePaths[0]);
        }
      } else {
        const result = await window.electronAPI.showOpenDialog({
          title: 'Select Project Folder',
          properties: ['openDirectory', 'createDirectory']
        });

        if (!result.canceled && result.filePaths.length > 0) {
          setProjectPath(result.filePaths[0]);
        }
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      alert('Failed to open file dialog');
    }
  };

  const handleProcessVideo = () => {
    if (!videoPath.trim()) {
      alert('Please select a video file');
      return;
    }

    const finalProjectPath = projectPath.trim() || `project-${Date.now()}`;
    onProcessVideo(videoPath, finalProjectPath);
  };

  return (
    <div className="processing-panel">
      <h3>Video Processing</h3>
      
      <div className="form-group">
        <label>Video File:</label>
        <div className="file-input-group">
          <input
            type="text"
            value={videoPath}
            onChange={(e) => setVideoPath(e.target.value)}
            placeholder="Select or enter video file path"
            disabled={isProcessing}
          />
          <button
            className="file-select-button"
            onClick={() => handleFileSelect('video')}
            disabled={isProcessing}
          >
            📁 Browse
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Project Folder:</label>
        <div className="file-input-group">
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="Leave empty for auto-generated folder"
            disabled={isProcessing}
          />
          <button
            className="file-select-button"
            onClick={() => handleFileSelect('project')}
            disabled={isProcessing}
          >
            📁 Browse
          </button>
        </div>
      </div>

      <div className="processing-controls">
        <button
          className="process-button"
          onClick={handleProcessVideo}
          disabled={isProcessing || !videoPath.trim()}
        >
          {isProcessing ? '⚙️ Processing...' : '🚀 Process Video'}
        </button>
      </div>

      <div className="processing-info">
        <h4>Processing Steps:</h4>
        <ol>
          <li>Extract frames from video</li>
          <li>Analyze frames with AI vision</li>
          <li>Build action sequence</li>
          <li>Generate executable code</li>
        </ol>
      </div>

      <div className="processing-notes">
        <h4>Notes:</h4>
        <ul>
          <li>Processing time depends on video length and complexity</li>
          <li>Ensure you have configured API keys in the Config tab</li>
          <li>Large videos may take several minutes to process</li>
        </ul>
      </div>
    </div>
  );
};

export default ProcessingPanel;
