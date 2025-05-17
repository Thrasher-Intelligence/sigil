import React from 'react';

function ChatHistory({
  chatHistory,
  messagesEndRef,
  modelLoadStatus,
  modelLoadError
}) {
  return (
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

      {chatHistory
        .filter(msg => msg.sender !== 'system' && msg.role !== 'system')
        .map((msg) => (
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
  );
}

export default ChatHistory; 