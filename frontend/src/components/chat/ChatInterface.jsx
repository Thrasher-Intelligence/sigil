import React from 'react';
import ChatBubble from './ChatBubble';
import SystemMessage from './SystemMessage';
import styles from './Chat.module.css';

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
  return (
    <div className="chat-area">
      <div className="messages-area">
        {/* System messages for different states */}
        {appModelLoadStatus === 'idle' && !chatHistory.length && (
          <SystemMessage>
            Please load a model using the 'Load Model' panel in the sidebar to begin.
          </SystemMessage>
        )}
        {appModelLoadStatus === 'error' && (
          <SystemMessage type="error">
            Failed to load model. Check console for details.
          </SystemMessage>
        )}
        {globalError && !globalIsLoading && (
          <SystemMessage type="error">
            Error: {globalError}
          </SystemMessage>
        )}
        {sendError && !isSendingMessage && (
          <SystemMessage type="error">
            Chat Error: {sendError}
          </SystemMessage>
        )}

        {/* Chat history messages */}
        {chatHistory.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        
        {/* Reference for auto-scrolling */}
        <div ref={messagesEndRef} />
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