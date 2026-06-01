import React, { useState } from 'react';
import { Terminal, X, Eye, EyeOff } from 'lucide-react';
import AdminPanel from './AdminPanel';
import { getAdminPassword } from '../lib/admin';

const SESSION_KEY = 'aymnsend_admin';

export const AdminButton: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showPanel, setShowPanel] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  );
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    try {
      const correctPw = await getAdminPassword();
      if (password === correctPw) {
        sessionStorage.setItem(SESSION_KEY, '1');
        setShowLogin(false);
        setShowPanel(true);
        setPassword('');
      } else {
        setError('Access denied. Wrong password.');
        setPassword('');
      }
    } catch {
      setError('Could not verify password. Check your connection.');
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setShowPanel(false);
  };

  const handleLogout = () => {
    setShowPanel(false);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const closeLogin = () => {
    setShowLogin(false);
    setError('');
    setPassword('');
  };

  return (
    <>
      {/* Fixed terminal button */}
      {!showPanel && (
        <button
          type="button"
          className={`admin-trigger-btn ${sessionStorage.getItem(SESSION_KEY) === '1' ? 'admin-trigger-btn--active' : ''}`}
          onClick={() => {
            if (sessionStorage.getItem(SESSION_KEY) === '1') {
              setShowPanel(true);
            } else {
              setShowLogin(true);
            }
          }}
          title={sessionStorage.getItem(SESSION_KEY) === '1' ? "Open Admin Panel" : "Admin access"}
          aria-label="Open admin panel"
          style={{
            borderColor: sessionStorage.getItem(SESSION_KEY) === '1' ? 'var(--success)' : 'var(--border)',
            color: sessionStorage.getItem(SESSION_KEY) === '1' ? 'var(--success)' : 'var(--text-secondary)'
          }}
        >
          <Terminal size={14} />
        </button>
      )}

      {/* Login modal */}
      {showLogin && (
        <div className="admin-login-overlay" onClick={closeLogin}>
          <div
            className="admin-login-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Admin login"
          >
            <div className="admin-login-header">
              <Terminal size={13} />
              <span>ADMIN ACCESS</span>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={closeLogin}
                aria-label="Close"
                style={{ marginLeft: 'auto' }}
              >
                <X size={13} />
              </button>
            </div>

            <form onSubmit={handleLogin} className="admin-login-form">
              <label className="admin-login-label" htmlFor="admin-password-input">
                Enter password
              </label>
              <div className="admin-pw-row">
                <input
                  id="admin-password-input"
                  type={showPw ? 'text' : 'password'}
                  className="admin-pw-input"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••"
                  autoFocus
                  autoComplete="current-password"
                  disabled={checking}
                />
                <button
                  type="button"
                  className="admin-icon-btn"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {error && <p className="admin-login-error">{error}</p>}
              <button type="submit" className="admin-login-submit" disabled={checking}>
                {checking ? '// Verifying...' : '> Authenticate'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin panel */}
      {showPanel && <AdminPanel onClose={handleClose} onLogout={handleLogout} />}
    </>
  );
};

export default AdminButton;
