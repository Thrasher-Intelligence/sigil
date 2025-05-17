import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import ThemeLoader from './components/ThemeLoader.jsx';
import { API_BASE_URL } from './constants.js'; // Import shared constants
import Sidebar from './components/sidebar/Sidebar.jsx'; // <-- Updated import path after moving Sidebar
import TabContainer from './components/ui/tabs/TabContainer.jsx'; // <-- ADDED: Import TabContainer
import { useTabs } from './hooks/useTabs.js'; // <-- IMPORTED
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'; // <-- IMPORTED
import { useChat } from './hooks/useChat.js'; // <-- IMPORT useChat
import AppHeader from './components/AppHeader.jsx';
import ChatInterface from './components/chat/ChatInterface.jsx';
import { editMessage } from './api/editMessage.js'; // Import editMessage API utility

// Base API URL - Moved to constants.js
// const API_BASE_URL = 'http://localhost:8000';

// --- ADDED: Tab Constants ---
const NEW_CHAT_TAB_ID = '__NEW_CHAT__';

// Default settings - Store these to revert to when switching to "New Chat"
const DEFAULTS = {
  SYSTEM_PROMPT: "You are a helpful assistant.",
  TEMPERATURE: 0.7,
  // TEMPERATURE_CHAT: 0.7, // This seems unused now? Keep TEMPERTURE consistent.
  TOP_P: 0.95,
  MAX_TOKENS: 1000
};

// Message structure (implied):
// { sender: 'user' | 'backend' | 'system', text: string, id: string }

