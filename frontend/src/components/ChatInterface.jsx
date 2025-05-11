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
  // Helper to estimate tokens if none provided (~ 4 chars per token)
  const estimateTokens = (text) => {
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  };

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
                {!msg.id.startsWith('system-') && (
                  <div 
                    style={{
                      fontSize: '0.7rem',
                      color: '#aaa',
                      textAlign: 'right',
                      marginTop: '0.5rem',
                      opacity: 0.6,
                      fontStyle: 'italic',
                    }}
                  >
                    {/* Use provided token count or estimate tokens */}
                    {(msg.tokens || estimateTokens(msg.text))} tokens
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