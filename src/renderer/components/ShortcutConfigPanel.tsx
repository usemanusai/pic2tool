import React, { useState, useEffect } from 'react';

interface ShortcutConfig {
  recordingToggle: string;
  enabled: boolean;
}

interface ShortcutNotification {
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface ShortcutConflict {
  shortcut: string;
  error: string;
  alternatives: string[];
}

const ShortcutConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<ShortcutConfig>({
    recordingToggle: 'CommandOrControl+Shift+R',
    enabled: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState('');
  const [notification, setNotification] = useState<ShortcutNotification | null>(null);
  const [conflict, setConflict] = useState<ShortcutConflict | null>(null);
  const [registeredShortcuts, setRegisteredShortcuts] = useState<string[]>([]);

  useEffect(() => {
    loadShortcutConfig();
    loadRegisteredShortcuts();
    setupEventListeners();
  }, []);

  const loadShortcutConfig = async () => {
    try {
      if (window.electronAPI) {
        const shortcutConfig = await window.electronAPI.getShortcutConfig();
        setConfig(shortcutConfig);
      }
    } catch (error) {
      console.error('Failed to load shortcut config:', error);
    }
  };

  const loadRegisteredShortcuts = async () => {
    try {
      if (window.electronAPI) {
        const shortcuts = await window.electronAPI.getRegisteredShortcuts();
        setRegisteredShortcuts(shortcuts);
      }
    } catch (error) {
      console.error('Failed to load registered shortcuts:', error);
    }
  };

  const setupEventListeners = () => {
    if (window.electronAPI) {
      window.electronAPI.onShortcutNotification((data: ShortcutNotification) => {
        setNotification(data);
        setTimeout(() => setNotification(null), 5000);
      });

      window.electronAPI.onShortcutConflict((data: ShortcutConflict) => {
        setConflict(data);
      });
    }
  };

  const handleShortcutEdit = () => {
    setIsEditing(true);
    setEditingShortcut(config.recordingToggle);
  };

  const handleShortcutSave = async () => {
    try {
      if (window.electronAPI) {
        // Test the shortcut first
        const isValid = await window.electronAPI.testShortcut(editingShortcut);
        
        if (isValid) {
          const success = await window.electronAPI.updateShortcut('recordingToggle', editingShortcut);
          if (success) {
            setConfig(prev => ({ ...prev, recordingToggle: editingShortcut }));
            setIsEditing(false);
            setNotification({
              message: `Shortcut updated to: ${editingShortcut}`,
              type: 'success'
            });
            loadRegisteredShortcuts();
          } else {
            setNotification({
              message: 'Failed to update shortcut',
              type: 'error'
            });
          }
        } else {
          setNotification({
            message: `Shortcut "${editingShortcut}" is not available or invalid`,
            type: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Error saving shortcut:', error);
      setNotification({
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    }
  };

  const handleShortcutCancel = () => {
    setIsEditing(false);
    setEditingShortcut('');
  };

  const handleEnabledToggle = async () => {
    try {
      if (window.electronAPI) {
        const newEnabled = !config.enabled;
        const success = await window.electronAPI.updateShortcut('enabled', newEnabled.toString());
        if (success) {
          setConfig(prev => ({ ...prev, enabled: newEnabled }));
          setNotification({
            message: `Global shortcuts ${newEnabled ? 'enabled' : 'disabled'}`,
            type: 'success'
          });
          if (newEnabled) {
            loadRegisteredShortcuts();
          } else {
            setRegisteredShortcuts([]);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling shortcuts:', error);
      setNotification({
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    }
  };

  const handleConflictResolve = async (alternative: string) => {
    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.updateShortcut('recordingToggle', alternative);
        if (success) {
          setConfig(prev => ({ ...prev, recordingToggle: alternative }));
          setConflict(null);
          setNotification({
            message: `Shortcut updated to alternative: ${alternative}`,
            type: 'success'
          });
          loadRegisteredShortcuts();
        }
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  };

  return (
    <div className="shortcut-config-panel">
      <h3>🎹 Global Keyboard Shortcuts</h3>
      
      {/* Enable/Disable Toggle */}
      <div className="shortcut-setting">
        <label className="shortcut-toggle">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleEnabledToggle}
          />
          <span className="toggle-slider"></span>
          Enable Global Shortcuts
        </label>
        <p className="setting-description">
          Allow keyboard shortcuts to work system-wide, even when the app is not in focus
        </p>
      </div>

      {/* Recording Toggle Shortcut */}
      <div className="shortcut-setting">
        <label>Recording Toggle Shortcut:</label>
        <div className="shortcut-input-group">
          {isEditing ? (
            <>
              <input
                type="text"
                value={editingShortcut}
                onChange={(e) => setEditingShortcut(e.target.value)}
                placeholder="e.g., CommandOrControl+Shift+R"
                className="shortcut-input"
              />
              <button onClick={handleShortcutSave} className="btn-save">
                ✅ Save
              </button>
              <button onClick={handleShortcutCancel} className="btn-cancel">
                ❌ Cancel
              </button>
            </>
          ) : (
            <>
              <span className="shortcut-display">{config.recordingToggle}</span>
              <button 
                onClick={handleShortcutEdit} 
                className="btn-edit"
                disabled={!config.enabled}
              >
                ✏️ Edit
              </button>
            </>
          )}
        </div>
        <p className="setting-description">
          Press this key combination to start/stop recording from anywhere in the system
        </p>
      </div>

      {/* Registered Shortcuts Display */}
      {config.enabled && registeredShortcuts.length > 0 && (
        <div className="registered-shortcuts">
          <h4>📋 Currently Registered:</h4>
          <ul>
            {registeredShortcuts.map((shortcut, index) => (
              <li key={index} className="registered-shortcut">
                <code>{shortcut}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notification Display */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' ? '✅' : 
             notification.type === 'error' ? '❌' : '⚠️'}
          </span>
          {notification.message}
        </div>
      )}

      {/* Conflict Resolution */}
      {conflict && (
        <div className="conflict-resolution">
          <h4>⚠️ Shortcut Conflict</h4>
          <p>The shortcut <code>{conflict.shortcut}</code> is already in use:</p>
          <p className="error-message">{conflict.error}</p>
          
          {conflict.alternatives.length > 0 && (
            <>
              <p>Try one of these alternatives:</p>
              <div className="alternative-shortcuts">
                {conflict.alternatives.map((alt, index) => (
                  <button
                    key={index}
                    onClick={() => handleConflictResolve(alt)}
                    className="btn-alternative"
                  >
                    {alt}
                  </button>
                ))}
              </div>
            </>
          )}
          
          <button 
            onClick={() => setConflict(null)} 
            className="btn-dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="shortcut-help">
        <h4>💡 Shortcut Format Help</h4>
        <ul>
          <li><code>CommandOrControl</code> - Cmd on Mac, Ctrl on Windows/Linux</li>
          <li><code>Shift</code> - Shift key</li>
          <li><code>Alt</code> - Alt key (Option on Mac)</li>
          <li><code>F1-F12</code> - Function keys</li>
          <li>Combine with <code>+</code> (e.g., <code>CommandOrControl+Shift+R</code>)</li>
        </ul>
      </div>
    </div>
  );
};

export default ShortcutConfigPanel;
