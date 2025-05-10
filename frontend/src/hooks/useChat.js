import { useState, useCallback, useRef } from 'react';
import { formatChatHistoryForBackend } from '../utils/chatUtils.js';
import { API_BASE_URL } from '../constants.js';

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
  // Potentially: onUpdateCurrentSessionSettings if chat operations can modify them
}) => {
  const [chatHistory, setChatHistory] = useState(initialChatHistory);
  const [currentThreadId, setCurrentThreadId] = useState(initialCurrentThreadId);
  const [userInput, setUserInput] = useState(''); // Input state can live here
  const loadingMessageIdRef = useRef(null); // Ref to store loading message ID

  // This internal isLoading is specific to the send message operation
  const [isSendingMessage, setIsSendingMessage] = useState(false); 
  // This internal error is specific to the send message operation
  const [sendError, setSendError] = useState(null); 


  const clearChatStateAndSettings = useCallback(() => {
    setChatHistory([]);
    setSendError(null);
    setCurrentThreadId(null);
    // Note: Resetting newChatSettings or currentSessionSettings is handled
    // by App.jsx in response to a tab change or a clear action.
    // This function primarily clears the chat-specific state within this hook.
    console.log("useChat: Cleared internal chat state.");
  }, [setChatHistory, setSendError, setCurrentThreadId]);

  const loadChatState = useCallback((sessionData, settings) => {
    if (!sessionData || !sessionData.thread_id || !sessionData.messages) {
      console.error("useChat: Attempted to load invalid session data:", sessionData);
      // onSetAppError might be more appropriate if this is a critical load failure
      setSendError("Invalid session data received by useChat."); 
      return;
    }
    console.log(`useChat: Loading session ${sessionData.thread_id} into hook state`);

    const formattedHistory = sessionData.messages.map((msg, index) => ({
      role: msg.role || 'unknown',
      content: msg.content || '',
      text: msg.content || '', // For display
      id: `${msg.role || 'msg'}-${sessionData.thread_id}-${index}-${Date.now()}`,
      sender: msg.role === 'assistant' ? 'backend' : (msg.role || 'unknown')
    }));
    setChatHistory(formattedHistory);
    setCurrentThreadId(sessionData.thread_id);
    // onSetAppCurrentThreadId?.(sessionData.thread_id); // Inform App if needed

    // Settings are passed in and managed by App.jsx, this hook doesn't set them directly
    // but uses them. If `settings` is passed, it means App.jsx has determined what the
    // current settings for this loaded chat should be.
    setSendError(null);
  }, [setChatHistory, setCurrentThreadId, /* onSetAppCurrentThreadId, */ setSendError]);

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
    const newUserMessage = { sender: 'user', text: userInput, id: newUserMessageId };

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
      const backendResponse = data.response;
      const newThreadId = data.thread_id; // This is the thread_id returned by the backend

      const backendMessageId = `backend-${Date.now()}`;
      const backendMessage = { sender: 'backend', text: backendResponse, id: backendMessageId };

      const loadingIdToRemove = loadingMessageIdRef.current;
      setChatHistory(prev => {
        const withoutLoading = prev.filter(msg => msg.id !== loadingIdToRemove);
        return [...withoutLoading, backendMessage];
      });
      loadingMessageIdRef.current = null;

      if (newThreadId && newThreadId !== currentThreadId) {
        setCurrentThreadId(newThreadId); // Update hook's threadId
        onSetAppCurrentThreadId?.(newThreadId); // Inform App

        // Callback to App/useTabs to handle tab creation/activation
        const newLabel = currentUserInput.substring(0, 30) + (currentUserInput.length > 30 ? '...' : '');
        onAddSessionTabAndMakeActive?.(newThreadId, newLabel, activeTabId);
      } else if (newThreadId && newThreadId === currentThreadId && activeTabId === NEW_CHAT_TAB_ID) {
        // This case handles when the message was part of technically "New Chat" but a thread_id already existed 
        // (e.g. from a previous message in the same "New Chat" instance before tab was switched)
        // or the backend re-confirms the same thread_id. We still want to "upgrade" the tab.
        // onSetAppCurrentThreadId?.(newThreadId); // Inform App (already current, but good practice)
        const newLabel = currentUserInput.substring(0, 30) + (currentUserInput.length > 30 ? '...' : '');
        onAddSessionTabAndMakeActive?.(newThreadId, newLabel, activeTabId);
      }
      
      // Clear the New Chat tab history after creating a new chat session
      // This prevents duplicate chat history appearing in both tabs
      if (activeTabId === NEW_CHAT_TAB_ID && newThreadId) {
        // Save current settings to use in the new tab
        const settingsForNewChat = currentSessionSettings || newChatSettings;
        
        // Wait a short time to ensure tab switching has completed
        setTimeout(() => {
          // Clear the New Chat tab
          clearChatStateAndSettings();
          
          // Notify any listeners that we want to keep these settings for the new tab only
          if (onSetAppCurrentThreadId) {
            // Use this callback as a channel to App for the settings preservation
            // The thread ID is already set above, so this is just using the callback mechanism
            onSetAppCurrentThreadId(newThreadId);
          }
        }, 100);
      }
      // If newThreadId is the same as currentThreadId and it's not a NEW_CHAT_TAB_ID, no tab action needed here.

    } catch (e) {
      console.error("useChat - Error sending message:", e);
      setSendError(e.message || "Failed to get response from backend.");
      // onSetAppError?.(e.message || "Failed to get response from backend.");
      
      const errLoadingId = loadingMessageIdRef.current;
      if (errLoadingId) {
        setChatHistory(prev => prev.filter(msg => msg.id !== errLoadingId));
      }
      loadingMessageIdRef.current = null;
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
    // onSetAppError,
    onSetAppCurrentThreadId,
    onAddSessionTabAndMakeActive,
    setChatHistory, // Added
    setCurrentThreadId, // Added
    setUserInput, // Added
    setIsSendingMessage, // Added
    setSendError, // Added
  ]);

  return {
    chatHistory,
    setChatHistory, // Expose setter if App.jsx needs to directly manipulate (e.g., during tab switch)
    currentThreadId,
    // setCurrentThreadId, // Expose setter if App.jsx needs to directly manipulate
    userInput,
    setUserInput,
    isSendingMessage,
    sendError,
    sendMessage,
    loadChatState,
    clearChatStateAndSettings,
  };
}; 