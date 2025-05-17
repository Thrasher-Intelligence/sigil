import React, { useState, useEffect } from "react";
import {
  API_BASE_URL, // <-- Restore import
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_MAX_TOKENS,
  DEFAULT_REPETITION_PENALTY,
} from "../../../constants"; // Import shared constants
import PropTypes from "prop-types";
import "./SettingsPanel.css"; // Import component styles

// Default settings object for convenience
const DEFAULTS = {
  SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
  TEMPERATURE: DEFAULT_TEMPERATURE,
  TOP_P: DEFAULT_TOP_P,
  MAX_TOKENS: DEFAULT_MAX_TOKENS,
  REPETITION_PENALTY: DEFAULT_REPETITION_PENALTY,
};

// Settings Panel Component
function SettingsPanel({
  modelLoaded, // Only need to know if the model is loaded to enable/disable
  // config, // Removed - managing state internally or via loadedSessionSettings
  // onConfigChange, // Removed
  // onReloadModel, // Removed - No model reload button here
  // reloadStatus, // Removed
  onClearChat, // Keep for the clear chat button
  // --- ADDED: Accept loaded settings prop ---
  loadedSessionSettings,
  // --- ADDED: Accept props for new chat settings logic ---
  activeTabId,
  newChatSettings,
  onNewChatSettingsChange,
  // --- ADDED: Accept session settings handler ---
  onSessionSettingsChange,
}) {
  // State for settings inputs - These now reflect the UI state which might be
  // derived from newChatSettings or loadedSessionSettings
  const [systemPrompt, setSystemPrompt] = useState(DEFAULTS.SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(DEFAULTS.TEMPERATURE);
  const [topP, setTopP] = useState(DEFAULTS.TOP_P);
  const [maxTokens, setMaxTokens] = useState(DEFAULTS.MAX_TOKENS);
  const [repetitionPenalty, setRepetitionPenalty] = useState(
    DEFAULTS.REPETITION_PENALTY,
  );

  // --- RESTORED: Apply button state ---
  const [applyStatus, setApplyStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [applyError, setApplyError] = useState(null);
  // --- END RESTORED ---

  // REMOVED: Initial fetch status state
  // const [initialFetchStatus, setInitialFetchStatus] = useState('idle');

  // Determine if inputs should be disabled
  // --- MODIFIED: Only disable if model isn't loaded ---
  const isDisabled = !modelLoaded;

  // --- MODIFIED: useEffect to update inputs based on active tab and props ---
  useEffect(() => {
    const isNewChat = activeTabId === "__NEW_CHAT__";
    if (isNewChat) {
      // "New Chat" tab is active, use newChatSettings
      console.log(
        "SettingsPanel: Applying new chat settings from props",
        newChatSettings,
      );
      setSystemPrompt(newChatSettings.systemPrompt ?? DEFAULTS.SYSTEM_PROMPT);
      setTemperature(newChatSettings.temperature ?? DEFAULTS.TEMPERATURE);
      setTopP(newChatSettings.topP ?? DEFAULTS.TOP_P);
      setMaxTokens(newChatSettings.maxTokens ?? DEFAULTS.MAX_TOKENS);
      setRepetitionPenalty(
        newChatSettings.repetitionPenalty ?? DEFAULTS.REPETITION_PENALTY,
      );
    } else if (loadedSessionSettings) {
      // An existing session tab is active, apply its loaded settings
      // Inputs are now enabled if model is loaded
      console.log(
        "SettingsPanel: Applying loaded session settings (editable)",
        loadedSessionSettings,
      );
      setSystemPrompt(
        loadedSessionSettings.systemPrompt ?? DEFAULTS.SYSTEM_PROMPT,
      );
      setTemperature(loadedSessionSettings.temperature ?? DEFAULTS.TEMPERATURE);
      setTopP(loadedSessionSettings.topP ?? DEFAULTS.TOP_P);
      setMaxTokens(loadedSessionSettings.maxTokens ?? DEFAULTS.MAX_TOKENS);
      setRepetitionPenalty(
        loadedSessionSettings.repetitionPenalty ?? DEFAULTS.REPETITION_PENALTY,
      );
    } else {
      // Existing session tab active, but settings failed to load? Revert to defaults.
      // This case might indicate an error elsewhere. Still editable if model loaded.
      console.log(
        "SettingsPanel: Reverting to default settings (existing tab, no loaded settings)",
      );
      setSystemPrompt(DEFAULTS.SYSTEM_PROMPT);
      setTemperature(DEFAULTS.TEMPERATURE);
      setTopP(DEFAULTS.TOP_P);
      setMaxTokens(DEFAULTS.MAX_TOKENS);
      setRepetitionPenalty(DEFAULTS.REPETITION_PENALTY);
    }
    // Depend on the relevant props that determine the displayed settings
  }, [activeTabId, newChatSettings, loadedSessionSettings]);
  // --- END: useEffect modification ---

  // --- MODIFIED: Input change handlers ---
  // These now update the local state for UI feedback AND call the
  // appropriate callback (onNewChatSettingsChange or onSessionSettingsChange)
  // based on the active tab.

  // I think this is handled here-ish:
  // I noticed in the console that when the user sets a new value for a setting,
  // the settings update with every single click and keystroke.
  // We want the settings to update only when the user hits the update button.

  const handleSettingChange = (field, value) => {
    // Update local state immediately for responsive UI
    let currentVal = value;
    if (field === "systemPrompt") setSystemPrompt(value);
    else if (field === "temperature") {
      currentVal = parseFloat(value) || 0; // Ensure numeric conversion
      setTemperature(currentVal);
    } else if (field === "topP") {
      currentVal = parseFloat(value) || 0; // Ensure numeric conversion
      setTopP(currentVal);
    } else if (field === "maxTokens") {
      currentVal = parseInt(value, 10) || 1; // Ensure numeric conversion
      setMaxTokens(currentVal);
    } else if (field === "repetitionPenalty") {
      currentVal = parseFloat(value) || 1.0; // Ensure numeric conversion, minimum 1.0
      setRepetitionPenalty(currentVal);
    }

    const isNewChat = activeTabId === "__NEW_CHAT__";

    if (isNewChat) {
      // If on the New Chat tab, propagate the change up using onNewChatSettingsChange
      const updatedSettings = {
        ...newChatSettings,
        [field]: currentVal,
      };
      onNewChatSettingsChange(updatedSettings);
    } else if (onSessionSettingsChange && loadedSessionSettings) {
      // If on an existing chat tab, propagate the change up using onSessionSettingsChange
      const updatedSettings = {
        ...loadedSessionSettings,
        [field]: currentVal,
      };
      onSessionSettingsChange(updatedSettings);
    } else {
      console.warn(
        "SettingsPanel: Cannot propagate setting change - missing handler or session settings.",
      );
    }
  };

  // --- RESTORED: handleApplySettings function ---
  // Handler for applying model settings (Updates backend's global/default settings)
  const handleApplySettings = async () => {
    setApplyStatus("loading");
    setApplyError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/settings/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Send values currently displayed in the UI
          system_prompt: systemPrompt,
          temperature: temperature,
          top_p: topP,
          max_new_tokens: maxTokens,
          repetition_penalty: repetitionPenalty,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.detail || `HTTP error! status: ${response.status}`,
        );
      }
      console.log("Apply settings response:", data);
      setApplyStatus("success");
    } catch (err) {
      console.error("Failed to apply model settings:", err);
      setApplyError(`Apply settings failed: ${err.message}`);
      setApplyStatus("error");
    }
  };
  // --- END RESTORED ---

  // --- RESTORED: Effect for clearing applyStatus messages ---
  useEffect(() => {
    let timer;
    if (applyStatus === "success") {
      timer = setTimeout(() => setApplyStatus(null), 2000);
    } else if (applyStatus === "error") {
      timer = setTimeout(() => {
        setApplyStatus(null);
        setApplyError(null); // Clear error message too
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [applyStatus]);
  // --- END RESTORED ---

  // Disable form elements based on model load status and if it's a loaded session
  // const isDisabled = !modelLoaded || isLoading; // Old logic

  return (
    <div className="settings-panel">
      <h2>Settings</h2>
      {/* Input fields remain the same, but their values are now controlled by state updated via props */}
      <div className="settings-group">
        <label htmlFor="system-prompt">System Prompt:</label>
        <textarea
          id="system-prompt"
          value={systemPrompt}
          onChange={(e) => handleSettingChange("systemPrompt", e.target.value)}
          rows={5}
          disabled={isDisabled}
        />
      </div>
      <div className="settings-group">
        <label htmlFor="temperature">Temperature:</label>
        <input
          type="number"
          id="temperature"
          value={temperature}
          onChange={(e) =>
            handleSettingChange("temperature", parseFloat(e.target.value) || 0)
          }
          min="0"
          max="2.0" // Match backend validation
          step="0.1"
          disabled={isDisabled}
        />
      </div>
      <div className="settings-group">
        <label htmlFor="top-p">Top P:</label>
        <input
          type="number"
          id="top-p"
          value={topP}
          onChange={(e) =>
            handleSettingChange("topP", parseFloat(e.target.value) || 0)
          }
          min="0"
          max="1.0"
          step="0.05"
          disabled={isDisabled}
        />
      </div>
      <div className="settings-group">
        <label htmlFor="max-tokens">Max New Tokens:</label>
        <input
          type="number"
          id="max-tokens"
          value={maxTokens}
          onChange={(e) =>
            handleSettingChange("maxTokens", parseInt(e.target.value, 10) || 1)
          }
          min="1"
          step="50"
          disabled={isDisabled}
        />
      </div>
      <div className="settings-group">
        <label htmlFor="repetition-penalty">Repetition Penalty:</label>
        <input
          type="number"
          id="repetition-penalty"
          value={repetitionPenalty}
          onChange={(e) =>
            handleSettingChange(
              "repetitionPenalty",
              parseFloat(e.target.value) || 1.0,
            )
          }
          min="1.0"
          max="2.0"
          step="0.05"
          disabled={isDisabled}
        />
      </div>

      {/* --- RESTORED: Apply Settings Button --- */}
      {/* This button updates the backend's global/default settings */}
      {/* Enabled only when model is loaded */}
      {/* --- MODIFIED: Apply button disabled only if model not loaded or applying --- */}
      <button
        onClick={handleApplySettings}
        disabled={!modelLoaded || applyStatus === "loading"}
      >
        {applyStatus === "loading" ? "Applying..." : "Apply Settings"}
        {/* Changed label slightly */}
      </button>
      {applyStatus === "success" && (
        <p className="success-message">Backend settings applied!</p>
      )}
      {applyStatus === "error" && (
        <p className="error-message">
          {applyError || "Failed to apply settings."}
        </p>
      )}

      {/* Clear Chat Button - Disable based only on model load status */}
      <button
        onClick={onClearChat}
        className="clear-chat-button-settings"
        disabled={!modelLoaded} // Only disable if model not loaded
      >
        Clear Chat History
      </button>
    </div>
  );
}

SettingsPanel.propTypes = {
  modelLoaded: PropTypes.bool.isRequired,
  // Removed unused props
  // config: PropTypes.object.isRequired,
  // onConfigChange: PropTypes.func.isRequired,
  // onReloadModel: PropTypes.func.isRequired,
  // reloadStatus: PropTypes.string,
  onClearChat: PropTypes.func.isRequired,
  // --- ADDED: PropType for loadedSessionSettings ---
  loadedSessionSettings: PropTypes.shape({
    systemPrompt: PropTypes.string,
    temperature: PropTypes.number,
    topP: PropTypes.number,
    maxTokens: PropTypes.number,
    repetitionPenalty: PropTypes.number,
  }), // Can be null
  // --- ADDED: PropTypes for new chat settings logic ---
  activeTabId: PropTypes.string.isRequired,
  newChatSettings: PropTypes.shape({
    systemPrompt: PropTypes.string.isRequired,
    temperature: PropTypes.number.isRequired,
    topP: PropTypes.number.isRequired,
    maxTokens: PropTypes.number.isRequired,
    repetitionPenalty: PropTypes.number.isRequired,
  }).isRequired,
  onNewChatSettingsChange: PropTypes.func.isRequired,
  // --- ADDED: PropType for session settings change handler ---
  onSessionSettingsChange: PropTypes.func.isRequired,
};

export default SettingsPanel;
