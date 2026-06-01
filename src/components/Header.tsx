import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="app-header" style={{ marginBottom: '2rem' }}>
      <div className="logo-container">
        <h1 className="logo-text">AymnSend</h1>
      </div>
    </header>
  );
};
export default Header;
