import { editMessage } from '../../api/editMessage';
import { API_BASE_URL } from '../../constants';

// Mock fetch API
global.fetch = jest.fn();

describe('editMessage API Utility', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'group').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  it('calls the correct API endpoint with proper parameters', async () => {
    // Mock a successful response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, thread_id: 'thread-123', message_index: 2 })
    });

    // Call the function
    const threadId = 'thread-123';
    const messageIndex = 2;
    const newContent = 'Updated message content';
    const result = await editMessage(threadId, messageIndex, newContent);

    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/chat/session/${threadId}/message/${messageIndex}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_content: newContent }),
      }
    );

    // Verify the result
    expect(result).toEqual({
      success: true,
      thread_id: 'thread-123',
      message_index: 2
    });
  });

  it('throws an error for invalid thread ID', async () => {
    await expect(editMessage('', 2, 'content'))
      .rejects
      .toThrow('Cannot edit message: No valid thread ID');

    await expect(editMessage('new', 2, 'content'))
      .rejects
      .toThrow('Cannot edit message: No valid thread ID');
  });

  it('throws an error for empty content', async () => {
    await expect(editMessage('thread-123', 2, ''))
      .rejects
      .toThrow('Message content cannot be empty');

    await expect(editMessage('thread-123', 2, '   '))
      .rejects
      .toThrow('Message content cannot be empty');
  });

  it('throws an error for invalid message index', async () => {
    await expect(editMessage('thread-123', -1, 'content'))
      .rejects
      .toThrow('Invalid message index');

    await expect(editMessage('thread-123', 'not-a-number', 'content'))
      .rejects
      .toThrow('Invalid message index');
  });

  it('passes additional options correctly', async () => {
    // Mock a successful response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    // Call with isUserMessage option
    await editMessage('thread-123', 2, 'content', { isUserMessage: true });

    // Check that fetch was called (we already tested the parameters above)
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('handles API error responses', async () => {
    // Mock an error response
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Thread not found' })
    });

    // Call the function
    await expect(editMessage('thread-123', 2, 'content'))
      .rejects
      .toThrow('Thread not found');
  });

  it('handles network errors', async () => {
    // Mock a network error
    fetch.mockRejectedValueOnce(new Error('Network error'));

    // Call the function
    await expect(editMessage('thread-123', 2, 'content'))
      .rejects
      .toThrow('Network error');
  });

  it('handles API errors without JSON response', async () => {
    // Mock an error response without JSON content
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('Invalid JSON'); }
    });

    // Call the function
    await expect(editMessage('thread-123', 2, 'content'))
      .rejects
      .toThrow('Failed to edit message: 500 Internal Server Error');
  });
});