function App() {
  // --- App-level State (Global Concerns) ---
  const [isLoading, setIsLoading] = useState(false); // Global loading (e.g., for model load, session fetch)
  const [error, setError] = useState(null);       // Global error message
  const messagesEndRef = useRef(null);          // Ref for scrolling chat div

  // --- State directly managed by App.jsx (not in hooks yet or intentionally here) ---
  // const [userInput, setUserInput] = useState(''); // MOVED to useChat
  // const [chatHistory, setChatHistory] = useState([]); // MOVED to useChat
  // const loadingMessageIdRef = useRef(null); // MOVED to useChat
  const [appCurrentThreadId, setAppCurrentThreadId] = useState(null); // App's view of currentThreadId, synced with useChat & useTabs

  const [currentSessionSettings, setCurrentSessionSettings] = useState(null);
  const [newChatSettings, setNewChatSettings] = useState({
      systemPrompt: DEFAULTS.SYSTEM_PROMPT,
      temperature: DEFAULTS.TEMPERATURE,
      topP: DEFAULTS.TOP_P,
      maxTokens: DEFAULTS.MAX_TOKENS,
  });

  const initialChatMode = localStorage.getItem('chatMode') || 'instruction';
  const [appChatMode, setAppChatMode] = useState(initialChatMode);
  const [appModelLoadStatus, setAppModelLoadStatus] = useState('idle');

  const [themeName, setThemeName] = useState('AlienBlood');
  const [themeList, setThemeList] = useState([]);
  const [currentLoadedModelName, setCurrentLoadedModelName] = useState(null);
  const [hfUsername, setHfUsername] = useState(null);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Callback refs used to break circular dependency between useTabs and useChat ---
  const clearChatRequestRef = useRef(() => {});
  const loadSessionRequestRef = useRef((id) => {});

  // Wrappers to pass stable functions into useTabs
  const handleClearChatRequestProxy = useCallback(() => {
    clearChatRequestRef.current();
  }, []);

  const handleLoadSessionRequestProxy = useCallback((id) => {
    loadSessionRequestRef.current(id);
  }, []);

  // --- Initialize useTabs Hook ---
  const {
    openTabs,
    activeTabId, // Now available
    handleTabSelect,
    handleTabClose,
    handleTabRename,
    loadInitialSessionTabs,
    addSessionTabAndMakeActive, // Now available
    resetTabsToDefault,
  } = useTabs({
    onClearChatRequest: handleClearChatRequestProxy,
    onLoadSessionRequest: handleLoadSessionRequestProxy,
    NEW_CHAT_TAB_ID,
  });
  // --- END: useTabs Hook ---

  // --- Initialize useChat Hook (now we have activeTabId & addSessionTabAndMakeActive) ---
  const chatHook = useChat({
    initialChatHistory: [], // Start with empty history and update it when needed
    appChatMode,
    newChatSettings,
    currentSessionSettings,
    activeTabId, // Now passing the actual activeTabId from useTabs
    NEW_CHAT_TAB_ID,
    appModelLoadStatus,
    onSetAppIsLoading: setIsLoading,
    onSetAppError: setError,
    onSetAppCurrentThreadId: setAppCurrentThreadId,
    onAddSessionTabAndMakeActive: addSessionTabAndMakeActive, // Now passing the actual function from useTabs
    // Add current session settings updater to allow chat hook to update settings when needed
    onUpdateCurrentSessionSettings: setCurrentSessionSettings,
  });
  const { chatHistory, userInput, setUserInput, isSendingMessage, sendError, sendMessage, loadChatState, clearChatStateAndSettings: clearChatHookState, setChatHistory } = chatHook;

  // Handle editing a message
  const handleEditMessage = useCallback((messageId, newContent) => {
    return new Promise((resolve, reject) => {
      if (!appCurrentThreadId) {
        console.error('Cannot edit message: No thread ID available');
        setError('Cannot edit message: No active chat session');
        reject(new Error('No active chat session'));
        return;
      }

      // Find the message's index in the current chat history
      const messageIndex = chatHistory.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        console.error(`Message with ID ${messageId} not found in chat history`);
        setError('Failed to edit message: Message not found');
        reject(new Error('Message not found'));
        return;
      }

      // Only allow editing user messages
      const message = chatHistory[messageIndex];
      if (message.sender !== 'user') {
        console.error(`Cannot edit non-user message with ID ${messageId}`);
        setError('Only user messages can be edited');
        reject(new Error('Only user messages can be edited'));
        return;
      }

      setIsLoading(true);

      // Call the API to edit the message
      editMessage(appCurrentThreadId, messageIndex, newContent)
        .then(result => {
          if (result && result.success) {
            // Update the local chat history with the edited message
            const updatedHistory = [...chatHistory];
            updatedHistory[messageIndex] = {
              ...updatedHistory[messageIndex],
              text: newContent,
              content: newContent,
              edited: true
            };
            
            setChatHistory(updatedHistory);
            console.log(`Successfully edited message at index ${messageIndex} in thread ${appCurrentThreadId}`);
            resolve(true);
          } else {
            throw new Error('Edit operation failed');
          }
        })
        .catch(error => {
          console.error('Error editing message:', error);
          setError(`Failed to edit message: ${error.message || 'Unknown error'}`);
          reject(error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    });
  }, [chatHistory, appCurrentThreadId, setChatHistory, setError, setIsLoading]);

  // --- Define callbacks now that chatHook exists, and assign to refs ---
  const appLevelClearChatActions = useCallback(() => {
    clearChatHookState();
    setCurrentSessionSettings(null);
    setNewChatSettings({
      systemPrompt: DEFAULTS.SYSTEM_PROMPT,
      temperature: DEFAULTS.TEMPERATURE,
      topP: DEFAULTS.TOP_P,
      maxTokens: DEFAULTS.MAX_TOKENS,
    });
    console.log("App: Cleared chat state for New Chat tab or reset.");
  }, [clearChatHookState]);

  clearChatRequestRef.current = appLevelClearChatActions;

  const handleLoadSessionDataToState = useCallback((sessionData) => {
    if (!sessionData || !sessionData.thread_id || !sessionData.messages) {
        console.error("App: Attempted to load invalid session data:", sessionData);
        setError("Invalid session data received at App level.");
        return;
    }
    console.log(`App: Loading session data ${sessionData.thread_id} into app state and chat hook`);

    // First update thread ID to ensure consistent state
    setAppCurrentThreadId(sessionData.thread_id);
    
    // Extract settings before loading chat state to ensure they're available
    const loadedSettings = {
      systemPrompt: sessionData.system_prompt ?? DEFAULTS.SYSTEM_PROMPT,
      temperature: sessionData.sampling_settings?.temperature ?? DEFAULTS.TEMPERATURE,
      topP: sessionData.sampling_settings?.top_p ?? DEFAULTS.TOP_P,
      maxTokens: sessionData.sampling_settings?.max_new_tokens ?? DEFAULTS.MAX_TOKENS,
    };
    
    // Apply settings immediately
    setCurrentSessionSettings(loadedSettings);
    console.log("App: Applied session settings:", loadedSettings);
    
    // Pre-process the chat history for immediate display
    const formattedHistory = sessionData.messages.map((msg, index) => ({
      role: msg.role || 'unknown',
      content: msg.content || '',
      text: msg.content || '',
      id: `${msg.role || 'msg'}-${sessionData.thread_id}-${index}-${Date.now()}`,
      sender: msg.role === 'assistant' ? 'backend' : (msg.role || 'unknown'),
      tokens: msg.token_count || msg.tokens || null
    }));
    
    // Apply chat history immediately if we have access to chat hook's setChatHistory
    if (chatHook && chatHook.setChatHistory) {
      chatHook.setChatHistory(formattedHistory);
    }
    
    // Also pass to loadChatState to ensure complete synchronization
    loadChatState(sessionData);
    setError(null);
  }, [loadChatState, setAppCurrentThreadId, setCurrentSessionSettings, setError, chatHook]);

  const appLevelLoadSession = useCallback(async (tabIdToLoad) => {
    console.log(`App: Request to load session for tab ${tabIdToLoad} (from appLevelLoadSession)`);
    setIsLoading(true); // Global loading for session fetch
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/session/${tabIdToLoad}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.detail || `Failed to fetch session ${tabIdToLoad}`);
      }
      
      const sessionData = await response.json();
      console.log(`App: Successfully fetched session data for ${tabIdToLoad}`, sessionData);
      
      // First update the app level thread ID immediately
      setAppCurrentThreadId(sessionData.thread_id);
      
      // Directly process the fetched data
      handleLoadSessionDataToState(sessionData);
      
      // Force a re-render of the chat interface by updating chat hook state directly
      if (chatHook && chatHook.loadChatState) {
        // We need to ensure chat hook state is consistent with app state
        chatHook.loadChatState(sessionData);
      }
      
      // Schedule a scroll to bottom to ensure content is visible
      setTimeout(() => {
        const messagesEndElement = document.querySelector(".messages-end-ref");
        if (messagesEndElement) {
          messagesEndElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (e) {
      console.error(`Error fetching session ${tabIdToLoad}:`, e);
      setError(`Failed to load session ${tabIdToLoad}: ${e.message}`); // Global error
      // Clear relevant App state on failure
      if (chatHook && chatHook.clearChatStateAndSettings) {
        chatHook.clearChatStateAndSettings();
      }
      setAppCurrentThreadId(null);
      setCurrentSessionSettings(null);
    } finally {
      // Set a short timeout to ensure the loading state is visible long enough for UI updates
      setTimeout(() => {
        setIsLoading(false); // Stop global loading
      }, 200);
    }
  }, [setIsLoading, setError, handleLoadSessionDataToState, chatHook, setAppCurrentThreadId, setCurrentSessionSettings]);

  loadSessionRequestRef.current = appLevelLoadSession; // UseTabs will call proxy -> ref

  const handleClearChat = useCallback(() => {
    appLevelClearChatActions();
    resetTabsToDefault(); // This comes from useTabs
    // appCurrentThreadId will be set to null by appLevelClearChatActions indirectly via useTabs's onClearChatRequest
    console.log("Chat cleared, state reset, and tabs reverted to default via useTabs.");
  }, [appLevelClearChatActions, resetTabsToDefault]);

  const handleToggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), [setIsSidebarOpen]);

  const handleSubmitMessageShortcut = useCallback(() => { // Renamed to avoid conflict with hook's sendMessage
    const sendButton = document.getElementById('send-button');
    if (sendButton && !sendButton.disabled) {
        sendButton.click(); // This will trigger chatHook.sendMessage internally
    }
  }, []);

  useKeyboardShortcuts({
    onToggleSidebar: handleToggleSidebar,
    onClearChat: handleClearChat,
    onSubmitMessage: handleSubmitMessageShortcut, // Use the renamed shortcut handler
    isLoading: isLoading || chatHook.isSendingMessage, // Combine global loading with chat sending
  });

  const handleModelLoadStatusChange = (status, modelName = null) => {
    if (status === 'loading' || status === 'loaded') setError(null);
    setAppModelLoadStatus(status);
    if (status === 'loaded' && modelName) {
      setCurrentLoadedModelName(modelName);
      console.log(`App: Model '${modelName}' loaded successfully.`);
    } else if (status !== 'loaded') {
      setCurrentLoadedModelName(null);
    }
  };

  const handleHfUsernameUpdate = useCallback((username) => setHfUsername(username), []);
  const handleDeviceUpdate = useCallback((device) => setCurrentDevice(device), []);

  const handleChatModeChange = (mode) => {
    setAppChatMode(mode);
    localStorage.setItem('chatMode', mode);
  };

  const handleCurrentSessionSettingsChange = useCallback((updatedSettings) => {
    setCurrentSessionSettings(updatedSettings);
  }, []);
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/themes`)
      .then(res => res.json())
      .then(setThemeList)
      .catch(() => setThemeList([
        'AlienBlood', 'Brogrammer', 'HaX0R_BLUE', 'HaX0R_GR33N', 'HaX0R_R3D',
        'Kanagawa Dragon', 'Kanagawa Wave', 'Shaman',
        'catppuccin-frappe', 'catppuccin-macchiato', 'catppuccin-mocha',
      ]));

    fetch(`${API_BASE_URL}/api/v1/chat/sessions`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(sessions => {
        if (sessions && Array.isArray(sessions) && sessions.length > 0) {
          console.log(`App: Fetched ${sessions.length} saved sessions. These will not be opened as tabs by default.`);
        } else {
          console.warn('App: No saved sessions found or invalid format.');
        }
        resetTabsToDefault();
      })
      .catch(err => {
        console.error("Error fetching saved sessions:", err);
        setError("Could not load saved sessions."); // Global error
        resetTabsToDefault();
      });
  }, [resetTabsToDefault, setThemeList, setError]);

  useEffect(() => {
    if (isLoading || chatHook.chatHistory.length > 0) { // Use chatHistory from chatHook
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHook.chatHistory, isLoading]); // Dependency on hook's chatHistory and global isLoading

  // --- Send Message Handler (Now mostly in useChat) ---
  // const sendMessage = useCallback(async (...) => { ... MOVED TO useChat ... });


  return (
    <div className={`App ${themeName}`}>
      <ThemeLoader themeName={themeName} />

      <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          modelLoaded={appModelLoadStatus === 'loaded'}
          setLoadStatus={handleModelLoadStatusChange}
          setLoading={setIsLoading} // Global loading
          isLoading={isLoading}    // Global loading
          isModelLoaded={appModelLoadStatus === 'loaded'}
          currentModelPath={currentLoadedModelName || 'None'}
          onHfUsernameUpdate={handleHfUsernameUpdate}
          onDeviceUpdate={handleDeviceUpdate}
          currentDevice={currentDevice}
          themeName={themeName}
          setThemeName={setThemeName}
          themeList={themeList}
          onClearChat={handleClearChat} // Already uses appLevelClearChatActions -> clearChatHookState
          onLoadSession={(sessionData) => {
            // First create and activate the tab
            if (sessionData && sessionData.thread_id) {
                console.log(`App: Sidebar requested to load session ${sessionData.thread_id}`);
                
                // First create and activate the tab
                const tabLabel = sessionData.custom_title || sessionData.title || `Session ${sessionData.thread_id.substring(0,6)}...`;
                addSessionTabAndMakeActive(sessionData.thread_id, tabLabel, activeTabId);
                
                // Then process the session data with a delay to ensure tab is created
                setTimeout(() => {
                    console.log(`App: Loading session data for ${sessionData.thread_id} after tab creation`);
                    handleLoadSessionDataToState(sessionData);
                    
                    // Make multiple attempts to ensure history loads properly
                    setTimeout(() => {
                        console.log(`App: Reinforcement load for ${sessionData.thread_id}`);
                        // Re-sync chat history to ensure it's displayed
                        if (chatHook && chatHook.loadChatState) {
                            chatHook.loadChatState(sessionData);
                        }
                        // Ensure the tab is selected
                        handleTabSelect(sessionData.thread_id);
                    }, 200);
                }, 150);
            }
          }}
          loadedSessionSettings={currentSessionSettings}
          onTabRename={handleTabRename}
          activeTabId={activeTabId}
          newChatSettings={newChatSettings}
          onNewChatSettingsChange={setNewChatSettings}
          onSessionSettingsChange={handleCurrentSessionSettingsChange}
      />

      <div className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <AppHeader
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              currentLoadedModelName={currentLoadedModelName}
              appChatMode={appChatMode}
              onChatModeChange={handleChatModeChange}
              currentDevice={currentDevice}
              hfUsername={hfUsername}
              appModelLoadStatus={appModelLoadStatus}
          />

          <TabContainer
            tabs={openTabs}
            activeTabId={activeTabId}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
          />

          <ChatInterface
            chatHistory={chatHook.chatHistory}
            sendError={chatHook.sendError}
            isSendingMessage={chatHook.isSendingMessage}
            userInput={chatHook.userInput}
            setUserInput={chatHook.setUserInput}
            sendMessage={chatHook.sendMessage}
            appModelLoadStatus={appModelLoadStatus}
            globalIsLoading={isLoading}
            globalError={error}
            messagesEndRef={messagesEndRef}
            onEditMessage={handleEditMessage}
          />
      </div>
    </div>
  );
}

export default App;
