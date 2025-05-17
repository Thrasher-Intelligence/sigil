import { API_BASE_URL } from '../constants.js';

/**
 * Edits a message in a chat session
 * 
 * @param {string} threadId - The ID of the thread/session to edit
 * @param {number} messageIndex - The index of the message to edit
 * @param {string} newContent - The new content for the message
 * @param {Object} options - Additional options
 * @param {boolean} options.isUserMessage - Whether this is a user message (affects logging)
 * @returns {Promise<Object>} - The response data with success status
 * @throws {Error} - If the API request fails
 */
export const editMessage = async (threadId, messageIndex, newContent, options = {}) => {
  if (!threadId || threadId === 'new') {
    console.error('Cannot edit message: Invalid thread ID');
    throw new Error('Cannot edit message: No valid thread ID');
  }

  if (!newContent || newContent.trim() === '') {
    console.error('Edit rejected: Empty content');
    throw new Error('Message content cannot be empty');
  }

  // Make sure messageIndex is a non-negative integer
  const validIndex = parseInt(messageIndex, 10);
  if (isNaN(validIndex) || validIndex < 0) {
    console.error(`Invalid message index provided: ${messageIndex}`);
    throw new Error('Invalid message index');
  }

  const messageType = options.isUserMessage ? 'user' : 'assistant';
  const contentPreview = newContent.substring(0, 30).replace(/\n/g, ' ') + 
                        (newContent.length > 30 ? '...' : '');
  
  console.group(`Editing ${messageType} message`);
  console.log(`Thread ID: ${threadId}`);
  console.log(`Message index: ${validIndex}`);
  console.log(`Content preview: "${contentPreview}"`);
  console.log(`Content length: ${newContent.length} characters`);
  console.groupEnd();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/session/${threadId}/message/${validIndex}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_content: newContent }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.detail || `Failed to edit message: ${response.status} ${response.statusText}`;
      console.error(`API error response: ${response.status} ${response.statusText}`);
      if (errorData) console.error('Error details:', errorData);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log(`✅ Successfully edited ${messageType} message at index ${validIndex}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error editing ${messageType} message at index ${validIndex}:`, error);
    throw error;
  }
};