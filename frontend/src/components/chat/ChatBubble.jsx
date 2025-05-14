import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import styles from './Chat.module.css';

const ChatBubble = ({ message }) => {
  const { id, sender, text, tokens } = message;
  const isLoading = id.startsWith('loading-');
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [hasThinkingSection, setHasThinkingSection] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [thinkingText, setThinkingText] = useState('');
  
  // Process text to extract thinking section if present and apply Markdown formatting
  useEffect(() => {
    if (!text) {
      setDisplayText('');
      setThinkingText('');
      setHasThinkingSection(false);
      return;
    }

    const thinkRegex = /<think>([\s\S]*?)<\/think>/;
    const match = text.match(thinkRegex);
    
    if (match) {
      // Extract thinking content and regular text
      const thinking = match[1].trim();
      const cleanedText = text.replace(thinkRegex, '').trim();
      
      // If there's no content outside the thinking tags, show at least the first line
      const finalDisplayText = cleanedText || thinking.split('\n')[0] + '...';
      
      setDisplayText(finalDisplayText);
      setThinkingText(thinking);
      setHasThinkingSection(true);
    } else {
      setDisplayText(text);
      setHasThinkingSection(false);
    }
  }, [text]);
  

  
  // Estimate tokens if not provided (~ 4 chars per token)
  const estimateTokens = (text) => {
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  };
  
  // Calculate tokens for display text only (excluding thinking section)
  const getDisplayTokens = () => {
    if (tokens) return tokens;
    if (hasThinkingSection) {
      return estimateTokens(displayText);
    }
    return estimateTokens(text);
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
  
  // Add a special CSS class if this message has thinking content
  if (hasThinkingSection) {
    bubbleClass = `${bubbleClass} ${styles.hasThinking}`;
  }
  
  const toggleThinking = (e) => {
    e.stopPropagation();
    setIsThinkingExpanded(!isThinkingExpanded);
    
    // If expanding, scroll to make sure the thinking section is visible
    if (!isThinkingExpanded) {
      setTimeout(() => {
        // Try to scroll the element into view if available
        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  };
  
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
          <div className={styles.messageContent}>
            {hasThinkingSection && (
              <>
                <div 
                  className={`${styles.thinkingToggle} ${isThinkingExpanded ? styles.expanded : ''}`}
                  onClick={toggleThinking}
                  title={isThinkingExpanded ? "Hide thinking" : "Show thinking"}
                >
                  <span className={`${styles.toggleArrow} ${isThinkingExpanded ? styles.rotated : ''}`}>↓</span>
                  <span className={styles.toggleText}>thinking</span>
                </div>
                
                <div className={`${styles.thinkingSection} ${isThinkingExpanded ? styles.thinkingExpanded : styles.thinkingCollapsed}`}>
                  {thinkingText}
                </div>
              </>
            )}
            
            <div className={styles.bubbleContent}>
              <ReactMarkdown>{displayText}</ReactMarkdown>
            </div>
          </div>
          
          {(sender === 'user' || sender === 'backend') && (
            <div className={styles.tokenCounter}>
              {getDisplayTokens()} tokens
              {hasThinkingSection && (
                <span className={styles.thinkingIndicator}>
                  {isThinkingExpanded ? "(thinking visible)" : "(thinking hidden)"}
                </span>
              )}
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