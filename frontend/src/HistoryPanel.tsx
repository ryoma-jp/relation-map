import React, { useState, useEffect } from 'react';
import { fetchVersions, restoreVersion, createCheckpoint, VersionInfo } from './api';
import './HistoryPanel.css';

interface HistoryPanelProps {
  onRefresh?: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ onRefresh }) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadVersions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchVersions();
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, []);

  const handleCreateCheckpoint = async () => {
    if (description.trim()) {
      setIsLoading(true);
      setError(null);
      try {
        await createCheckpoint(description);
        setDescription('');
        setShowInput(false);
        await loadVersions();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create checkpoint');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRestore = async (versionId: number) => {
    if (window.confirm('Are you sure you want to restore to this version? This cannot be undone.')) {
      setIsLoading(true);
      setError(null);
      try {
        await restoreVersion(versionId, true);
        await loadVersions();
        if (onRefresh) {
          onRefresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to restore version');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>Version History</h3>
        <button 
          className="btn-small" 
          onClick={() => setShowInput(!showInput)}
          disabled={isLoading}
        >
          + Checkpoint
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showInput && (
        <div className="checkpoint-input">
          <input
            type="text"
            placeholder="Checkpoint description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
            disabled={isLoading}
          />
          <button 
            onClick={handleCreateCheckpoint}
            disabled={isLoading || !description.trim()}
          >
            Save
          </button>
          <button 
            onClick={() => setShowInput(false)}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="history-list">
          {versions.length === 0 ? (
            <div className="empty-state">No versions yet</div>
          ) : (
            versions.map((version) => (
              <div key={version.id} className="history-item">
                <div className="version-info">
                  <span className="version-number">v{version.version_number}</span>
                  <span className="description">{version.description}</span>
                  <span className="timestamp">
                    {new Date(version.created_at).toLocaleString()}
                  </span>
                </div>
                <button
                  className="btn-restore"
                  onClick={() => handleRestore(version.id)}
                  disabled={isLoading}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
