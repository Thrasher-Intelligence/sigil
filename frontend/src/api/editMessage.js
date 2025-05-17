import { API_BASE_URL } from '../constants.js';

/**
 * Edits a message in a chat session
 * 
 * @param {string} threadId - The ID of the thread/session to edit
 * @param {number} messageIndex - The index of the message to edit
 * @param {string} newContent - The new content for the message
 * @returns {Promise<Object>} - The response data with success status
 * @throws {Error} - If the API request fails
 */
export const editMessage = async (threadId, messageIndex, newContent) => {
  if (!threadId || threadId === 'new') {
    throw new Error('Cannot edit message: No valid thread ID');
  }

  // Make sure messageIndex is a non-negative integer
  const validIndex = parseInt(messageIndex, 10);
  if (isNaN(validIndex) || validIndex < 0) {
    throw new Error('Invalid message index');
  }

  try {
    console.log(`Editing message at index ${validIndex} in thread ${threadId}`);
    
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
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
};