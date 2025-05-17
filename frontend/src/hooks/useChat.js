import { useState, useCallback, useRef, useEffect } from 'react';
import { formatChatHistoryForBackend } from '../utils/chatUtils.js';
import { API_BASE_URL } from '../constants.js';

// For tracking settings during tab transitions
const SETTINGS_FIELDS = ['systemPrompt', 'temperature', 'topP', 'maxTokens', 'repetitionPenalty'];

// Default settings can be managed by App.jsx or passed in if needed by the hook directly.
// For now, assume App.jsx manages defaults and provides necessary settings.

export const useChat = ({
  // Props from App.jsx that the chat hook will need
  initialChatHistory = [],
  initialCurrentThreadId = null,
  appChatMode, // 'instruction' or 'chat'
  newChatSettings, // { systemPrompt, temperature, topP, maxTokens }
  currentSessionSettings, // { systemPrompt, temperature, topP, maxTokens }
  activeTabId, // To determine if we are in a 'NEW_CHAT_TAB_ID' context
  NEW_CHAT_TAB_ID, // Constant for new chat tab
  appModelLoadStatus, // 'idle', 'loading', 'loaded', 'error'
  // Callbacks to update App.jsx state or trigger App.jsx actions
  onSetAppIsLoading,
  onSetAppError,
  onSetAppCurrentThreadId, // If App.jsx still needs to know this directly for other purposes
  onAddSessionTabAndMakeActive, // Callback from useTabs, passed through App.jsx
  onUpdateCurrentSessionSettings, // Added callback to update settings in App.jsx
}) => {
  const [chatHistory, setChatHistory] = useState(initialChatHistory);
  const [currentThreadId, setCurrentThreadId] = useState(initialCurrentThreadId);
  const [userInput, setUserInput] = useState(''); // Input state can live here
  const loadingMessageIdRef = useRef(null); // Ref to store loading message ID
  const preservedHistoryRef = useRef(null); // Ref to store chat history during tab transitions
  const preservedSettingsRef = useRef(null); // Ref to store settings during tab transitions
  const directFetchInProgressRef = useRef(false); // Prevent duplicate fetches

  // This internal isLoading is specific to the send message operation
  const [isSendingMessage, setIsSendingMessage] = useState(false); 
  // This internal error is specific to the send message operation
  const [sendError, setSendError] = useState(null); 

  // Helper function to format chat history from session data
  // Use this directly to avoid circular references
  const formatChatHistoryFromSession = (sessionData) => {
    if (!sessionData || !sessionData.thread_id || !sessionData.messages) {
      return [];
    }
    
    return sessionData.messages.map((msg, index) => ({
      role: msg.role || 'unknown',
      content: msg.content || '',
      text: msg.content || '',
      id: `${msg.role || 'msg'}-${sessionData.thread_id}-${index}-${Date.now()}`,
      sender: msg.role === 'assistant' ? 'backend' : (msg.role || 'unknown'),
      tokens: msg.token_count || msg.tokens || null
    }));
  };

  // Helper function to extract settings from session data
  const extractSettingsFromSession = (sessionData) => {
    if (!sessionData) return null;
    
    return {
      systemPrompt: sessionData.system_prompt || newChatSettings.systemPrompt,
      temperature: sessionData.sampling_settings?.temperature || newChatSettings.temperature,
      topP: sessionData.sampling_settings?.top_p || newChatSettings.topP,
      maxTokens: sessionData.sampling_settings?.max_new_tokens || newChatSettings.maxTokens
    };
  };

  // Direct fetch of a session from the backend - used as a reliable fallback
  const fetchSessionDirectly = useCallback(async (sessionId) => {
    if (directFetchInProgressRef.current || !sessionId || sessionId === NEW_CHAT_TAB_ID) {
      return null;
    }
    
    directFetchInProgressRef.current = true;
    try {
      console.log(`useChat: Directly fetching session ${sessionId} from backend`);
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/session/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session ${sessionId}: ${response.status}`);
      }
      
      const sessionData = await response.json();
      console.log(`useChat: Successfully fetched session ${sessionId}`, sessionData);
      return sessionData;
    } catch (error) {
      console.error(`Error directly fetching session ${sessionId}:`, error);
      return null;
    } finally {
      directFetchInProgressRef.current = false;
    }
  }, [NEW_CHAT_TAB_ID]);

  // Track the active tab ID changes to properly handle history and settings synchronization
  useEffect(() => {
    console.log(`useChat: Active tab changed to ${activeTabId}`);
    
    // When active tab changes and we have preserved history, apply it
    if (preservedHistoryRef.current && 
        preservedHistoryRef.current.threadId && 
        preservedHistoryRef.current.threadId === activeTabId) {
      console.log(`useChat: Applying preserved history for ${activeTabId}`);
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // First apply settings if we have them
        if (preservedSettingsRef.current && 
            preservedSettingsRef.current.threadId === activeTabId) {
          console.log(`useChat: Applying preserved settings for ${activeTabId}`);
          onUpdateCurrentSessionSettings?.(preservedSettingsRef.current.settings);
          
          // Wait for settings to apply before setting history
          setTimeout(() => {
            setChatHistory(preservedHistoryRef.current.history);
            console.log(`useChat: Applied preserved history for ${activeTabId}`);
            
            // Clear the preserved history since we've used it
            preservedHistoryRef.current = null;
            preservedSettingsRef.current = null;
            
            // Ensure we scroll to the bottom
            setTimeout(() => {
              const messagesEndElement = document.querySelector(".messages-end-ref");
              if (messagesEndElement) {
                messagesEndElement.scrollIntoView({ behavior: "smooth" });
              }
            }, 50);
          }, 50);
        } else {
          // No settings to apply, just set history
          setChatHistory(preservedHistoryRef.current.history);
          preservedHistoryRef.current = null;
          
          setTimeout(() => {
            const messagesEndElement = document.querySelector(".messages-end-ref");
            if (messagesEndElement) {
              messagesEndElement.scrollIntoView({ behavior: "smooth" });
            }
          }, 50);
        }
      }, 100);
    } else if (preservedSettingsRef.current && 
              preservedSettingsRef.current.threadId === activeTabId) {
      // We have settings but no history (rare case)
      console.log(`useChat: Applying only preserved settings for ${activeTabId}`);
      setTimeout(() => {
        onUpdateCurrentSessionSettings?.(preservedSettingsRef.current.settings);
        preservedSettingsRef.current = null;
      }, 100);
    } else if (activeTabId && activeTabId !== NEW_CHAT_TAB_ID) {
      // We don't have preserved history or settings, but we have a non-new-chat tab ID
      // Try to fetch directly from backend as a fallback - this mirrors the sidebar behavior
      setTimeout(async () => {
        console.log(`useChat: No preserved data, fetching ${activeTabId} from backend`);
        const sessionData = await fetchSessionDirectly(activeTabId);
        
        if (sessionData) {
          // Apply session data directly
          const formattedHistory = formatChatHistoryFromSession(sessionData);
          setChatHistory(formattedHistory);
          setCurrentThreadId(sessionData.thread_id);
          
          // Extract and apply settings
          const settings = extractSettingsFromSession(sessionData);
          if (settings && onUpdateCurrentSessionSettings) {
            onUpdateCurrentSessionSettings(settings);
          }
          
          // Ensure we scroll to the bottom after loading
          setTimeout(() => {
            const messagesEndElement = document.querySelector(".messages-end-ref");
            if (messagesEndElement) {
              messagesEndElement.scrollIntoView({ behavior: "smooth" });
            }
          }, 100);
        }
      }, 150);
    }
  }, [activeTabId, onUpdateCurrentSessionSettings, NEW_CHAT_TAB_ID, fetchSessionDirectly, newChatSettings]);

  const clearChatStateAndSettings = useCallback(() => {
    setChatHistory([]);
    setSendError(null);
    setCurrentThreadId(null);
    preservedHistoryRef.current = null;
    preservedSettingsRef.current = null;
    // Note: Resetting newChatSettings or currentSessionSettings is handled
    // by App.jsx in response to a tab change or a clear action.
    // This function primarily clears the chat-specific state within this hook.
    console.log("useChat: Cleared internal chat state.");
  }, [setChatHistory, setCurrentThreadId, setSendError]);

  const loadChatState = useCallback((sessionData, settings) => {
    if (!sessionData || !sessionData.thread_id || !sessionData.messages) {
      console.error("useChat: Attempted to load invalid session data:", sessionData);
      // onSetAppError might be more appropriate if this is a critical load failure
      setSendError("Invalid session data received by useChat."); 
      return;
    }
    console.log(`useChat: Loading session ${sessionData.thread_id} into hook state`);

    // Format the chat history from session data
    const formattedHistory = formatChatHistoryFromSession(sessionData);
    
    // Update state with the formatted history
    setChatHistory(formattedHistory);
    setCurrentThreadId(sessionData.thread_id);
    
    // Store both history and settings in refs to handle tab switching
    preservedHistoryRef.current = {
      threadId: sessionData.thread_id,
      history: formattedHistory
    };
    
    // Extract settings from sessionData if available
    if (sessionData.sampling_settings || sessionData.system_prompt) {
      const extractedSettings = extractSettingsFromSession(sessionData);
      
      // Store settings for tab transitions
      preservedSettingsRef.current = {
        threadId: sessionData.thread_id,
        settings: extractedSettings
      };
      
      // Update App-level settings if callback is provided
      if (onUpdateCurrentSessionSettings) {
        onUpdateCurrentSessionSettings(extractedSettings);
      }
    }
    
    setSendError(null);
    
    // After loading, force a scroll to the bottom to ensure visibility
    setTimeout(() => {
      const messagesEndElement = document.querySelector(".messages-end-ref");
      if (messagesEndElement) {
        messagesEndElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  }, [setChatHistory, setCurrentThreadId, setSendError, onUpdateCurrentSessionSettings, newChatSettings]);

  const sendMessage = useCallback(async (currentChatHistoryFromArg) => {
    if (!userInput.trim()) return;
    if (appModelLoadStatus !== 'loaded') {
      setSendError("Model is not loaded. Cannot send message.");
      // onSetAppError?.("Model is not loaded. Cannot send message.");
      return;
    }

    setIsSendingMessage(true);
    onSetAppIsLoading?.(true); // Inform App about global loading state
    setSendError(null);
    // onSetAppError?.(null);

    const newUserMessageId = `user-${Date.now()}`;
    // Calculate approximate token count for user message (1 token ≈ 4 chars for English text)
    const estimatedTokenCount = Math.max(1, Math.ceil(userInput.length / 4));
    const newUserMessage = { 
      sender: 'user', 
      text: userInput, 
      id: newUserMessageId,
      tokens: estimatedTokenCount
    };

    const updatedChatHistory = [...currentChatHistoryFromArg, newUserMessage];
    setChatHistory(updatedChatHistory);
    const currentUserInput = userInput; // Capture before clearing
    setUserInput(''); // Clear input field

    const loadingId = `loading-${Date.now()}`;
    loadingMessageIdRef.current = loadingId;
    setChatHistory(prev => [...prev, { sender: 'backend', text: '', id: loadingId }]);

    try {
      const payload = {
        mode: appChatMode,
        thread_id: currentThreadId, // Use hook's currentThreadId
      };

      let settingsToSend;
      let systemPromptToSend;

      if (activeTabId === NEW_CHAT_TAB_ID || currentThreadId === null) {
        // Capture these settings to preserve them for the new tab that will be created
        // They will be stored temporarily when the response comes back
        settingsToSend = {
          temperature: newChatSettings.temperature,
          top_p: newChatSettings.topP,
          max_new_tokens: newChatSettings.maxTokens,
          repetition_penalty: newChatSettings.repetitionPenalty,
        };
        systemPromptToSend = newChatSettings.systemPrompt;
      } else {
        // If currentSessionSettings are not available (e.g., just after a new chat message created a session but before App re-renders with them)
        // fall back to newChatSettings as a sensible default.
        const cur = currentSessionSettings || newChatSettings; 
        settingsToSend = {
          temperature: cur.temperature,
          top_p: cur.topP,
          max_new_tokens: cur.maxTokens,
          repetition_penalty: cur.repetitionPenalty,
        };
        systemPromptToSend = cur.systemPrompt;
      }
      payload.sampling_settings = settingsToSend;
      payload.system_prompt = systemPromptToSend;

      if (appChatMode === 'instruction') {
        payload.message = currentUserInput;
      } else {
        payload.messages = formatChatHistoryForBackend(updatedChatHistory);
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/chat/chat-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) { /* Ignore JSON parsing error */ }
        throw new Error(errorDetail);
      }

      const data = await response.json();
      // Extract essential data from response
      const backendResponse = data.response;
      const newThreadId = data.thread_id; // This is the thread_id returned by the backend
      
      // Try to find token count in any of the common fields
      const tokenCount = data.token_count || data.tokens || 
                         (data.usage && data.usage.total_tokens) || 
                         null;

      const backendMessageId = `backend-${Date.now()}`;
      const backendMessage = { 
        sender: 'backend', 
        text: backendResponse, 
        id: backendMessageId,
        tokens: tokenCount !== null ? Number(tokenCount) : Math.ceil(backendResponse.length / 4) // Use token count or estimate
      };

      const loadingIdToRemove = loadingMessageIdRef.current;
      // Update chat history without the loading message and with the new backend response
      const updatedHistoryWithResponse = [...updatedChatHistory.filter(msg => msg.id !== loadingIdToRemove), backendMessage];
      setChatHistory(updatedHistoryWithResponse);
      loadingMessageIdRef.current = null;

      // Save the updated history to the preservedHistoryRef for use during tab transitions
      preservedHistoryRef.current = {
        threadId: newThreadId,
        history: updatedHistoryWithResponse
      };
      
      // Save current settings for tab transitions
      const settingsToPreserve = activeTabId === NEW_CHAT_TAB_ID
        ? newChatSettings
        : currentSessionSettings || newChatSettings;
        
      preservedSettingsRef.current = {
        threadId: newThreadId,
        settings: settingsToPreserve
      };

      if (newThreadId && newThreadId !== currentThreadId) {
        // Update the thread ID in our local hook state
        setCurrentThreadId(newThreadId);
        
        // Inform the parent App component
        onSetAppCurrentThreadId?.(newThreadId);

        // Create a new tab for this conversation
        const newLabel = currentUserInput.substring(0, 30) + (currentUserInput.length > 30 ? '...' : '');
        onAddSessionTabAndMakeActive?.(newThreadId, newLabel, activeTabId);
        
        // After creating the tab, explicitly fetch and load the full session data
        // This mirrors the successful behavior of loading from sidebar
        setTimeout(async () => {
          console.log(`useChat: Explicitly fetching full session data for new tab ${newThreadId}`);
          const sessionData = await fetchSessionDirectly(newThreadId);
          
          if (sessionData) {
            // Apply the session data
            console.log(`useChat: Applying fetched session data for ${newThreadId}`);
            loadChatState(sessionData);
          }
        }, 300);
      } else if (newThreadId && newThreadId === currentThreadId && activeTabId === NEW_CHAT_TAB_ID) {
        // Handle case where we need to "upgrade" the New Chat tab to a named session tab
        const newLabel = currentUserInput.substring(0, 30) + (currentUserInput.length > 30 ? '...' : '');
        onAddSessionTabAndMakeActive?.(newThreadId, newLabel, activeTabId);
        
        // Also fetch and load full session for consistency
        setTimeout(async () => {
          console.log(`useChat: Explicitly fetching full session data for upgraded tab ${newThreadId}`);
          const sessionData = await fetchSessionDirectly(newThreadId);
          
          if (sessionData) {
            console.log(`useChat: Applying fetched session data for upgraded tab ${newThreadId}`);
            loadChatState(sessionData);
          }
        }, 300);
      }
      
      // Clear the New Chat tab history after creating a new chat session
      // This prevents duplicate chat history appearing in both tabs
      if (activeTabId === NEW_CHAT_TAB_ID && newThreadId) {
        // After a delay to ensure tab switching has fully completed
        setTimeout(() => {
          // Only clear if we've already switched to the new tab (activeTabId might have changed)
          if (activeTabId !== newThreadId) {
            clearChatStateAndSettings();
            
            // Notify any listeners about the settings for the new tab
            if (onSetAppCurrentThreadId) {
              onSetAppCurrentThreadId(newThreadId);
            }
          }
        }, 250); // Longer delay to ensure tab switching completes
      }
    } catch (e) {
      console.error("useChat - Error sending message:", e);
      setSendError(e.message || "Failed to get response from backend.");
      
      const errLoadingId = loadingMessageIdRef.current;
      if (errLoadingId) {
        setChatHistory(prev => prev.filter(msg => msg.id !== errLoadingId));
      }
      loadingMessageIdRef.current = null;
      preservedHistoryRef.current = null; // Clear preserved history on error
      preservedSettingsRef.current = null; // Clear preserved settings on error
    } finally {
      setIsSendingMessage(false);
      onSetAppIsLoading?.(false); // Inform App about global loading state
      
      const finalLoadingId = loadingMessageIdRef.current; // Double check loading removal
      if (finalLoadingId) {
          setChatHistory(prev => prev.filter(msg => msg.id !== finalLoadingId));
          loadingMessageIdRef.current = null;
      }
    }
  }, [
    userInput, 
    appChatMode, 
    currentThreadId, 
    activeTabId, 
    NEW_CHAT_TAB_ID,
    appModelLoadStatus, 
    newChatSettings, 
    currentSessionSettings,
    onSetAppIsLoading,
    onSetAppCurrentThreadId,
    onAddSessionTabAndMakeActive,
    fetchSessionDirectly,
    loadChatState,
    clearChatStateAndSettings,
    setChatHistory,
    setCurrentThreadId,
    setUserInput,
    setIsSendingMessage,
    setSendError,
  ]);

  return {
    chatHistory,
    setChatHistory,
    currentThreadId,
    userInput,
    setUserInput,
    isSendingMessage,
    sendError,
    sendMessage,
    loadChatState,
    clearChatStateAndSettings,
  };
};