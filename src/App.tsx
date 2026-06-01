import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Header from './components/Header';
import TabSelector from './components/TabSelector';
import TextShare from './components/TextShare';
import FileShare from './components/FileShare';
import ShareOutput from './components/ShareOutput';
import PayloadViewer from './components/PayloadViewer';
import { createTextShare, createFileShare, getShareByCode, isValidCode } from './lib/shares';
import type { ShareRecord } from './lib/shares';
import AdminButton from './components/AdminButton';

// ── Routing: extract 6-char code from pathname ─────────────────────────────

function getCodeFromPath(): string | null {
  const segment = window.location.pathname.replace(/^\/|\/$/g, ''); // strip slashes
  return isValidCode(segment) ? segment.toLowerCase() : null;
}

// ── App ────────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  // Creator Mode
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [textValue, setTextValue] = useState('');
  const [fileValue, setFileValue] = useState<File | null>(null);
  const [shareRecord, setShareRecord] = useState<ShareRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Expiry Selection Options
  const [expiryOption, setExpiryOption] = useState<'5m' | '10m' | '15m' | '1h' | 'custom'>('1h');
  const [customExpiryValue, setCustomExpiryValue] = useState<number>(30);
  const [customExpiryUnit, setCustomExpiryUnit] = useState<'m' | 'h'>('m');
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('aymnsend_admin') === '1');


  // Viewer Mode
  const [viewShare, setViewShare] = useState<ShareRecord | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Retrieval Mode
  const [retrievalCode, setRetrievalCode] = useState('');
  const [retrievalError, setRetrievalError] = useState<string | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);

  // ── Route resolution ─────────────────────────────────────────────────────

  const resolveRoute = async () => {
    const code = getCodeFromPath();

    if (!code) {
      setViewShare(null);
      setViewerError(null);
      setNotFound(false);
      return;
    }

    setViewerLoading(true);
    setViewerError(null);
    setNotFound(false);
    setViewShare(null);

    try {
      const record = await getShareByCode(code);
      if (!record) setNotFound(true);
      else setViewShare(record);
    } catch (err) {
      setViewerError(err instanceof Error ? err.message : 'Failed to load shared content.');
    } finally {
      setViewerLoading(false);
    }
  };

  useEffect(() => {
    const handleInit = async () => {
      await resolveRoute();
    };
    handleInit();
    window.addEventListener('popstate', resolveRoute);
    return () => window.removeEventListener('popstate', resolveRoute);
  }, []);

  // ── Upload handler ───────────────────────────────────────────────────────

  const getExpiryMinutes = (): number => {
    switch (expiryOption) {
      case '5m': return 5;
      case '10m': return 10;
      case '15m': return 15;
      case '1h': return 60;
      case 'custom':
        if (customExpiryUnit === 'h') {
          return customExpiryValue * 60;
        }
        return customExpiryValue;
      default: return 60;
    }
  };

  const handleGenerateShare = async () => {
    setIsUploading(true);
    setUploadError(null);
    setShareRecord(null);

    try {
      let record: ShareRecord;
      const minutes = isAdmin ? getExpiryMinutes() : undefined;
      if (activeTab === 'text') {
        if (!textValue.trim()) return;
        record = await createTextShare(textValue, minutes);
      } else {
        if (!fileValue) return;
        record = await createFileShare(fileValue, minutes);
      }
      setShareRecord(record);
      setTimeout(() => {
        document.querySelector('.share-output-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Check your Supabase config.');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Clear and go back ────────────────────────────────────────────────────

  const handleClearViewer = () => {
    setViewShare(null);
    setViewerError(null);
    setNotFound(false);
    setShareRecord(null);
    setTextValue('');
    setFileValue(null);
    setRetrievalCode('');
    setRetrievalError(null);
    window.history.pushState({}, '', '/');
  };

  const handleResetCreator = () => {
    setShareRecord(null);
    setTextValue('');
    setFileValue(null);
    setUploadError(null);
    setRetrievalCode('');
    setRetrievalError(null);
  };

  const handleRetrieve = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = retrievalCode.trim().toLowerCase();
    if (!isValidCode(code)) {
      setRetrievalError('Invalid code. Code must be 3 alphanumeric characters.');
      return;
    }
    setRetrievalError(null);
    setIsRetrieving(true);
    try {
      const record = await getShareByCode(code);
      if (!record) {
        setRetrievalError('No share found with this code.');
      } else {
        window.history.pushState({}, '', `/${code}/`);
        resolveRoute();
      }
    } catch (err) {
      setRetrievalError(err instanceof Error ? err.message : 'Error retrieving share.');
    } finally {
      setIsRetrieving(false);
    }
  };

  const hasContent = activeTab === 'text' ? textValue.trim() !== '' : fileValue !== null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      <Header />

      <main style={{ width: '100%' }}>

        {viewerLoading ? (
          <div className="glass-card loading-overlay">
            <div className="spinner-glow" />
            <div className="loading-text">// Fetching share from database...</div>
          </div>

        ) : viewerError ? (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)' }}>
              <AlertTriangle size={15} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Load Error</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>{viewerError}</p>
            <button type="button" onClick={handleClearViewer} className="viewer-back-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>&gt; Back to Creator</button>
          </div>

        ) : notFound ? (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <AlertTriangle size={15} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Not Found</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>
              This link has no data. It may have expired or the code is invalid.
            </p>
            <button type="button" onClick={handleClearViewer} className="viewer-back-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>&gt; Back to Creator</button>
          </div>

        ) : viewShare ? (
          <div className="glass-card">
            <PayloadViewer share={viewShare} onClear={handleClearViewer} />
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Retrieval Input Card (Separate card at the top) */}
            <div className="glass-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  // Access Shared Content
                </span>
                <form onSubmit={handleRetrieve} style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    value={retrievalCode}
                    onChange={(e) => {
                      setRetrievalCode(e.target.value.slice(0, 3));
                      setRetrievalError(null);
                    }}
                    placeholder="Enter 3-character code (e.g. a7x)"
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-inset)',
                      borderRadius: '0',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                      outline: 'none',
                      flex: 1,
                      height: '38px',
                      textTransform: 'lowercase'
                    }}
                    maxLength={3}
                    disabled={isRetrieving}
                  />
                  <button
                    type="submit"
                    className="primary-action-btn"
                    disabled={retrievalCode.trim().length !== 3 || isRetrieving}
                    style={{
                      width: 'auto',
                      padding: '0 1.5rem',
                      height: '38px',
                      marginTop: 0
                    }}
                  >
                    {isRetrieving ? 'Fetching...' : '> Go'}
                  </button>
                </form>
                {retrievalError && (
                  <div className="capacity-warning" style={{ margin: 0 }}>
                    <AlertTriangle size={12} />
                    <span>{retrievalError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator Mode Card */}
            <div className="glass-card" style={{ marginBottom: 0 }}>
              <TabSelector activeTab={activeTab} onChange={(tab) => {
                setActiveTab(tab);
                setShareRecord(null);
                setUploadError(null);
              }} />

              {activeTab === 'text' ? (
                <TextShare value={textValue} onChange={(val) => { setTextValue(val); setShareRecord(null); }} />
              ) : (
                <FileShare value={fileValue} onChange={(val) => { setFileValue(val); setShareRecord(null); }} />
              )}

              {/* Expiry Lifetime Selector */}
              {isAdmin && (
                <div className="expiry-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <span className="expiry-title-label" style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
                    // Expiry Link Lifetime
                  </span>
                  <div className="expiry-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(['5m', '10m', '15m', '1h', 'custom'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`expiry-btn ${expiryOption === opt ? 'active' : ''}`}
                        onClick={() => setExpiryOption(opt)}
                        style={{
                          background: expiryOption === opt ? 'var(--text-primary)' : 'transparent',
                          color: expiryOption === opt ? 'var(--bg)' : 'var(--text-secondary)',
                          border: '1px solid ' + (expiryOption === opt ? 'var(--text-primary)' : 'var(--border-tag)'),
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          letterSpacing: '0.06em',
                          transition: 'all var(--transition)'
                        }}
                      >
                        {opt === 'custom' ? 'Custom' : opt}
                      </button>
                    ))}
                  </div>

                  {expiryOption === 'custom' && (
                    <div className="expiry-custom-row" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={customExpiryValue}
                        onChange={(e) => setCustomExpiryValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="expiry-custom-input"
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-inset)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.82rem',
                          width: '80px',
                          outline: 'none'
                        }}
                      />
                      <select
                        value={customExpiryUnit}
                        onChange={(e) => setCustomExpiryUnit(e.target.value as 'm' | 'h')}
                        className="expiry-custom-select"
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.82rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="m">Minutes</option>
                        <option value="h">Hours</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {uploadError && (
                <div className="capacity-warning" style={{ marginTop: '1.25rem' }}>
                  <AlertTriangle size={12} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="btn-row">
                <button
                  type="button"
                  className="primary-action-btn"
                  onClick={handleGenerateShare}
                  disabled={!hasContent || isUploading}
                  aria-label="Upload and generate shareable link"
                >
                  {isUploading ? '// Uploading...' : '> Generate Shareable Link'}
                </button>
              </div>
            </div>

            {shareRecord && (
              <div className="glass-card" style={{ marginBottom: 0 }}>
                <ShareOutput share={shareRecord} onReset={handleResetCreator} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-links">
          <a href="/" className="footer-link" onClick={(e) => { e.preventDefault(); alert('Files uploaded to Supabase. Links expire after the selected duration. Nothing stored in the URL.'); }}>How it works</a>
          <a href="/" className="footer-link" onClick={(e) => { e.preventDefault(); alert('AymnSend uses Supabase (PostgreSQL + Storage). Files deleted after expiry. No analytics.'); }}>Privacy & Tech</a>
        </div>
        <p>© {new Date().getFullYear()} AymnSend — Links expire based on selected duration. Zero tracking.</p>
      </footer>
      <AdminButton onLogin={() => setIsAdmin(true)} onLogout={() => setIsAdmin(false)} />
    </div>
  );
};

export default App;
