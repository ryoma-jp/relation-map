import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuditLogEntry, AdminUserList, deleteAdminUser, fetchAdminUsers, fetchAuditLogs, User } from './api';

const PAGE_SIZE = 20;

type Props = {
  currentUser: User;
  onBack: () => void;
};

const AdminPage: React.FC<Props> = ({ currentUser, onBack }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUserList>({ total: 0, items: [] });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const fetchUsers = useCallback(async (search: string, pageOffset: number) => {
    setLoadingUsers(true);
    try {
      const result = await fetchAdminUsers({ query: search.trim() || undefined, limit: PAGE_SIZE, offset: pageOffset });
      setUsers(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const result = await fetchAuditLogs({ limit: 50, offset: 0 });
      setAuditLogs(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setOffset(0);
      fetchUsers(query, 0);
    }, 250);
    return () => window.clearTimeout(handler);
  }, [query, fetchUsers]);

  useEffect(() => {
    fetchUsers(query, offset);
  }, [fetchUsers, query, offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = useMemo(() => Math.ceil(users.total / PAGE_SIZE) || 1, [users.total]);
  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset]);

  const handleDelete = async (userId: number, username: string) => {
    if (userId === currentUser.id) return;
    const ok = window.confirm(`ユーザー ${username} を削除します。関連データも削除されます。続行しますか？`);
    if (!ok) return;
    try {
      await deleteAdminUser(userId);
      await fetchUsers(query, offset);
      await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>管理者画面</div>
          <div style={styles.subtitle}>登録済みユーザ管理と監査ログ</div>
        </div>
        <button style={styles.secondaryButton} onClick={onBack}>
          戻る
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>ユーザ一覧</div>
          <input
            style={styles.searchInput}
            placeholder="ユーザー名・メールで検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ユーザー名</th>
                <th style={styles.th}>メール</th>
                <th style={styles.th}>権限</th>
                <th style={styles.th}>状態</th>
                <th style={styles.th}>作成日</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr>
                  <td style={styles.td} colSpan={6}>読み込み中...</td>
                </tr>
              ) : users.items.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={6}>対象ユーザーがいません。</td>
                </tr>
              ) : (
                users.items.map((user) => (
                  <tr key={user.id}>
                    <td style={styles.td}>@{user.username}</td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{user.is_admin ? '管理者' : '一般'}</td>
                    <td style={styles.td}>{user.is_active ? '有効' : '無効'}</td>
                    <td style={styles.td}>{new Date(user.created_at).toLocaleString()}</td>
                    <td style={styles.td}>
                      <button
                        style={user.id === currentUser.id ? styles.disabledButton : styles.dangerButton}
                        disabled={user.id === currentUser.id}
                        onClick={() => handleDelete(user.id, user.username)}
                      >
                        強制削除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={styles.pagination}>
          <button
            style={styles.secondaryButton}
            disabled={currentPage <= 1}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            前へ
          </button>
          <div style={styles.pageInfo}>{currentPage} / {totalPages}</div>
          <button
            style={styles.secondaryButton}
            disabled={currentPage >= totalPages}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            次へ
          </button>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>監査ログ</div>
          <button style={styles.secondaryButton} onClick={fetchLogs} disabled={loadingLogs}>
            再読み込み
          </button>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>日時</th>
                <th style={styles.th}>操作者</th>
                <th style={styles.th}>操作</th>
                <th style={styles.th}>対象</th>
              </tr>
            </thead>
            <tbody>
              {loadingLogs ? (
                <tr>
                  <td style={styles.td} colSpan={4}>読み込み中...</td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={4}>監査ログがまだありません。</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={styles.td}>{log.actor_username || '-'}</td>
                    <td style={styles.td}>{log.action}</td>
                    <td style={styles.td}>{log.target_username || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const styles = {
  page: {
    padding: '24px 32px 48px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    color: '#1b2559',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '13px',
    color: '#5b6478',
    marginTop: '6px',
  },
  section: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid #e6ecff',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
  },
  searchInput: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #d7defc',
    minWidth: '220px',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 8px',
    borderBottom: '1px solid #eef2ff',
    color: '#4a4f68',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f4ff',
    color: '#1f2a4d',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  pageInfo: {
    fontSize: '12px',
    color: '#5b6478',
  },
  secondaryButton: {
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid #d7defc',
    backgroundColor: '#f4f6ff',
    color: '#3b4a7a',
    fontSize: '12px',
    cursor: 'pointer',
  },
  dangerButton: {
    padding: '6px 10px',
    borderRadius: '10px',
    border: '1px solid #ffb4b4',
    backgroundColor: '#fff1f1',
    color: '#b42318',
    fontSize: '12px',
    cursor: 'pointer',
  },
  disabledButton: {
    padding: '6px 10px',
    borderRadius: '10px',
    border: '1px solid #d7defc',
    backgroundColor: '#f4f6ff',
    color: '#9aa4c7',
    fontSize: '12px',
    cursor: 'not-allowed',
  },
  errorBox: {
    padding: '10px 14px',
    backgroundColor: '#fff2f2',
    border: '1px solid #ffc0c0',
    borderRadius: '10px',
    color: '#b42318',
  },
};

export default AdminPage;
