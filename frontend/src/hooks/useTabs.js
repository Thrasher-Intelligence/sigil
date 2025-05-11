import { useState, useCallback } from 'react';

export const useTabs = ({
  onClearChatRequest, // Callback to App.jsx to handle chat clearing logic
  onLoadSessionRequest, // Callback to App.jsx to handle loading session data
  NEW_CHAT_TAB_ID,      // Constant for the new chat tab ID
}) => {
  const [openTabs, setOpenTabs] = useState([{ id: NEW_CHAT_TAB_ID, label: 'New Chat', canClose: false }]);
  const [activeTabId, setActiveTabId] = useState(NEW_CHAT_TAB_ID);

  // Function for App.jsx to call after fetching saved sessions
  const loadInitialSessionTabs = useCallback((sessionTabsData) => {
    const newChatTabObject = { id: NEW_CHAT_TAB_ID, label: 'New Chat', canClose: false };
    const uniqueSessionTabs = [];
    const seenIds = new Set();

    if (Array.isArray(sessionTabsData)) {
      for (const tab of sessionTabsData) {
        if (tab.id && tab.id !== NEW_CHAT_TAB_ID && !seenIds.has(tab.id)) {
          uniqueSessionTabs.push({ ...tab, canClose: true }); // Ensure canClose is true
          seenIds.add(tab.id);
        }
      }
    }
    setOpenTabs([newChatTabObject, ...uniqueSessionTabs]);
    // setActiveTabId(NEW_CHAT_TAB_ID); // Keep New Chat active by default on initial load
  }, [setOpenTabs, setActiveTabId, NEW_CHAT_TAB_ID]);

  // Handler for selecting a tab
  const handleTabSelect = useCallback(async (tabId) => {
    if (tabId === activeTabId) return;
    
    console.log(`useTabs: Switching to tab ${tabId}`);
    
    // First update the activeTabId to ensure the UI reflects the tab change immediately
    setActiveTabId(tabId);

    try {
      // Then load the appropriate content based on the tab type
      if (tabId === NEW_CHAT_TAB_ID) {
        console.log('useTabs: Switching to New Chat tab, clearing chat state');
        if (onClearChatRequest) {
          onClearChatRequest();
        }
      } else {
        console.log(`useTabs: Switching to session tab ${tabId}, loading session data`);
        if (onLoadSessionRequest) {
          // Immediately start loading the session data
          onLoadSessionRequest(tabId);
          
          // Schedule a second load attempt with a delay as a backup to ensure successful loading
          setTimeout(async () => {
            console.log(`useTabs: Secondary load attempt for tab ${tabId}`);
            await onLoadSessionRequest(tabId);
            
            // After loading session data, ensure we scroll to the bottom
            setTimeout(() => {
              const messagesEndElement = document.querySelector(".messages-end-ref");
              if (messagesEndElement) {
                messagesEndElement.scrollIntoView({ behavior: "smooth" });
              }
            }, 150);
          }, 300);
        }
      }
    } catch (err) {
      console.error("Error during tab selection:", err);
    }
  }, [activeTabId, NEW_CHAT_TAB_ID, onClearChatRequest, onLoadSessionRequest, setActiveTabId]);

  // Handler for closing a tab
  const handleTabClose = useCallback(async (tabIdToClose) => {
    if (tabIdToClose === NEW_CHAT_TAB_ID) return; // Cannot close the "New Chat" tab

    const closingTabIndex = openTabs.findIndex(tab => tab.id === tabIdToClose);
    if (closingTabIndex === -1) {
      return; // Tab not found
    }

    let nextActiveTabIdToSet = activeTabId;
    let performClearChat = false;
    let sessionToLoad = null;

    // Determine the next active tab *before* filtering openTabs
    if (activeTabId === tabIdToClose) {
      // If the closed tab was active, decide which tab to activate next.
      // Prefer the tab to the left, otherwise fall back to "New Chat".
      // Assumes NEW_CHAT_TAB_ID is typically at index 0.
      if (closingTabIndex > 0 && openTabs[closingTabIndex - 1].id !== NEW_CHAT_TAB_ID) {
        nextActiveTabIdToSet = openTabs[closingTabIndex - 1].id;
        sessionToLoad = nextActiveTabIdToSet;
      } else {
        nextActiveTabIdToSet = NEW_CHAT_TAB_ID;
        performClearChat = true;
      }
    }

    const updatedTabs = openTabs.filter(tab => tab.id !== tabIdToClose);
    setOpenTabs(updatedTabs);

    // If the active tab needs to change as a result of the close
    if (nextActiveTabIdToSet !== activeTabId) {
      setActiveTabId(nextActiveTabIdToSet);
      if (performClearChat) {
        if (onClearChatRequest) onClearChatRequest();
      } else if (sessionToLoad) {
        if (onLoadSessionRequest) await onLoadSessionRequest(sessionToLoad);
      }
    } else if (activeTabId === tabIdToClose) {
      // This case handles if the active tab was closed, and it was the *only* session tab,
      // forcing a switch to "New Chat" if it wasn't already selected by the logic above.
      // This ensures that if all session tabs are closed, "New Chat" becomes active.
      if (updatedTabs.length === 1 && updatedTabs[0].id === NEW_CHAT_TAB_ID && activeTabId !== NEW_CHAT_TAB_ID) {
         setActiveTabId(NEW_CHAT_TAB_ID);
         if (onClearChatRequest) onClearChatRequest();
      }
    }
  }, [openTabs, activeTabId, NEW_CHAT_TAB_ID, onClearChatRequest, onLoadSessionRequest, setActiveTabId, setOpenTabs]);

  // Handler for renaming a tab
  const handleTabRename = useCallback((threadId, newName) => {
    if (threadId === NEW_CHAT_TAB_ID) return; // Cannot rename the "New Chat" tab
    setOpenTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === threadId ? { ...tab, label: newName } : tab
      )
    );
  }, [setOpenTabs, NEW_CHAT_TAB_ID]);

  // Function to add a new session tab and make it active (called by App.jsx's sendMessage)
  const addSessionTabAndMakeActive = useCallback((newThreadId, newLabel, currentActiveTabForSendLogic) => {
    setOpenTabs(prevTabs => {
      // Check if the tab (newThreadId) already exists in the list
      const tabAlreadyExists = prevTabs.some(tab => tab.id === newThreadId);

      if (tabAlreadyExists) {
        // If tab exists, just update its label. Ensure NEW_CHAT_TAB_ID cannot be targeted this way by mistake.
        return prevTabs.map(tab =>
          (tab.id === newThreadId && newThreadId !== NEW_CHAT_TAB_ID) 
            ? { ...tab, label: newLabel, canClose: true } // Ensure canClose is true
            : tab
        );
      } else {
        // Tab does not exist, add it. Prevent adding NEW_CHAT_TAB_ID as a new session.
        if (newThreadId === NEW_CHAT_TAB_ID) {
            console.error("Attempted to add NEW_CHAT_TAB_ID as a new session tab.");
            // Return previous tabs, ensuring NEW_CHAT_TAB_ID is present if it was somehow missing
            if (!prevTabs.some(t => t.id === NEW_CHAT_TAB_ID)) {
                return [{ id: NEW_CHAT_TAB_ID, label: 'New Chat', canClose: false }, ...prevTabs];
            }
            return prevTabs;
        }

        let updatedTabs;
        const newSessionTabObject = { id: newThreadId, label: newLabel, canClose: true };

        if (currentActiveTabForSendLogic === NEW_CHAT_TAB_ID) {
          const newChatTab = { id: NEW_CHAT_TAB_ID, label: 'New Chat', canClose: false };
          // Filter out NEW_CHAT_TAB_ID to avoid duplicating it, and also the newThreadId (belt-and-suspenders)
          const existingSessionTabs = prevTabs.filter(tab => tab.id !== NEW_CHAT_TAB_ID && tab.id !== newThreadId);
          updatedTabs = [
            newChatTab,
            ...existingSessionTabs,
            newSessionTabObject
          ];
        } else {
          // If not originating from New Chat, add to the end, ensuring NEW_CHAT_TAB is preserved.
          const newChatTab = { id: NEW_CHAT_TAB_ID, label: 'New Chat', canClose: false };
          const otherTabs = prevTabs.filter(tab => tab.id !== NEW_CHAT_TAB_ID && tab.id !== newThreadId);
          updatedTabs = [newChatTab, ...otherTabs, newSessionTabObject];
        }
        return updatedTabs;
      }
    });
    
    // Always set the new thread as active when creating a new tab
    // This ensures the user is automatically switched to their new chat tab
    // Always make the new thread tab active when creating from New Chat
    if (newThreadId !== NEW_CHAT_TAB_ID) {
        console.log(`useTabs: Activating new session tab ${newThreadId}`);
        
        // First update the tab state
        setActiveTabId(newThreadId);
        
        // We need to ensure the data is loaded properly for this tab
        if (onLoadSessionRequest) {
          // Immediately try to load the session data
          onLoadSessionRequest(newThreadId);
          
          // Make additional load attempts with increasing delays to ensure success
          // This mirrors the successful behavior of sidebar loading
          setTimeout(async () => {
            console.log(`useTabs: Second load attempt for new tab ${newThreadId}`);
            await onLoadSessionRequest(newThreadId);
          }, 150);
          
          setTimeout(async () => {
            console.log(`useTabs: Final load attempt for new tab ${newThreadId}`);
            await onLoadSessionRequest(newThreadId);
            
            // After final loading attempt, ensure we scroll to the bottom
            setTimeout(() => {
              const messagesEndElement = document.querySelector(".messages-end-ref");
              if (messagesEndElement) {
                messagesEndElement.scrollIntoView({ behavior: "smooth" });
              }
            }, 100);
          }, 350);
        }
    }
  }, [setOpenTabs, setActiveTabId, NEW_CHAT_TAB_ID]);

  // Function to reset tabs to initial "New Chat" state (called by App.jsx's handleClearChat)
  const resetTabsToDefault = useCallback(() => {
    setOpenTabs([{ id: NEW_CHAT_TAB_ID, label: 'New Chat', canClose: false }]);
    setActiveTabId(NEW_CHAT_TAB_ID);
  }, [setOpenTabs, setActiveTabId, NEW_CHAT_TAB_ID]);

  return {
    openTabs,
    activeTabId,
    handleTabSelect,
    handleTabClose,
    handleTabRename,
    loadInitialSessionTabs,
    addSessionTabAndMakeActive,
    resetTabsToDefault,
  };
}; 