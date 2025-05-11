import React from 'react';
import PropTypes from 'prop-types';
import ModeToggleSwitch from '../../ui/ModeToggleSwitch';
import './InterfacePanel.css';

function InterfacePanel({
  themeName,
  setThemeName,
  themeList,
  colorMode,
  setColorMode
}) {
  return (
    <div className="interface-panel">
      <h2>Interface Settings</h2>
      
      {/* Theme Selection */}
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
        
        {/* Light/Dark Mode Toggle */}
        <div className="mode-toggle-container">
          <label htmlFor="mode-toggle" className="mode-toggle-label ui-settings-label">Mode:</label>
          <div className="mode-toggle-wrapper">
            <ModeToggleSwitch
              id="mode-toggle"
              isDarkMode={colorMode === 'dark'}
              onToggle={() => setColorMode(prevMode => prevMode === 'dark' ? 'light' : 'dark')}
            />
            <span className="mode-toggle-value">
              {colorMode}
            </span>
          </div>
        </div>
      </div>

      {/* Additional UI settings can be added here in the future */}
      
    </div>
  );
}

InterfacePanel.propTypes = {
  themeName: PropTypes.string.isRequired,
  setThemeName: PropTypes.func.isRequired,
  themeList: PropTypes.array.isRequired,
  colorMode: PropTypes.oneOf(['dark', 'light']).isRequired,
  setColorMode: PropTypes.func.isRequired
};

export default InterfacePanel;