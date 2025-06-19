import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-section">
          <h1 className="app-title">Automated Development Recorder</h1>
          <p className="app-subtitle">Transform screen recordings into executable code</p>
        </div>
        <div className="header-actions">
          <button className="header-button" title="Settings">
            ⚙️
          </button>
          <button className="header-button" title="Help">
            ❓
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
