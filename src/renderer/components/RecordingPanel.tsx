import React, { useState, useEffect } from 'react';

interface RecordingPanelProps {
  isRecording: boolean;
  onStartRecording: (config: any) => void;
  onStopRecording: () => void;
}

interface Source {
  id: string;
  name: string;
  thumbnail: any;
}

const RecordingPanel: React.FC<RecordingPanelProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
}) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [loadingSources, setLoadingSources] = useState(false);

  useEffect(() => {
    // Wait a bit for electronAPI to be available
    const timer = setTimeout(() => {
      loadSources();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const loadSources = async () => {
    try {
      setLoadingSources(true);

      // Check if electronAPI is available
      if (!window.electronAPI) {
        console.warn('electronAPI not available, skipping source loading');
        return;
      }

      console.log('🔍 Loading recording sources...');
      const availableSources = await window.electronAPI.getSources();
      console.log('✅ Sources loaded:', availableSources.length);
      setSources(availableSources);

      // Auto-select the first screen source
      const screenSource = availableSources.find(
        (source: any) =>
          source.name.toLowerCase().includes('screen') ||
          source.name.toLowerCase().includes('entire')
      );
      if (screenSource) {
        setSelectedSource(screenSource.id);
        console.log('✅ Auto-selected screen source:', screenSource.name);
      }
    } catch (error) {
      console.error('❌ Failed to load sources:', error);
      // Don't throw the error, just log it
    } finally {
      setLoadingSources(false);
    }
  };

  const handleStartRecording = () => {
    if (!selectedSource) {
      alert('Please select a source to record');
      return;
    }

    const config = {
      sourceId: selectedSource,
      outputPath: outputPath || `recording-${Date.now()}.webm`,
      quality,
    };

    onStartRecording(config);
  };

  return (
    <div className="recording-panel">
      <h3>Screen Recording</h3>

      <div className="form-group">
        <label htmlFor="source-select">Select Source:</label>
        <div className="source-selection">
          <select
            id="source-select"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            disabled={isRecording || loadingSources}
          >
            <option value="">{loadingSources ? 'Loading sources...' : 'Select a source'}</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
          <button
            className="refresh-button"
            onClick={loadSources}
            disabled={isRecording || loadingSources}
            title="Refresh sources"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="output-path">Output Path (optional):</label>
        <input
          id="output-path"
          type="text"
          value={outputPath}
          onChange={(e) => setOutputPath(e.target.value)}
          placeholder="Leave empty for auto-generated name"
          disabled={isRecording}
        />
      </div>

      <div className="form-group">
        <label htmlFor="quality-select">Quality:</label>
        <select
          id="quality-select"
          value={quality}
          onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}
          disabled={isRecording}
        >
          <option value="low">Low (1 Mbps)</option>
          <option value="medium">Medium (2.5 Mbps)</option>
          <option value="high">High (5 Mbps)</option>
        </select>
      </div>

      <div className="recording-controls">
        {!isRecording ? (
          <button
            className="record-button start"
            onClick={handleStartRecording}
            disabled={!selectedSource || loadingSources}
          >
            🔴 Start Recording
          </button>
        ) : (
          <button className="record-button stop" onClick={onStopRecording}>
            ⏹️ Stop Recording
          </button>
        )}
      </div>

      {isRecording && (
        <div className="recording-indicator">
          <div className="recording-dot"></div>
          <span>Recording in progress...</span>
        </div>
      )}

      <div className="recording-tips">
        <h4>Recording Tips:</h4>
        <ul>
          <li>Perform your workflow slowly and deliberately</li>
          <li>Avoid rapid mouse movements</li>
          <li>Keep actions clear and distinct</li>
          <li>Wait briefly between actions</li>
        </ul>
      </div>
    </div>
  );
};

export default RecordingPanel;
