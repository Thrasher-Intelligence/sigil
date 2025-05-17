import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import styles from './Chat.module.css';

const ChatBubble = ({ message, onEditMessage }) => {
  const { id, sender, text, tokens, edited } = message;
  const isLoading = id.startsWith('loading-');
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [hasThinkingSection, setHasThinkingSection] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [thinkingText, setThinkingText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef(null);
  
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
    
    // Reset edit text when the message changes
    // For assistant messages with thinking sections, we need to preserve them in the edit
    setEditedText(text);
    setIsSaving(false);
  }, [text]);
  
  // Auto-resize the textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Set a small timeout to ensure DOM has updated
      setTimeout(() => {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        textareaRef.current.focus();
        // Place cursor at the end of text
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }, 10);
    }
  }, [isEditing, editedText]);
  

  
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
  
  const handleEditClick = (e) => {
    e.stopPropagation();
    // For assistant messages, we want to preserve the thinking section if present
    setEditedText(text); // Ensure we're starting with the current text
    setIsEditing(true);
    // Focus is handled in the useEffect that runs when isEditing changes
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(text); // Reset to original text
  };
  
  const handleSaveEdit = () => {
    if (onEditMessage && editedText !== text) {
      setIsSaving(true);
      
      // If this is an assistant message with a thinking section, we need to preserve it
      let finalContent = editedText;
      if (sender === 'backend' && hasThinkingSection) {
        // Preserve the original thinking section if present
        if (thinkingText && !editedText.includes('<think>')) {
          finalContent = `<think>${thinkingText}</think>\n\n${editedText}`;
        }
      }
      
      onEditMessage(id, finalContent)
        .then(() => {
          setIsEditing(false);
          setIsSaving(false);
        })
        .catch(() => {
          setIsSaving(false);
        });
    } else {
      setIsEditing(false);
    }
  };
  
  const handleKeyDown = (e) => {
    // Don't process shortcuts if we're in the middle of saving
    if (isSaving) {
      e.preventDefault();
      return;
    }
    
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    }
    // Cancel on Escape
    else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
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
              {isEditing ? (
                <div className={styles.editContainer}>
                  {sender === 'backend' && hasThinkingSection && (
                    <div className={styles.thinkingEditNote}>
                      Note: The thinking section will be preserved when you save.
                    </div>
                  )}
                  <textarea 
                    ref={textareaRef}
                    className={styles.editTextarea}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={sender === 'backend' && hasThinkingSection ? 
                      "Edit the visible content. The thinking section will be preserved." : 
                      "Edit message..."}
                  />
                  <div className={styles.editButtons}>
                    <button 
                      className={styles.editCancel} 
                      onClick={handleCancelEdit}
                      title="Cancel (Esc)"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button 
                      className={styles.editSave} 
                      onClick={handleSaveEdit}
                      title="Save (Ctrl+Enter)"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <ReactMarkdown>{displayText}</ReactMarkdown>
              )}
            </div>
          </div>
          
          <div className={styles.messageActions}>
            {(sender === 'user' || sender === 'backend') && (
              <div className={styles.tokenCounter}>
                {getDisplayTokens()} tokens
                {hasThinkingSection && (
                  <span className={styles.thinkingIndicator}>
                    {isThinkingExpanded ? "(thinking visible)" : "(thinking hidden)"}
                  </span>
                )}
                {edited && (
                  <span className={styles.editedIndicator}>(edited)</span>
                )}
              </div>
            )}
            
            {(sender === 'user' || sender === 'backend') && !isEditing && (
              <button 
                className={styles.editButton} 
                onClick={handleEditClick}
                title="Edit message"
                aria-label="Edit message"
              >
                <svg className={styles.editIcon} viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
            )}
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
    tokens: PropTypes.number,
    edited: PropTypes.bool
  }).isRequired,
  onEditMessage: PropTypes.func
};

ChatBubble.defaultProps = {
  onEditMessage: () => {}
};

export default ChatBubble;