import React, { useState, useRef } from 'react';
import { UploadCloud, X, AlertCircle } from 'lucide-react';
import { compressImageFile, formatBytes } from '../utils/compression';

export interface SharedImage {
  dataUrl: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

interface ImageShareProps {
  value: SharedImage | null;
  onChange: (val: SharedImage | null) => void;
}

export const ImageShare: React.FC<ImageShareProps> = ({ value, onChange }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Unsupported file type. Please upload an image file (PNG, JPEG, WEBP, etc.)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await compressImageFile(file);
      onChange({
        dataUrl: result.dataUrl,
        name: file.name,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        width: result.width,
        height: result.height,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to compress image file. Please try another image.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectFile = () => {
    fileInputRef.current?.click();
  };

  const savingsPct = value
    ? Math.max(0, Math.round(((value.originalSize - value.compressedSize) / value.originalSize) * 100))
    : 0;

  return (
    <div className="image-uploader-container">
      {isLoading ? (
        <div className="loading-overlay">
          <div className="spinner-glow" />
          <div className="loading-text">// Optimizing image size...</div>
        </div>
      ) : !value ? (
        <div>
          <div
            className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={selectFile}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && selectFile()}
            aria-label="Upload image file drag and drop area"
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden-input"
              accept="image/*"
              onChange={handleFileChange}
            />

            <div className="upload-icon-wrapper">
              <UploadCloud size={24} />
            </div>

            <div>
              <p className="upload-title">Drop image file here</p>
              <p className="upload-subtitle">or click to browse — PNG, JPG, WEBP supported.</p>
              <p className="upload-subtitle" style={{ marginTop: '0.25rem' }}>
                Auto-scaled and client-side Gzip compressed.
              </p>
            </div>
          </div>

          {error && (
            <div className="capacity-warning" style={{ marginTop: '0.75rem' }}>
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="preview-container">
          <div className="image-preview-wrapper">
            <img
              src={value.dataUrl}
              alt="Uploaded share preview"
              className="image-preview-element"
            />
            <div className="preview-overlay-info">
              <div className="image-meta-info">
                <span className="image-meta-name" title={value.name}>
                  {value.name}
                </span>
                <span className="image-meta-dimensions">
                  {value.width} × {value.height} px
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {savingsPct > 5 && (
                  <div className="compression-status-badge">
                    -{savingsPct}% size
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRemove}
                  className="editor-action-btn"
                  style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                  aria-label="Remove image"
                >
                  <X size={12} />
                  Remove
                </button>
              </div>
            </div>
          </div>

          <div className="compression-stats-row">
            <div className="comp-stat-box">
              <span className="comp-stat-label">Original</span>
              <span className="comp-stat-value">{formatBytes(value.originalSize)}</span>
            </div>
            <div className="comp-stat-box">
              <span className="comp-stat-label">Optimized</span>
              <span className="comp-stat-value">{formatBytes(value.compressedSize)}</span>
            </div>
            <div className="comp-stat-box">
              <span className="comp-stat-label">Savings</span>
              <span className="comp-stat-value savings">
                {savingsPct > 0 ? `-${savingsPct}%` : '0%'}
              </span>
            </div>
            <div className="comp-stat-box">
              <span className="comp-stat-label">Dimensions</span>
              <span className="comp-stat-value">{value.width}×{value.height}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageShare;
