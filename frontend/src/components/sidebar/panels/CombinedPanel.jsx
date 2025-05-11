import React, { useState, useEffect } from 'react';
import SettingsPanel from './SettingsPanel';
import ModelLoadPanel from './ModelLoadPanel';
import PrecisionSettingsPanel from './PrecisionSettingsPanel';
import SavedChatsPanel from './SavedChatsPanel';
import PropTypes from 'prop-types';
import ModeToggleSwitch from '../../ui/ModeToggleSwitch';
import './CombinedPanel.css';

// This component receives all props needed by both SettingsPanel and ModelLoadPanel
const CombinedPanel = (props) => {
  const { 
      modelLoaded, 
      setLoadStatus, 
      setLoading, 
      isLoading, 
      currentModelPath,
      isModelLoaded,
      themeName,
      setThemeName,
      themeList,
      onHfUsernameUpdate,
      onDeviceUpdate,
      currentDevice,
      onClearChat,
      onLoadSession,
      loadedSessionSettings,
      onTabRename,
      activeTabId,
      newChatSettings,
      onNewChatSettingsChange,
      onSessionSettingsChange,
  } = props;
  
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'modelLoad', 'savedChats', 'interface', or 'precision'

  // --- State for UI settings ---
  const [colorMode, setColorMode] = useState('dark'); // Default to 'dark'
  // Always use Fira Code as the interface font
  const fontFamily = 'Fira Code';

  // --- Effects to apply UI settings ---
  useEffect(() => {
    document.body.classList.remove('light-mode', 'dark-mode'); // Clear existing classes
    document.body.classList.add(`${colorMode}-mode`); // Add current mode class
  }, [colorMode]); // Re-run only when colorMode changes
  
  // Apply Fira Code font family
  useEffect(() => {
    document.documentElement.style.setProperty('--font-family', 'Fira Code');
  }, []);

  // Effect to switch tab if device changes away from CUDA
  useEffect(() => {
    if (currentDevice !== 'cuda' && activeTab === 'precision') {
      setActiveTab('settings'); // Switch back to default tab
    }
    // Dependency array includes currentDevice and activeTab to re-run when they change
  }, [currentDevice, activeTab]);

  // Using CSS classes instead of inline styles

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Fixed Tab Buttons */}
      <div className="panel-tabs">
        <button
          className={`panel-tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title="Settings"
          aria-label="Settings panel"
          style={{ zIndex: activeTab === 'settings' ? 25 : 'auto' }}
        >
          <span className="panel-button-text">Set</span>
        </button>
        <button
          className={`panel-tab-button ${activeTab === 'modelLoad' ? 'active' : ''}`}
          onClick={() => setActiveTab('modelLoad')}
          title="Load Model"
          aria-label="Load Model panel"
          style={{ zIndex: activeTab === 'modelLoad' ? 25 : 'auto' }}
        >
          <span className="panel-button-text">Mod</span>
        </button>
        <button
          className={`panel-tab-button ${activeTab === 'savedChats' ? 'active' : ''}`}
          onClick={() => setActiveTab('savedChats')}
          title="Saved Chats"
          aria-label="Saved Chats panel"
          style={{ zIndex: activeTab === 'savedChats' ? 25 : 'auto' }}
        >
          <span className="panel-button-text">Chat</span>
        </button>
        <button
          className={`panel-tab-button ${activeTab === 'interface' ? 'active' : ''}`}
          onClick={() => setActiveTab('interface')}
          title="Interface"
          aria-label="Interface panel"
          style={{ zIndex: activeTab === 'interface' ? 25 : 'auto' }}
        >
          <span className="panel-button-text">UI</span>
        </button>
        {/* Conditionally render Precision tab button */}
        {currentDevice === 'cuda' && (
           <button
            className={`panel-tab-button ${activeTab === 'precision' ? 'active' : ''}`}
            onClick={() => setActiveTab('precision')}
            title="Precision"
            aria-label="Precision settings panel"
            style={{ zIndex: activeTab === 'precision' ? 25 : 'auto' }}
          >
            <span className="panel-button-text">Prec</span>
          </button>
        )}
      </div>

      {/* Panel Content Area (only visible when no overlay is active) */}
      <div className="panel-content" style={{ display: activeTab === 'settings' || activeTab === 'modelLoad' || activeTab === 'savedChats' || activeTab === 'interface' || activeTab === 'precision' ? 'none' : 'block' }}>
        {/* This area is now empty as all content is moved to overlays */}
      </div>

      {/* Settings Panel Overlay */}
      {activeTab === 'settings' && (
        <div className="panel-overlay">
          <div className="panel-container">
            <div className="glass-panel">
              <SettingsPanel 
                modelLoaded={modelLoaded} 
                onClearChat={onClearChat}
                loadedSessionSettings={loadedSessionSettings}
                activeTabId={activeTabId}
                newChatSettings={newChatSettings}
                onNewChatSettingsChange={onNewChatSettingsChange}
                onSessionSettingsChange={onSessionSettingsChange}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Model Load Panel Overlay */}
      {activeTab === 'modelLoad' && (
        <div className="panel-overlay">
          <div className="panel-container">
            <div className="glass-panel">
              <ModelLoadPanel 
                setLoadStatus={setLoadStatus}
                setLoading={setLoading}
                isLoading={isLoading}
                isModelLoaded={isModelLoaded}
                currentModelPath={currentModelPath}
                onHfUsernameUpdate={onHfUsernameUpdate}
                onDeviceUpdate={onDeviceUpdate}
                currentDevice={currentDevice}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Saved Chats Panel Overlay */}
      {activeTab === 'savedChats' && (
        <div className="panel-overlay">
          <div className="panel-container">
            <div className="glass-panel">
              <SavedChatsPanel 
                onSelectSession={onLoadSession}
                onRenameSession={onTabRename}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Interface Panel Overlay */}
      {activeTab === 'interface' && (
        <div className="panel-overlay">
          <div className="panel-container">
            <div className="glass-panel">
              {/* Theme Selection and Mode Selection in one section */}
              <div className="ui-settings-group">
                <label htmlFor="theme-select" className="ui-settings-label">Theme:</label>
                <select 
                  id="theme-select" 
                  value={themeName} 
                  onChange={e => setThemeName(e.target.value)}
                  className="ui-settings-select"
                >
                  {themeList.map(theme => (
                    <option key={theme} value={theme}>{theme}</option>
                  ))}
                </select>
                
                {/* Light/Dark Mode Toggle - now positioned directly under theme selection */}
                <div className="mode-toggle-container" style={{ marginTop: '12px' }}>
                  <label htmlFor="mode-toggle" className="mode-toggle-label ui-settings-label">Mode:</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ModeToggleSwitch
                      id="mode-toggle"
                      isDarkMode={colorMode === 'dark'}
                      onToggle={() => setColorMode(prevMode => prevMode === 'dark' ? 'light' : 'dark')}
                    />
                    <span className="mode-toggle-value" style={{ marginLeft: '10px' }}>
                      {colorMode}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      

      
      {/* Precision Panel Overlay */}
      {activeTab === 'precision' && currentDevice === 'cuda' && (
        <div className="panel-overlay">
          <div className="panel-container">
            <div className="glass-panel">
              <PrecisionSettingsPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

CombinedPanel.propTypes = {
  modelLoaded: PropTypes.bool.isRequired,
  setLoadStatus: PropTypes.func.isRequired,
  setLoading: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  currentModelPath: PropTypes.string,
  isModelLoaded: PropTypes.bool.isRequired,
  themeName: PropTypes.string.isRequired,
  setThemeName: PropTypes.func.isRequired,
  themeList: PropTypes.array.isRequired,
  onHfUsernameUpdate: PropTypes.func.isRequired,
  onDeviceUpdate: PropTypes.func.isRequired,
  currentDevice: PropTypes.oneOf(['cuda', 'cpu', null]),
  onClearChat: PropTypes.func.isRequired,
  onLoadSession: PropTypes.func.isRequired,
  loadedSessionSettings: PropTypes.shape({
    systemPrompt: PropTypes.string,
    temperature: PropTypes.number,
    topP: PropTypes.number,
    maxTokens: PropTypes.number,
  }),
  onTabRename: PropTypes.func.isRequired,
  activeTabId: PropTypes.string.isRequired,
  newChatSettings: PropTypes.shape({
    systemPrompt: PropTypes.string.isRequired,
    temperature: PropTypes.number.isRequired,
    topP: PropTypes.number.isRequired,
    maxTokens: PropTypes.number.isRequired,
  }).isRequired,
  onNewChatSettingsChange: PropTypes.func.isRequired,
  onSessionSettingsChange: PropTypes.func.isRequired,
};

export default CombinedPanel; 