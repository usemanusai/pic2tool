import React, { useState } from 'react';

interface CodeDisplayProps {
  generatedCode: any;
  onClearResults: () => void;
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({ generatedCode, onClearResults }) => {
  const [selectedFile, setSelectedFile] = useState<number>(0);

  const handleCopyFile = async () => {
    if (!generatedCode || !generatedCode.files[selectedFile]) return;

    try {
      await navigator.clipboard.writeText(generatedCode.files[selectedFile].content);
      alert('File content copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleCopyAll = async () => {
    if (!generatedCode) return;

    try {
      const allContent = generatedCode.files
        .map((file: any) => `// ${file.path}\n${file.content}\n\n`)
        .join('');

      await navigator.clipboard.writeText(allContent);
      alert('All files copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleExport = async () => {
    if (!generatedCode) return;

    try {
      const result = await window.electronAPI.showSaveDialog({
        title: 'Export Generated Code',
        defaultPath: `generated-${Date.now()}`,
        properties: ['createDirectory'],
      });

      if (!result.canceled && result.filePath) {
        // The actual file saving would be handled by the main process
        alert(`Code will be exported to: ${result.filePath}`);
      }
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Failed to export files');
    }
  };

  const handleShowInFolder = async () => {
    if (!generatedCode || !generatedCode.projectPath) return;

    try {
      await window.electronAPI.showItemInFolder(generatedCode.projectPath);
    } catch (error) {
      console.error('Failed to show in folder:', error);
      alert('Failed to open folder');
    }
  };

  if (!generatedCode) {
    return (
      <div className="code-display empty">
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No Code Generated</h3>
          <p>Record a workflow and process it to see generated code here.</p>
        </div>
      </div>
    );
  }

  const { type, files, instructions, dependencies } = generatedCode;

  return (
    <div className="code-display">
      <div className="code-header">
        <div className="code-title">
          <h3>Generated {type === 'script' ? 'Script' : 'Application'}</h3>
          <span className="file-count">{files.length} files</span>
        </div>
        <div className="code-actions">
          <button className="action-button" onClick={handleCopyFile} title="Copy current file">
            📋
          </button>
          <button className="action-button" onClick={handleCopyAll} title="Copy all files">
            📄
          </button>
          <button className="action-button" onClick={handleExport} title="Export to folder">
            📁
          </button>
          <button className="action-button" onClick={handleShowInFolder} title="Show in folder">
            🔍
          </button>
          <button className="action-button" onClick={onClearResults} title="Clear results">
            🗑️
          </button>
        </div>
      </div>

      {/* File Tabs */}
      <div className="file-tabs">
        {files.map((file: any, index: number) => (
          <button
            key={index}
            className={`file-tab ${selectedFile === index ? 'active' : ''}`}
            onClick={() => setSelectedFile(index)}
            title={file.description}
          >
            {file.path.split('/').pop()}
          </button>
        ))}
      </div>

      {/* File Content */}
      <div className="file-content">
        <div className="file-header">
          <span className="file-path">{files[selectedFile]?.path}</span>
          <span className="file-description">{files[selectedFile]?.description}</span>
        </div>
        <pre className="code-content">
          <code>{files[selectedFile]?.content}</code>
        </pre>
      </div>

      {/* Instructions Panel */}
      <div className="instructions-panel">
        <h4>Setup Instructions</h4>
        <div className="instructions-content">
          <pre>{instructions}</pre>
        </div>

        {dependencies && dependencies.length > 0 && (
          <div className="dependencies">
            <h5>Dependencies:</h5>
            <ul>
              {dependencies.map((dep: string, index: number) => (
                <li key={index}>{dep}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeDisplay;
