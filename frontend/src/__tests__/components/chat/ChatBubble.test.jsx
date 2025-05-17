import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatBubble from '../../../components/chat/ChatBubble';
import '@testing-library/jest-dom';

describe('ChatBubble Component', () => {
  // Base test messages
  const userMessage = {
    id: 'user-msg-123',
    sender: 'user',
    text: 'Hello world',
    tokens: 2
  };

  const assistantMessage = {
    id: 'assistant-msg-123',
    sender: 'backend',
    text: 'Hello! How can I help you today?',
    tokens: 8
  };

  const assistantThinkingMessage = {
    id: 'assistant-thinking-123',
    sender: 'backend',
    text: '<think>Let me consider what to say here.\nThis is my reasoning process.</think>\n\nHello! How can I help you today?',
    tokens: 20
  };

  const systemMessage = {
    id: 'system-msg-123',
    sender: 'system',
    text: 'System announcement'
  };

  const loadingMessage = {
    id: 'loading-123',
    sender: 'backend',
    text: ''
  };

  // Mock edit function
  const mockEditMessage = jest.fn().mockResolvedValue(true);

  // Base tests for rendering different message types
  test('renders user message correctly', () => {
    render(<ChatBubble message={userMessage} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('2 tokens')).toBeInTheDocument();
  });

  test('renders assistant message correctly', () => {
    render(<ChatBubble message={assistantMessage} />);
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('8 tokens')).toBeInTheDocument();
  });

  test('renders loading message with animation', () => {
    render(<ChatBubble message={loadingMessage} />);
    const dotsContainer = screen.getByRole('presentation', { hidden: true }) || 
                          document.querySelector('.dotsContainer');
    expect(dotsContainer).toBeInTheDocument();
  });

  test('renders system message correctly', () => {
    render(<ChatBubble message={systemMessage} />);
    expect(screen.getByText('System announcement')).toBeInTheDocument();
  });

  // Tests for thinking section handling
  test('renders message with thinking section collapsed by default', () => {
    render(<ChatBubble message={assistantThinkingMessage} />);
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('thinking')).toBeInTheDocument();
    
    // The thinking content should be in the DOM but not visible
    const thinkingSection = document.querySelector('.thinkingCollapsed');
    expect(thinkingSection).toBeInTheDocument();
    expect(thinkingSection).not.toBeVisible();
  });

  test('expands thinking section when clicked', () => {
    render(<ChatBubble message={assistantThinkingMessage} />);
    
    // Click the thinking toggle
    const thinkingToggle = screen.getByText('thinking').closest('div');
    fireEvent.click(thinkingToggle);
    
    // The thinking content should now be visible
    const thinkingSection = document.querySelector('.thinkingExpanded');
    expect(thinkingSection).toBeInTheDocument();
    expect(thinkingSection).toBeVisible();
    expect(screen.getByText(/Let me consider what to say here/)).toBeVisible();
  });

  // Tests for message editing functionality
  test('shows edit button on hover for user message', async () => {
    render(<ChatBubble message={userMessage} onEditMessage={mockEditMessage} />);
    
    // Edit button should exist but be hidden initially
    const editButton = screen.getByTitle('Edit message');
    expect(editButton).toBeInTheDocument();
    
    // Simulate hover (implementation may vary based on your CSS)
    fireEvent.mouseOver(editButton.closest('.userBubble'));
    
    // Now check if the button is more visible (this depends on your CSS implementation)
    expect(getComputedStyle(editButton).opacity !== '0').toBeTruthy();
  });

  test('shows edit button on hover for assistant message', async () => {
    render(<ChatBubble message={assistantMessage} onEditMessage={mockEditMessage} />);
    
    // Edit button should exist but be hidden initially
    const editButton = screen.getByTitle('Edit message');
    expect(editButton).toBeInTheDocument();
    
    // Simulate hover
    fireEvent.mouseOver(editButton.closest('.assistantBubble'));
    
    // Now check if the button is more visible
    expect(getComputedStyle(editButton).opacity !== '0').toBeTruthy();
  });

  test('does not show edit button for system messages', () => {
    render(<ChatBubble message={systemMessage} onEditMessage={mockEditMessage} />);
    
    // There should be no edit button
    const editButton = screen.queryByTitle('Edit message');
    expect(editButton).not.toBeInTheDocument();
  });

  test('enters edit mode when edit button is clicked', () => {
    render(<ChatBubble message={userMessage} onEditMessage={mockEditMessage} />);
    
    // Click the edit button
    const editButton = screen.getByTitle('Edit message');
    fireEvent.click(editButton);
    
    // Check if edit textarea is shown
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe(userMessage.text);
    
    // Check if save and cancel buttons are shown
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('cancels editing when Cancel button is clicked', () => {
    render(<ChatBubble message={userMessage} onEditMessage={mockEditMessage} />);
    
    // Enter edit mode
    const editButton = screen.getByTitle('Edit message');
    fireEvent.click(editButton);
    
    // Change the textarea content
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Modified text' } });
    
    // Click Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Should exit edit mode and show original text
    expect(textarea).not.toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    
    // EditMessage should not have been called
    expect(mockEditMessage).not.toHaveBeenCalled();
  });

  test('saves edited content when Save button is clicked', async () => {
    render(<ChatBubble message={userMessage} onEditMessage={mockEditMessage} />);
    
    // Enter edit mode
    const editButton = screen.getByTitle('Edit message');
    fireEvent.click(editButton);
    
    // Change the textarea content
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Modified text' } });
    
    // Click Save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    // EditMessage should have been called with the correct arguments
    expect(mockEditMessage).toHaveBeenCalledWith(userMessage.id, 'Modified text');
    
    // Should show a saving state
    await waitFor(() => {
      expect(mockEditMessage).toHaveBeenCalled();
    });
  });

  test('preserves thinking section when editing assistant messages', async () => {
    render(<ChatBubble message={assistantThinkingMessage} onEditMessage={mockEditMessage} />);
    
    // Enter edit mode
    const editButton = screen.getByTitle('Edit message');
    fireEvent.click(editButton);
    
    // Should show note about preserving thinking section
    expect(screen.getByText(/thinking section will be preserved/i)).toBeInTheDocument();
    
    // Textarea should contain only the visible part, not the thinking section
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toBe('Hello! How can I help you today?');
    
    // Change the textarea content
    fireEvent.change(textarea, { target: { value: 'My updated response' } });
    
    // Click Save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    // Should preserve thinking section in the saved content
    const expectedContent = '<think>Let me consider what to say here.\nThis is my reasoning process.</think>\n\nMy updated response';
    expect(mockEditMessage).toHaveBeenCalledWith(assistantThinkingMessage.id, expectedContent);
  });

  test('keyboard shortcuts work in edit mode', () => {
    render(<ChatBubble message={userMessage} onEditMessage={mockEditMessage} />);
    
    // Enter edit mode
    const editButton = screen.getByTitle('Edit message');
    fireEvent.click(editButton);
    
    // Change the textarea content
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Modified with keyboard' } });
    
    // Press Ctrl+Enter to save
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    
    // EditMessage should have been called
    expect(mockEditMessage).toHaveBeenCalledWith(userMessage.id, 'Modified with keyboard');
    
    // Reset mock
    mockEditMessage.mockClear();
    
    // Enter edit mode again
    fireEvent.click(editButton);
    
    // Change the textarea content again
    fireEvent.change(textarea, { target: { value: 'Will be cancelled' } });
    
    // Press Escape to cancel
    fireEvent.keyDown(textarea, { key: 'Escape' });
    
    // Should exit edit mode without saving
    expect(textarea).not.toBeInTheDocument();
    expect(mockEditMessage).not.toHaveBeenCalled();
  });

  test('shows edited indicator for edited messages', () => {
    const editedMessage = {
      ...userMessage,
      edited: true
    };
    
    render(<ChatBubble message={editedMessage} />);
    
    // Should show edited indicator
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });
});