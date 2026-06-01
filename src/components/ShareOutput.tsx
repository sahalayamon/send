import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import type { ShareRecord } from '../lib/shares';
import { EXPIRY_HOURS } from '../lib/shares';

interface ShareOutputProps {
  share: ShareRecord;
  onReset: () => void;
}

export const ShareOutput: React.FC<ShareOutputProps> = ({ share, onReset }) => {
  const [copied, setCopied] = useState(false);

  // Clean URL: domain.com/abc123/
  const shareUrl = `${window.location.origin}/${share.code}/`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Could not copy link:', err);
    }
  };

  return (
    <div className="share-output-container">
      <div className="share-success-header">
        <span className="share-success-label">// Link generated</span>
        <span className="share-expiry-note">Expires in {EXPIRY_HOURS}h · stored on Supabase</span>
      </div>

      {/* URL row */}
      <div className="share-link-box">
        <div
          className="share-url-text"
          onClick={handleCopy}
          title="Click to copy"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
          aria-label="Copy shareable link"
        >
          {shareUrl}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`copy-btn ${copied ? 'copied' : ''}`}
          aria-label={copied ? 'Link copied' : 'Copy link to clipboard'}
        >
          {copied ? <><Check size={13} /><span>Copied!</span></> : <><Copy size={13} /><span>Copy Link</span></>}
        </button>
      </div>

      {/* Open in new tab */}
      <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="share-open-link">
        <ExternalLink size={12} />
        Open in new tab to verify
      </a>

      {/* Share code for reference */}
      <div className="share-id-row">
        <span className="share-id-label">Share Code</span>
        <code className="share-id-value" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.15em' }}>
          {share.code.toUpperCase()}
        </code>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="primary-action-btn"
        style={{ marginTop: '1.25rem', background: 'transparent', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
      >
        &gt; Create Another Share
      </button>
    </div>
  );
};

export default ShareOutput;
