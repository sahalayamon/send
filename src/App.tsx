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

  // Viewer Mode
  const [viewShare, setViewShare] = useState<ShareRecord | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

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
    resolveRoute();
    window.addEventListener('popstate', resolveRoute);
    return () => window.removeEventListener('popstate', resolveRoute);
  }, []);

  // ── Upload handler ───────────────────────────────────────────────────────

  const handleGenerateShare = async () => {
    setIsUploading(true);
    setUploadError(null);
    setShareRecord(null);

    try {
      let record: ShareRecord;
      if (activeTab === 'text') {
        if (!textValue.trim()) return;
        record = await createTextShare(textValue);
      } else {
        if (!fileValue) return;
        record = await createFileShare(fileValue);
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
    window.history.pushState({}, '', '/');
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="glass-card">
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

              {uploadError && (
                <div className="capacity-warning" style={{ marginTop: '1rem' }}>
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
              <div className="glass-card">
                <ShareOutput share={shareRecord} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-links">
          <a href="/" className="footer-link" onClick={(e) => { e.preventDefault(); alert('Files uploaded to Supabase. Links expire after 1 hour. Nothing stored in the URL.'); }}>How it works</a>
          <a href="/" className="footer-link" onClick={(e) => { e.preventDefault(); alert('Tempsend uses Supabase (PostgreSQL + Storage). Files deleted after expiry. No analytics.'); }}>Privacy & Tech</a>
        </div>
        <p>© {new Date().getFullYear()} Tempsend — Links expire in 1h. Zero tracking.</p>
      </footer>
    </div>
  );
};

export default App;
