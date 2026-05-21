import React, { useState, useRef } from 'react';
import { UploadCloud, X, AlertCircle, File as FileIcon } from 'lucide-react';
import { formatFileSize, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../lib/shares';

interface FileShareProps {
  value: File | null;
  onChange: (val: File | null) => void;
}

// File types that can be previewed as images
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export const FileShare: React.FC<FileShareProps> = ({ value, onChange }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // Generate image preview if applicable
    if (IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreviewUrl(null);
    }

    onChange(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setError(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectFile = () => fileInputRef.current?.click();

  return (
    <div className="file-uploader-container">
      {!value ? (
        <>
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
            aria-label="Upload file drag and drop area"
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden-input"
              accept="*/*"
              onChange={handleFileChange}
            />
            <div className="upload-icon-wrapper">
              <UploadCloud size={22} />
            </div>
            <div>
              <p className="upload-title">Drop any file here</p>
              <p className="upload-subtitle">
                Images, PDFs, ZIPs, documents — any file up to {MAX_FILE_SIZE_MB}MB.
              </p>
              <p className="upload-subtitle" style={{ marginTop: '0.25rem' }}>
                Uploaded securely to Supabase Storage. Link expires in 1 hour.
              </p>
            </div>
          </div>

          {error && (
            <div className="capacity-warning" style={{ marginTop: '0.75rem' }}>
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
        </>
      ) : (
        <div className="preview-container">
          {/* Image preview for image files */}
          {imagePreviewUrl ? (
            <div className="image-preview-wrapper">
              <img src={imagePreviewUrl} alt="File preview" className="image-preview-element" />
              <div className="preview-overlay-info">
                <div className="image-meta-info">
                  <span className="image-meta-name" title={value.name}>{value.name}</span>
                  <span className="image-meta-dimensions">{formatFileSize(value.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="editor-action-btn"
                  style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                  aria-label="Remove file"
                >
                  <X size={12} /> Remove
                </button>
              </div>
            </div>
          ) : (
            /* Generic file preview for non-image files */
            <div className="file-preview-block">
              <div className="file-preview-icon">
                <FileIcon size={28} />
              </div>
              <div className="file-preview-meta">
                <span className="file-preview-name" title={value.name}>{value.name}</span>
                <span className="file-preview-type">
                  {value.type || 'Unknown type'} &nbsp;·&nbsp; {formatFileSize(value.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="editor-action-btn"
                style={{ borderColor: 'var(--error)', color: 'var(--error)', marginLeft: 'auto' }}
                aria-label="Remove file"
              >
                <X size={12} /> Remove
              </button>
            </div>
          )}

          <div className="compression-stats-row">
            <div className="comp-stat-box">
              <span className="comp-stat-label">File Name</span>
              <span className="comp-stat-value" style={{ fontSize: '0.78rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value.name}
              </span>
            </div>
            <div className="comp-stat-box">
              <span className="comp-stat-label">File Size</span>
              <span className="comp-stat-value">{formatFileSize(value.size)}</span>
            </div>
            <div className="comp-stat-box">
              <span className="comp-stat-label">Type</span>
              <span className="comp-stat-value" style={{ fontSize: '0.78rem' }}>
                {value.type?.split('/')[1]?.toUpperCase() || 'BIN'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileShare;
