import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="logo-container">
        <h1 className="logo-text">AymnSend</h1>
      </div>

      <div className="badge-glow">
        100% Private — Client-Side Only
      </div>

      <p className="app-description">
        Share text snippets or any file via a short link. Stored securely on Supabase.
        Link expires based on your custom lifetime selection. Your data is never tracked.
      </p>
    </header>
  );
};
export default Header;
