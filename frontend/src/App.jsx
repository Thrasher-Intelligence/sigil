import { useState, useEffect, useRef } from 'react';
import './App.css';
import SettingsPanel from './components/SettingsPanel'; // Import the correct component

// Base API URL (makes it easier to change)
const API_BASE_URL = 'http://localhost:8000';

// Default settings (could also fetch from backend on initial load)
const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant.";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TEMPERATURE_MAX = 2.0;
const DEFAULT_TEMPERATURE_STEP = 0.1;
const DEFAULT_TOP_P = 0.95;
const DEFAULT_MAX_TOKENS = 1000;

// Message structure (implied):
// { sender: 'user' | 'backend' | 'system', text: string, id: string }

// --- Model Load Panel Component ---
function ModelLoadPanel({ 
  modelPath, setModelPath, 
  onLoadModel, modelLoadStatus, 
  modelLoadError 
}) {
  const isLoading = modelLoadStatus === 'loading';
  const isLoaded = modelLoadStatus === 'loaded';

  return (
    <div className="model-load-panel settings-group"> {/* Reusing settings-group style */}
      <label htmlFor="model-path">Model Path:</label>
      <input
        type="text"
        id="model-path"
        value={modelPath}
        onChange={(e) => setModelPath(e.target.value)}
        placeholder="e.g., ./models/tinyllama or /path/to/model"
        disabled={isLoading || isLoaded} // Disable input after load
      />
      <button onClick={onLoadModel} disabled={isLoading || isLoaded || !modelPath.trim()}>
        {isLoading ? 'Loading Model...' : isLoaded ? 'Model Loaded' : 'Load Model'}
      </button>
      {modelLoadStatus === 'error' && <p className="error-message">Load failed: {modelLoadError}</p>}
      {isLoaded && <p className="success-message">Model loaded successfully!</p>}
    </div>
  );
}

