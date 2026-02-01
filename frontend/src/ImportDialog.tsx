import React, { useState } from 'react';

interface ImportDialogProps {
  onImport: (file: File, mode: 'merge' | 'replace') => Promise<void>;
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('ファイルを選択してください');
      return;
    }

    setLoading(true);
    try {
      await onImport(file, mode);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      alert('インポートに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2>データをインポート</h2>
        
        <div style={styles.section}>
          <label>ファイル選択:</label>
          <input 
            type="file" 
            accept=".json" 
            onChange={handleFileChange}
            aria-label="JSONファイルを選択"
          />
          {file && <p style={styles.fileName}>選択: {file.name}</p>}
        </div>

        <div style={styles.section}>
          <label>インポートモード:</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="merge"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
              />
              <span style={styles.radioText}>
                <strong>追加</strong> - 既存データを保持してインポート
              </span>
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="replace"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              <span style={styles.radioText}>
                <strong>置換</strong> - 既存データを削除してインポート
              </span>
            </label>
          </div>
        </div>

        {mode === 'replace' && (
          <div style={styles.warning}>
            ⚠️ すべての既存データが削除されます。この操作は取り消せません。
          </div>
        )}

        <div style={styles.actions}>
          <button 
            onClick={handleSubmit} 
            disabled={loading || !file} 
            style={{
              ...styles.button,
              opacity: loading || !file ? 0.5 : 1,
              cursor: loading || !file ? 'not-allowed' : 'pointer',
            }}
            aria-label="インポートを実行"
          >
            {loading ? 'インポート中...' : 'インポート'}
          </button>
          <button 
            onClick={onClose} 
            disabled={loading} 
            style={styles.cancelButton}
            aria-label="キャンセル"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    minWidth: '450px',
    maxWidth: '600px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  section: {
    marginBottom: '20px',
  },
  fileName: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#4DA1FF',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginTop: '8px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  radioText: {
    display: 'flex',
    flexDirection: 'column' as const,
    fontSize: '14px',
  },
  warning: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    color: '#856404',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4DA1FF',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#757575',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
};
