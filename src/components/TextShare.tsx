import React, { useRef, useEffect } from 'react';
import { Trash2, Hash, FileCode, Clock } from 'lucide-react';

interface TextShareProps {
  value: string;
  onChange: (val: string) => void;
}

export const TextShare: React.FC<TextShareProps> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and line numbers container
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Generate line numbers text
  const lines = value.split('\n');
  const lineNumbersText = Array.from({ length: lines.length }, (_, i) => i + 1).join('\n');

  // Stats calculation
  const charCount = value.length;
  const wordCount = value.trim() === '' ? 0 : value.trim().split(/\s+/).length;
  // Estimated reading time (average 200 words per minute)
  const readingTime = Math.ceil(wordCount / 200);

  const handleClear = () => {
    onChange('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Keep focus on editor mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="editor-container">
      <div className="editor-wrapper">
        <div className="line-numbers" ref={lineNumbersRef}>
          {lineNumbersText}
        </div>
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder="Paste code snippet, logs, credentials, or write your note here..."
          spellCheck="false"
          aria-label="Code and text share input"
        />
      </div>

      <div className="editor-footer">
        <div className="editor-stats">
          <div className="editor-stat-item">
            <Hash size={12} />
            <span>{charCount.toLocaleString()} chars</span>
          </div>
          <div className="editor-stat-dot" />
          <div className="editor-stat-item">
            <FileCode size={12} />
            <span>{wordCount.toLocaleString()} words</span>
          </div>
          <div className="editor-stat-dot" />
          <div className="editor-stat-item">
            <Clock size={12} />
            <span>{readingTime} {readingTime === 1 ? 'min' : 'mins'} read</span>
          </div>
        </div>

        <div className="editor-actions">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="editor-action-btn"
              title="Clear editor contents"
              aria-label="Clear contents"
            >
              <Trash2 size={13} />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextShare;
