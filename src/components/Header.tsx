import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="logo-container">
        <h1 className="logo-text">Tempsend.</h1>
      </div>

      <div className="badge-glow">
        100% Private — Client-Side Only
      </div>

      <p className="app-description">
        Share text snippets or images via URL. Everything is Gzip-compressed and encoded in the
        hash fragment. Your data never touches any server.
      </p>
    </header>
  );
};
export default Header;
