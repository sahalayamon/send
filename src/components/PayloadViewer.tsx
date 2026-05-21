import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Download, ArrowLeft, Check, Clock, AlertTriangle, FileX } from 'lucide-react';
import type { ShareRecord } from '../lib/shares';
import {
  isExpired,
  secondsRemaining,
  formatCountdown,
  formatFileSize,
  getFileDownloadUrl,
} from '../lib/shares';

interface PayloadViewerProps {
  share: ShareRecord;
  onClear: () => void;
}

export const PayloadViewer: React.FC<PayloadViewerProps> = ({ share, onClear }) => {
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(() => isExpired(share));
  const [secondsLeft, setSecondsLeft] = useState(() => secondsRemaining(share));
  const [isDownloading, setIsDownloading] = useState(false);

  // Live countdown ticker
  useEffect(() => {
    if (expired) return;

    const interval = setInterval(() => {
      const secs = secondsRemaining(share);
      setSecondsLeft(secs);
      if (secs <= 0) {
        setExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [share, expired]);

  const handleCopy = async () => {
    if (!share.content) return;
    try {
      await navigator.clipboard.writeText(share.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Could not copy content:', err);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!share.storage_path) return;
    setIsDownloading(true);
    try {
      const url = await getFileDownloadUrl(share.storage_path);
      const link = document.createElement('a');
      link.href = url;
      link.download = share.filename || 'tempsend-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [share]);

  const formattedDate = new Date(share.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // ── Expired State ────────────────────────────────────────────────────────
  if (expired) {
    return (
      <div className="expired-container">
        <div className="expired-icon">
          <FileX size={32} />
        </div>
        <div className="expired-content">
          <h2 className="expired-title">Link Expired</h2>
          <p className="expired-message">
            This link has no data. AYMN.SEND. links are only available for 1 hour after creation.
          </p>
          <div className="expired-meta">
            <span>Share ID: <code>{share.id}</code></span>
            <span>Created: {formattedDate}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="viewer-back-btn"
          style={{ maxWidth: '320px' }}
          aria-label="Back to creator"
        >
          <ArrowLeft size={13} /> Create a New Share
        </button>
      </div>
    );
  }

  // ── Countdown urgency level ──────────────────────────────────────────────
  const urgencyColor =
    secondsLeft < 120 ? 'var(--error)' :
    secondsLeft < 600 ? 'var(--warning)' :
    'var(--text-secondary)';

  // ── Valid Share View ─────────────────────────────────────────────────────
  return (
    <div className="viewer-content-card">
      {/* Header */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <div>
            <h2 className="viewer-title-text">
              {share.type === 'text' ? 'Shared Snippet' : (share.filename || 'Shared File')}
            </h2>
            <div className="viewer-meta-row">
              <span>Shared {formattedDate}</span>
              {share.file_size && (
                <span>· {formatFileSize(share.file_size)}</span>
              )}
            </div>
          </div>
          <span className="viewer-badge">{share.type.toUpperCase()}</span>
        </div>

        <div className="viewer-actions">
          {share.type === 'text' && (
            <button
              type="button"
              onClick={handleCopy}
              className="editor-action-btn"
              style={copied ? { borderColor: 'var(--success)', color: 'var(--success)' } : {}}
              aria-label="Copy text content"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          {share.type === 'file' && (
            <button
              type="button"
              onClick={handleDownload}
              className="editor-action-btn"
              disabled={isDownloading}
              aria-label="Download file"
            >
              <Download size={12} />
              {isDownloading ? 'Fetching...' : 'Download'}
            </button>
          )}
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="countdown-bar" style={{ borderColor: urgencyColor }}>
        <Clock size={12} style={{ color: urgencyColor, flexShrink: 0 }} />
        <span className="countdown-label">Available for</span>
        <span className="countdown-value" style={{ color: urgencyColor }}>
          {formatCountdown(secondsLeft)}
        </span>
        {secondsLeft < 300 && (
          <span className="countdown-warning">
            <AlertTriangle size={11} /> Expiring soon
          </span>
        )}
      </div>

      {/* Content */}
      {share.type === 'text' ? (
        <pre className="text-viewer-body">
          <code>{share.content}</code>
        </pre>
      ) : (
        <div className="file-download-block">
          <div className="file-download-info">
            <span className="file-preview-name">{share.filename || 'Unnamed file'}</span>
            <span className="file-preview-type">
              {share.mime_type || 'Unknown type'}
              {share.file_size ? ` · ${formatFileSize(share.file_size)}` : ''}
            </span>
          </div>
          <button
            type="button"
            className="primary-action-btn"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{ marginTop: '0.5rem' }}
            aria-label="Download file"
          >
            <Download size={14} />
            {isDownloading ? '// Fetching download URL...' : '> Download File'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onClear}
        className="viewer-back-btn"
        aria-label="Back to creator"
      >
        <ArrowLeft size={13} /> Create Your Own Share
      </button>
    </div>
  );
};

export default PayloadViewer;
