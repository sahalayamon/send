import React from 'react';

interface TabSelectorProps {
  activeTab: 'text' | 'file';
  onChange: (tab: 'text' | 'file') => void;
}

export const TabSelector: React.FC<TabSelectorProps> = ({ activeTab, onChange }) => {
  return (
    <div className="tab-container">
      <button
        type="button"
        className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
        onClick={() => onChange('text')}
        aria-label="Switch to share text mode"
      >
        Text Snippet
      </button>
      <button
        type="button"
        className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
        onClick={() => onChange('file')}
        aria-label="Switch to share file mode"
      >
        File Upload
      </button>
    </div>
  );
};

export default TabSelector;
