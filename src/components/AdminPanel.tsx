import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Trash2, RefreshCw, ShieldAlert, FileText, File as FileIcon,
  CheckCircle, AlertCircle, Settings, Zap
} from 'lucide-react';
import type { ShareRecord } from '../lib/shares';
import { formatFileSize } from '../lib/shares';
import {
  fetchAllShares, deleteShare, purgeExpiredShares,
  getAdminStats, getExpiryHours, setExpiryHours, setAdminPassword, getAdminPassword
} from '../lib/admin';

interface AdminPanelProps {
  onClose: () => void;
  onLogout: () => void;
}

const EXPIRY_OPTIONS = [
  { label: '5 minutes',  value: 5 / 60 },
  { label: '10 minutes', value: 10 / 60 },
  { label: '15 minutes', value: 15 / 60 },
  { label: '30 minutes', value: 0.5 },
  { label: '1 hour',     value: 1 },
  { label: '2 hours',    value: 2 },
  { label: '6 hours',    value: 6 },
  { label: '12 hours',   value: 12 },
  { label: '24 hours',   value: 24 },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onLogout }) => {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [expiryHours, setExpiryHoursState] = useState<number>(1);
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Custom Global Expiry state
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState<number>(30);
  const [customUnit, setCustomUnit] = useState<'m' | 'h'>('m');

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, hours] = await Promise.all([fetchAllShares(), getExpiryHours()]);
      setShares(data);
      
      const matchedPreset = EXPIRY_OPTIONS.find(opt => Math.abs(opt.value - hours) < 0.0001);
      if (matchedPreset) {
        setExpiryHoursState(matchedPreset.value);
        setIsCustom(false);
      } else {
        setIsCustom(true);
        if (hours < 1 || hours % 1 !== 0) {
          setCustomValue(Math.round(hours * 60));
          setCustomUnit('m');
        } else {
          setCustomValue(hours);
          setCustomUnit('h');
        }
      }
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
      let finalHours: number;
      if (isCustom) {
        finalHours = customUnit === 'm' ? customValue / 60 : customValue;
      } else {
        finalHours = expiryHours;
      }
      await setExpiryHours(finalHours);
      
      const label = isCustom 
        ? `${customValue} ${customUnit === 'm' ? 'minutes' : 'hours'}`
        : EXPIRY_OPTIONS.find(o => Math.abs(o.value - finalHours) < 0.0001)?.label;
      showToast(`Global expiry set to ${label}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'err');
    } finally {
      setSavingExpiry(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'err');
      return;
    }
    setSavingPw(true);
    try {
      const current = await getAdminPassword();
      if (oldPassword !== current) {
        showToast('Current password is incorrect.', 'err');
        setOldPassword('');
        return;
      }
      await setAdminPassword(newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPwModal(false);
      showToast('Password updated. Use it on next login.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update password', 'err');
    } finally {
      setSavingPw(false);
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
              className="admin-header-text-btn"
              onClick={() => { setShowPwModal(true); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}
              title="Change admin password"
              aria-label="Change admin password"
            >
              Change Password
            </button>
            <button
              type="button"
              className="admin-header-text-btn"
              onClick={onLogout}
              title="Logout session"
              aria-label="Logout"
              style={{ color: 'var(--error)', borderColor: 'var(--error)', marginRight: '0.25rem' }}
            >
              Logout
            </button>
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

        {/* Change Password Modal */}
        {showPwModal && (
          <div className="admin-login-overlay" onClick={() => setShowPwModal(false)}>
            <div className="admin-login-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="admin-login-header">
                <Settings size={13} />
                <span>Change Password</span>
                <button type="button" className="admin-icon-btn" onClick={() => setShowPwModal(false)} style={{ marginLeft: 'auto' }} aria-label="Close"><X size={13} /></button>
              </div>
              <div className="admin-login-form">
                <label className="admin-login-label" htmlFor="admin-old-pw">Current password</label>
                <input
                  id="admin-old-pw"
                  type="password"
                  className="admin-pw-input"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoFocus
                />
                <label className="admin-login-label" htmlFor="admin-new-pw">New password</label>
                <input
                  id="admin-new-pw"
                  type="password"
                  className="admin-pw-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 4 characters"
                  autoFocus
                />
                <label className="admin-login-label" htmlFor="admin-confirm-pw">Confirm password</label>
                <input
                  id="admin-confirm-pw"
                  type="password"
                  className="admin-pw-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                />
                <button
                  type="button"
                  className="admin-login-submit"
                  onClick={handleChangePassword}
                  disabled={savingPw || !oldPassword || !newPassword || !confirmPassword}
                >
                  {savingPw ? '// Saving...' : '> Update Password'}
                </button>
              </div>
            </div>
          </div>
        )}

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
        <div className="admin-settings-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={12} />
          <span className="admin-settings-label">Global Expiry Time</span>
          <select
            className="admin-select"
            value={isCustom ? 'custom' : expiryHours}
            onChange={e => {
              if (e.target.value === 'custom') {
                setIsCustom(true);
              } else {
                setIsCustom(false);
                setExpiryHoursState(Number(e.target.value));
              }
            }}
            aria-label="Set global expiry time"
          >
            {EXPIRY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            <option value="custom">Custom...</option>
          </select>

          {isCustom && (
            <div className="admin-custom-expiry-inputs" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="number"
                min={1}
                max={9999}
                value={customValue}
                onChange={e => setCustomValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="admin-custom-input"
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  width: '60px',
                  outline: 'none'
                }}
              />
              <select
                value={customUnit}
                onChange={e => setCustomUnit(e.target.value as 'm' | 'h')}
                className="admin-custom-select"
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="m">Minutes</option>
                <option value="h">Hours</option>
              </select>
            </div>
          )}

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
