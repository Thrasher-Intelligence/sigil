import React from 'react';
import DeviceIndicator from './ui/DeviceIndicator.jsx';

function AppHeader({
  onToggleSidebar,
  currentLoadedModelName,
  appChatMode,
  onChatModeChange,
  currentDevice,
  hfUsername,
  appModelLoadStatus,
}) {
  return (
    <header className="app-header">
      <button onClick={onToggleSidebar} className="sidebar-toggle-btn header-btn">
        {'☰'}
      </button>
      <h1 className="app-title">
        Sigil {currentLoadedModelName && <span className="loaded-model-name">({currentLoadedModelName})</span>}
      </h1>
      <div className="header-controls">
        {hfUsername && (
          <div className="welcome-message">
            Welcome {hfUsername}!
          </div>
        )}
        <div className="mode-selector">
          <button
            onClick={() => onChatModeChange('instruction')}
            className={appChatMode === 'instruction' ? 'active' : ''}
          >
            Instruct
          </button>
          <button
            onClick={() => onChatModeChange('chat')}
            className={appChatMode === 'chat' ? 'active' : ''}
          >
            Chat
          </button>
        </div>
        <DeviceIndicator device={currentDevice} username={hfUsername} />
      </div>
      <div className="model-status-group">
        {appModelLoadStatus === 'loaded' && <span className="model-status-indicator">Model Ready</span>}
        {appModelLoadStatus === 'idle' && <span className="model-status-indicator">Waiting for Model</span>}
        {appModelLoadStatus === 'error' && (
          <span className="model-status-indicator error">Model Load Failed</span>
        )}
        {appModelLoadStatus === 'loading' && (
          <span className="model-status-indicator loading">Loading Model...</span>
        )}
      </div>
    </header>
  );
}

export default AppHeader; 