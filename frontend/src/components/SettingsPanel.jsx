import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx'; // Updated extension

function SettingsPanel({ initialSettings, onReloadConfig, isModelLoading, reloadStatus }) {
  const { themeName, changeTheme, availableThemes, isLoading: isThemeLoading } = useTheme(); // Use theme context

  // Internal state for model settings, initialized from props
  // We use a single state object to make passing it easier
  const [currentSettings, setCurrentSettings] = useState(initialSettings);

  // Update internal state if initialSettings prop changes (e.g., after model load)
  useEffect(() => {
    setCurrentSettings(initialSettings);
  }, [initialSettings]);

  const handleInputChange = (event) => {
    const { name, value, type } = event.target;
    let updatedValue = value;

    // Handle type conversion for numbers
    if (type === 'number') {
        // Use specific keys for number parsing logic
        if (name === 'max_tokens') {
            updatedValue = parseInt(value, 10) || 1; // Ensure positive integer
        } else if (name === 'temperature' || name === 'top_p') {
            updatedValue = parseFloat(value) || 0; // Allow float, default to 0
        }
        // Ensure number fields don't go empty resulting in NaN later
        if (value === '') updatedValue = type === 'number' ? 0 : ''; 
    }

    setCurrentSettings(prevSettings => ({
      ...prevSettings,
      [name]: updatedValue,
    }));
  };

  const handleThemeChange = (event) => {
    changeTheme(event.target.value);
    // Optionally, if theme change should also trigger a settings save/reload:
    // onReloadConfig({ ...currentSettings, theme: event.target.value });
  };

  // When reload button is clicked, pass the current internal state up
  const handleReloadClick = () => {
    onReloadConfig(currentSettings);
  };

  // Add console logs before returning JSX
  console.log('Rendering SettingsPanel');
  console.log('Theme Context Values:', { themeName, availableThemes, isThemeLoading });
  console.log('Current Internal Settings:', currentSettings);

  return (
    <div className="settings-panel">
      <h2>Settings</h2>

      {/* Theme Selector */} 
      {console.log('Rendering Theme Selector section')} {/* Log before the section */}
      <div className="settings-group">
        <label htmlFor="theme-select">Theme</label>
        <select
          id="theme-select"
          value={themeName}
          onChange={handleThemeChange}
          disabled={isThemeLoading}
        >
          {isThemeLoading ? (
            <option>Loading themes...</option>
          ) : (
            availableThemes.map(name => (
              <option key={name} value={name}>
                {name} {/* You might want to format the name later */}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="settings-group">
        <label htmlFor="model_path_display">Model Path</label>
        <textarea
          id="model_path_display"
          name="model_path"
          value={currentSettings.model_path || ''}
          readOnly
          rows={2}
          style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed', opacity: 0.7 }}
        />
      </div>

      <div className="settings-group">
        <label htmlFor="max_tokens">Max Tokens</label>
        <input
          type="number"
          id="max_tokens"
          name="max_tokens"
          value={currentSettings.max_tokens}
          onChange={handleInputChange}
          min="1"
          step="50"
        />
      </div>

      <div className="settings-group">
        <label htmlFor="system_prompt">System Prompt</label>
        <textarea
          id="system_prompt"
          name="system_prompt"
          value={currentSettings.system_prompt}
          onChange={handleInputChange}
          rows={5}
        />
      </div>

      <div className="settings-group">
        <label htmlFor="temperature">Temperature:</label>
        <input
          type="number"
          id="temperature"
          name="temperature"
          value={currentSettings.temperature}
          onChange={handleInputChange}
          min="0"
          max="2.0"
          step="0.1"
        />
      </div>

      <div className="settings-group">
        <label htmlFor="top_p">Top P:</label>
        <input
          type="number"
          id="top_p"
          name="top_p"
          value={currentSettings.top_p}
          onChange={handleInputChange}
          min="0"
          max="1.0"
          step="0.05"
        />
      </div>

      <button onClick={handleReloadClick} disabled={isModelLoading}>
        {isModelLoading ? 'Applying...' : 'Reload Model Config'}
      </button>

      {reloadStatus.message && (
        <div className={`reload-${reloadStatus.type}`}>
          {reloadStatus.message}
        </div>
      )}

    </div>
  );
}

export default SettingsPanel;
