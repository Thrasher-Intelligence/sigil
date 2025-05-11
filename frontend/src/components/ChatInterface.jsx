import React from 'react';

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
        {appModelLoadStatus === 'idle' && !chatHistory.length && (
          <div className="message system-message">
            <p>Please load a model using the 'Load Model' panel in the sidebar to begin.</p>
          </div>
        )}
        {appModelLoadStatus === 'error' && (
          <div className="message system-message error-message">
            <p>Failed to load model. Check console for details.</p>
          </div>
        )}
        {globalError && !globalIsLoading && (
          <div className="message system-message error-message">
            <p>Error: {globalError}</p>
          </div>
        )}
        {sendError && !isSendingMessage && (
          <div className="message system-message error-message">
            <p>Chat Error: {sendError}</p>
          </div>
        )}
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.sender}-message ${msg.id.startsWith('loading-') ? 'loading-message' : ''}`}
          >
            {msg.id.startsWith('loading-') ? (
              <div className="dots-container">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            ) : (
              <>
                <p>{msg.text}</p>
                {msg.tokens && (
                  <div className="token-counter">
                    {msg.tokens} tokens
                  </div>
                )}
              </>
            )}
          </div>
        ))}
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