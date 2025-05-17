// Utility functions for chat operations

/**
 * Formats the chat history array for the backend API.
 * Filters out system messages and maps to the expected { role, content } structure.
 * @param {Array<Object>} history - The chat history array.
 * @returns {Array<Object>} The formatted history for the backend.
 */
export const formatChatHistoryForBackend = (history) => {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return [];
  }
  
  // Filter out any loading messages, empty messages, or undefined entries
  const validHistory = history.filter(msg => 
    msg && 
    (msg.sender === 'user' || msg.sender === 'backend') &&
    (msg.content || msg.text) // Only include messages with content
  );
  
  if (validHistory.length === 0) {
    return [];
  }
  
  return validHistory.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    // Use the original 'content' field if available, otherwise fall back to 'text'
    // This handles both newly created messages and messages loaded from history
    content: msg.content !== undefined ? msg.content : msg.text 
  }));
}; 