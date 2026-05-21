import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Trash2, RefreshCw, ShieldAlert, Clock, FileText, File as FileIcon,
  CheckCircle, AlertCircle, Settings, Zap
} from 'lucide-react';
import type { ShareRecord } from '../lib/shares';
import { formatFileSize } from '../lib/shares';
import {
  fetchAllShares, deleteShare, purgeExpiredShares,
  getAdminStats, getExpiryHours, setExpiryHours
} from '../lib/admin';

interface AdminPanelProps {
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: '30 minutes', value: 0.5 },
  { label: '1 hour',     value: 1 },
  { label: '2 hours',    value: 2 },
  { label: '6 hours',    value: 6 },
  { label: '12 hours',   value: 12 },
  { label: '24 hours',   value: 24 },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [expiryHours, setExpiryHoursState] = useState<number>(1);
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, hours] = await Promise.all([fetchAllShares(), getExpiryHours()]);
      setShares(data);
      setExpiryHoursState(hours);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load data', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (share: ShareRecord) => {
    setDeletingId(share.id);
    try {
      await deleteShare(share);
      setShares(prev => prev.filter(s => s.id !== share.id));
      showToast(`Deleted share ${share.code.toUpperCase()}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'err');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePurge = async () => {
    setPurging(true);
    try {
      const count = await purgeExpiredShares();
      showToast(`Purged ${count} expired share${count !== 1 ? 's' : ''}`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Purge failed', 'err');
    } finally {
      setPurging(false);
    }
  };

  const handleSaveExpiry = async () => {
    setSavingExpiry(true);
    try {
      await setExpiryHours(expiryHours);
      showToast(`Global expiry set to ${EXPIRY_OPTIONS.find(o => o.value === expiryHours)?.label}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'err');
    } finally {
      setSavingExpiry(false);
    }
  };

  const stats = getAdminStats(shares);
  const now = new Date();

  return (
    <div className="admin-overlay">
      <div className="admin-panel">

        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-left">
            <ShieldAlert size={14} />
            <span className="admin-title">ADMIN PANEL</span>
            <span className="admin-subtitle">// AYMN.SEND.</span>
          </div>
          <div className="admin-header-right">
            <button
              type="button"
              className="admin-icon-btn"
              onClick={load}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              className="admin-icon-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close admin panel"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="admin-stats-row">
          <div className="admin-stat">
            <span className="admin-stat-label">Total</span>
            <span className="admin-stat-value">{stats.total}</span>
          </div>
          <div className="admin-stat admin-stat--active">
            <span className="admin-stat-label">Active</span>
            <span className="admin-stat-value">{stats.active}</span>
          </div>
          <div className="admin-stat admin-stat--expired">
            <span className="admin-stat-label">Expired</span>
            <span className="admin-stat-value">{stats.expired}</span>
          </div>
          <button
            type="button"
            className="admin-purge-btn"
            onClick={handlePurge}
            disabled={purging || stats.expired === 0}
            title="Delete all expired shares and files"
          >
            <Zap size={11} />
            {purging ? 'Purging...' : `Purge Expired (${stats.expired})`}
          </button>
        </div>

        {/* Global expiry setting */}
        <div className="admin-settings-row">
          <Settings size={12} />
          <span className="admin-settings-label">Global Expiry Time</span>
          <select
            className="admin-select"
            value={expiryHours}
            onChange={e => setExpiryHoursState(Number(e.target.value))}
            aria-label="Set global expiry time"
          >
            {EXPIRY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="admin-save-btn"
            onClick={handleSaveExpiry}
            disabled={savingExpiry}
          >
            {savingExpiry ? 'Saving...' : 'Save'}
          </button>
          <span className="admin-settings-note">Applies to new shares only</span>
        </div>

        {/* Table */}
        <div className="admin-table-wrapper">
          {loading ? (
            <div className="admin-loading">
              <div className="spinner-glow" />
              <span>// Loading shares...</span>
            </div>
          ) : shares.length === 0 ? (
            <div className="admin-empty">No shares found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>File / Content</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shares.map(share => {
                  const isExpired = new Date(share.expires_at) <= now;
                  const shareUrl = `${window.location.origin}/${share.code}/`;
                  return (
                    <tr key={share.id} className={isExpired ? 'admin-row--expired' : ''}>
                      <td>
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-code-link"
                          title={shareUrl}
                        >
                          {share.code.toUpperCase()}
                        </a>
                      </td>
                      <td>
                        <span className="admin-type-badge">
                          {share.type === 'text'
                            ? <><FileText size={10} /> TEXT</>
                            : <><FileIcon size={10} /> FILE</>
                          }
                        </span>
                      </td>
                      <td className="admin-cell-content">
                        {share.type === 'text'
                          ? (share.content?.slice(0, 40) ?? '—') + (share.content && share.content.length > 40 ? '…' : '')
                          : (share.filename ?? '—')
                        }
                      </td>
                      <td>{share.file_size ? formatFileSize(share.file_size) : '—'}</td>
                      <td className="admin-cell-date">
                        {new Date(share.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="admin-cell-date">
                        {new Date(share.expires_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        {isExpired
                          ? <span className="admin-status admin-status--expired"><AlertCircle size={10} /> Expired</span>
                          : <span className="admin-status admin-status--active"><CheckCircle size={10} /> Active</span>
                        }
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-delete-btn"
                          onClick={() => handleDelete(share)}
                          disabled={deletingId === share.id}
                          aria-label={`Delete share ${share.code}`}
                          title="Delete this share"
                        >
                          {deletingId === share.id
                            ? <RefreshCw size={11} className="spin" />
                            : <Trash2 size={11} />
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Toast notification */}
        {toast && (
          <div className={`admin-toast ${toast.type === 'err' ? 'admin-toast--err' : ''}`}>
            {toast.type === 'ok' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
