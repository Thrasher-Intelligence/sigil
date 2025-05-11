import React from 'react';
import PropTypes from 'prop-types';
import styles from './Chat.module.css';

const ChatBubble = ({ message }) => {
  const { id, sender, text, tokens } = message;
  const isLoading = id.startsWith('loading-');
  
  // Estimate tokens if not provided (~ 4 chars per token)
  const estimateTokens = (text) => {
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  };

  // Determine the bubble style based on sender
  let bubbleClass;
  if (isLoading) {
    bubbleClass = styles.loadingBubble;
  } else if (sender === 'user') {
    bubbleClass = styles.userBubble;
  } else if (sender === 'backend') {
    bubbleClass = styles.assistantBubble;
  } else if (sender === 'system') {
    bubbleClass = styles.systemMessage;
  } else {
    bubbleClass = styles.chatBubble; // Fallback
  }
  
  return (
    <div className={bubbleClass}>
      {isLoading ? (
        <div className={styles.dotsContainer}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      ) : (
        <>
          <p className={styles.bubbleContent}>{text}</p>
          {(sender === 'user' || sender === 'backend') && (
            <div className={styles.tokenCounter}>
              {tokens || estimateTokens(text)} tokens
            </div>
          )}
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