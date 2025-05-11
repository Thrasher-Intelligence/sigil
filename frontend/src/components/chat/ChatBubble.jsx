import React from 'react';
import PropTypes from 'prop-types';
import styles from './Chat.module.css';

// Debug log to check CSS module content
console.log("CSS Modules loaded:", styles);

const ChatBubble = ({ message }) => {
  const { id, sender, text, tokens } = message;
  const isLoading = id.startsWith('loading-');
  
  console.log("Rendering message with tokens:", tokens, message);
  
  // Use standard classes while testing
  const bubbleClass = `message ${sender}-message ${isLoading ? 'loading-message' : ''}`;
  
  return (
    <div className={bubbleClass}>
      {isLoading ? (
        <div className="dots-container">
          <span></span>
          <span></span>
          <span></span>
        </div>
      ) : (
        <>
          <p>{text}</p>
          <div className="token-counter" style={{
            fontSize: '0.7rem',
            color: 'var(--text-secondary, #ccc)',
            textAlign: 'right',
            marginTop: '0.5rem',
            opacity: 0.8,
            fontStyle: 'italic'
          }}>
            {tokens ? `${tokens} tokens` : 'No token data'}
          </div>
        </>
      )}
    </div>
  );
};

ChatBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    sender: PropTypes.string.isRequired,
    text: PropTypes.string,
    tokens: PropTypes.number
  }).isRequired
};

export default ChatBubble;