function App() {
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]); // Array of message objects
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // Error message string or null
  const messagesEndRef = useRef(null); // Ref for scrolling div
  const loadingMessageIdRef = useRef(null); // Ref to store loading message ID

  // Settings State
  const [modelPath, setModelPath] = useState(''); // Add model path state
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [topP, setTopP] = useState(DEFAULT_TOP_P);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const [reloadStatus, setReloadStatus] = useState({ type: null, message: null }); // e.g., { type: 'success', message: 'Applied!' }

  // New Model Loading State
  const [modelPathInput, setModelPathInput] = useState('');
  const [modelLoadStatus, setModelLoadStatus] = useState('idle');
  const [modelLoadError, setModelLoadError] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Handler for loading the model
  const handleLoadModel = async () => {
    setModelLoadStatus('loading');
    setModelLoadError(null);
    const path = modelPathInput.trim();
    if (!path) {
      setModelLoadError('Model path cannot be empty.');
      setModelLoadStatus('error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/model/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: path }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `HTTP error! status: ${response.status}`);
      }
      console.log("Load model response:", data);
      setModelLoadStatus('loaded');
      setModelPath(path); // Store the successfully loaded path
      // Fetch current settings after successful load (optional but good practice)
      // Consider fetching settings here or relying on initial fetch
    } catch (err) {
       console.error('Failed to load model:', err);
       setModelLoadError(err.message || 'An unknown error occurred');
       setModelLoadStatus('error');
    }
  };

  const handleApplySettings = async (settingsFromPanel) => {
    // Now receives the full settings object from the panel
    setReloadStatus({ type: 'loading', message: 'Applying...' });
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/settings/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Use data from the panel, ensure keys match backend
        body: JSON.stringify({ 
            system_prompt: settingsFromPanel.system_prompt,
            temperature: settingsFromPanel.temperature, // Assuming panel uses this key
            top_p: settingsFromPanel.top_p,           // Assuming panel uses this key
            max_new_tokens: settingsFromPanel.max_tokens // Assuming panel uses this key
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `HTTP error! status: ${response.status}`);
      }
      console.log("Apply settings response:", data);
      // Update App's state to reflect successful application
      setSystemPrompt(settingsFromPanel.system_prompt);
      // setTemperature(settingsFromPanel.temperature);
      // setTopP(settingsFromPanel.top_p);
      setMaxTokens(settingsFromPanel.max_tokens);

      setReloadStatus({ type: 'success', message: 'Settings applied!' });
      setTimeout(() => setReloadStatus({ type: null, message: null }), 2000);

    } catch (err) {
       console.error('Failed to apply model settings:', err);
       const errorMsg = `Apply settings failed: ${err.message}`;
       setError(errorMsg);
       setReloadStatus({ type: 'error', message: errorMsg });
       setTimeout(() => setReloadStatus({ type: null, message: null }), 3000);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput || modelLoadStatus !== 'loaded') return; // Don't submit if model not loaded

    const userMessage = {
      sender: 'user',
      text: trimmedInput,
      id: `user-${Date.now()}`
    };
    setChatHistory(prev => [...prev, userMessage]);

    const loadingMsgId = `loading-${Date.now()}`;
    loadingMessageIdRef.current = loadingMsgId;
    const loadingMessage = {
        sender: 'system',
        text: '...',
        id: loadingMsgId
    };
    setChatHistory(prev => [...prev, loadingMessage]);

    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Use the new endpoint path
      const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmedInput }),
      });

      const idToRemove = loadingMessageIdRef.current;
      loadingMessageIdRef.current = null;
      if (idToRemove) {
        setChatHistory(prev => prev.filter(msg => msg.id !== idToRemove));
      }
      
      const data = await response.json(); // Always parse JSON

      if (!response.ok) {
        throw new Error(data.detail || `HTTP error! status: ${response.status}`);
      }

      console.log("Backend response data:", data);
      const backendMessage = {
        sender: 'backend',
        text: data.response || 'Backend did not provide a response.',
        id: `backend-${Date.now()}`
      };
      setChatHistory(prev => [...prev, backendMessage]);

    } catch (e) { // Removed type catch error
      console.error('Fetch error:', e);
      const errorMessage = `Failed to fetch: ${e.message}`;
      setError(errorMessage);
      
      // Ensure loading message is removed on error and add system error message
      const idToRemoveOnError = loadingMessageIdRef.current;
      loadingMessageIdRef.current = null; 
      setChatHistory(prev => [
          ...prev.filter(msg => msg.id !== idToRemoveOnError), // Remove loading message if it was still there
          { sender: 'system', text: `Error: ${e.message}`, id: `error-${Date.now()}` }
      ]);
      
    } finally {
      setIsLoading(false);
      // Final check for safety, though likely redundant now
      const finalIdToRemove = loadingMessageIdRef.current;
      if (finalIdToRemove) {
         loadingMessageIdRef.current = null;
         setChatHistory(prev => prev.filter(msg => msg.id !== finalIdToRemove));
      }
      setTimeout(scrollToBottom, 0);
    }
  };

  const modelLoaded = modelLoadStatus === 'loaded';

  // Construct initialSettings for the panel
  const settingsPanelProps = {
      model_path: modelPath, // Use the state holding the loaded path
      system_prompt: systemPrompt,
      temperature: temperature,
      top_p: topP,
      max_tokens: maxTokens
  };

  return (
    <div className="app-layout"> 
       {/* Left Panel: Settings and Model Load */}
       <div className="left-panel">
         <ModelLoadPanel 
            modelPath={modelPathInput}
            setModelPath={setModelPathInput}
            onLoadModel={handleLoadModel}
            modelLoadStatus={modelLoadStatus}
            modelLoadError={modelLoadError}
         />
         <SettingsPanel
            initialSettings={settingsPanelProps}
            onReloadConfig={handleApplySettings}
            isModelLoading={reloadStatus.type === 'loading'}
            reloadStatus={reloadStatus}
         />
      </div>

      {/* Right Panel: Chat Area */}
      <div className="chat-container">
        <header className="chat-header">
          <h1>Sigil</h1>
          {/* Optionally display model status here */} 
          {modelLoaded && <span className="model-status-indicator">Model Ready</span>}
          {!modelLoaded && modelLoadStatus !== 'loading' && <span className="model-status-indicator error">Model Not Loaded</span>}
          {modelLoadStatus === 'loading' && <span className="model-status-indicator loading">Loading Model...</span>}
        </header>

        <div className="messages-area">
          {/* Display message asking user to load model if not loaded */}
          {modelLoadStatus === 'idle' && (
            <div className="message system-message">
              <p>Please enter the model path and click 'Load Model' in the left panel to begin.</p>
            </div>
          )}
          {modelLoadStatus === 'error' && (
             <div className="message system-message error-message"> 
               <p>Failed to load model. Check the path and console for details. Error: {modelLoadError}</p>
             </div>
          )}

          {chatHistory.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}-message ${msg.id.startsWith('loading-') ? 'loading-message' : ''}`}>
              {msg.id.startsWith('loading-') ? (
                <div className="dots-container"><span>.</span><span>.</span><span>.</span></div>
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

         {/* Display general fetch error message if it exists */}
         {error && <p className="error-message chat-error">Chat Error: {error}</p>}

        <form onSubmit={handleSubmit} className="input-bar">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={modelLoaded ? "Type your message..." : "Load model first..."}
            disabled={isLoading || !modelLoaded} // Disable if chat is loading OR model not loaded
            aria-label="Chat message input"
          />
          <button type="submit" disabled={isLoading || !modelLoaded}> 
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
