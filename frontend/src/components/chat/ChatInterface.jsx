import React, { useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';
import SystemMessage from './SystemMessage';

function ChatInterface({
  chatHistory,
  sendError,
  isSendingMessage,
  userInput,
  setUserInput,
  sendMessage,
  appModelLoadStatus,
  globalIsLoading,
  globalError,
  messagesEndRef,
}) {
  // Keep track of previous chat history for comparison
  const prevChatHistoryRef = useRef([]);
  
  // Force scroll to bottom when chat history changes
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0 && 
        (prevChatHistoryRef.current.length !== chatHistory.length ||
         JSON.stringify(chatHistory) !== JSON.stringify(prevChatHistoryRef.current))) {
      
      // Update our ref to the new chat history
      prevChatHistoryRef.current = [...chatHistory];
      
      // Scroll to bottom with a small delay to ensure DOM updates
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [chatHistory, messagesEndRef]);
  return (
    <div className="chat-area">
      <div className="messages-area">
        {/* Debug info for chat history - only visible when debugging */}
        {false && chatHistory && (
          <SystemMessage id="debug-chat-history">
            Chat history length: {chatHistory.length}
          </SystemMessage>
        )}
        
        {/* System messages for different states */}
        {appModelLoadStatus === 'idle' && !chatHistory.length && (
          <SystemMessage id="idle-message">
            Please load a model using the 'Load Model' panel in the sidebar to begin.
          </SystemMessage>
        )}
        
        {appModelLoadStatus === 'error' && (
          <SystemMessage type="error" id="model-error">
            Failed to load model. Check console for details.
          </SystemMessage>
        )}
        
        {globalError && !globalIsLoading && (
          <SystemMessage type="error" id="global-error">
            Error: {globalError}
          </SystemMessage>
        )}
        
        {sendError && !isSendingMessage && (
          <SystemMessage type="error" id="send-error">
            Chat Error: {sendError}
          </SystemMessage>
        )}

        {/* Chat messages - with explicit key including index to force rerenders */}
        {chatHistory.map((msg, index) => (
          <ChatBubble 
            key={`${msg.id}-${index}`} 
            message={msg} 
          />
        ))}
        
        {/* Ref for auto-scrolling */}
        <div ref={messagesEndRef} className="messages-end-ref" />
      </div>

      <div className="input-area">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={
            appModelLoadStatus === 'loaded'
              ? isSendingMessage
                ? 'Generating response...'
                : 'Type your message here...'
              : 'Load a model first'
          }
          rows="3"
          disabled={globalIsLoading || isSendingMessage || appModelLoadStatus !== 'loaded'}
        />
        <button
          id="send-button"
          onClick={() => sendMessage(chatHistory)}
          disabled={
            globalIsLoading ||
            isSendingMessage ||
            !userInput.trim() ||
            appModelLoadStatus !== 'loaded'
          }
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;