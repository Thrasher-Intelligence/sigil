import os
import json
import unittest
import tempfile
import datetime
from datetime import UTC
import shutil
from unittest.mock import patch

# Adjust the import path to access the history_manager module
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.core.history_manager import (
    edit_chat_message,
    save_chat_messages,
    delete_session,
    HISTORY_DIR,
    get_session_filepath
)


class TestHistoryManager(unittest.TestCase):
    """Tests for the history manager module functions"""

    def setUp(self):
        """Create a temporary directory for test chat files"""
        # Create a temporary directory for testing
        self.temp_dir = tempfile.mkdtemp()
        # Store the original HISTORY_DIR to restore it later
        self.original_history_dir = HISTORY_DIR
        # Patch the HISTORY_DIR to use our temporary directory
        self._patcher = patch('backend.api.core.history_manager.HISTORY_DIR', self.temp_dir)
        self._patcher.start()
        
        # Test thread ID for the tests
        self.test_thread_id = "test_thread_123"
        
        # Create a test session with messages
        self.test_messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello there!"},
            {"role": "assistant", "content": "Hi! How can I help you today?"}
        ]
        
        # Save the test messages to create our test session file
        save_chat_messages(
            thread_id=self.test_thread_id,
            messages=self.test_messages,
            sampling_settings={"temperature": 0.7},
            system_prompt="You are a helpful assistant."
        )
        
        # Get the session filepath for verification
        self.session_path = get_session_filepath(self.test_thread_id)

    def tearDown(self):
        """Clean up temporary files after tests"""
        # Stop the patcher
        self._patcher.stop()
        # Remove the temporary directory and its contents
        shutil.rmtree(self.temp_dir)

    def test_edit_user_message(self):
        """Test editing a user message in a chat session"""
        # Index of the message to edit
        message_index = 1  # This would be the "Hello there!" user message
        
        # New content for the message
        new_content = "Updated user message content!"
        
        # Get the original last_updated timestamp before editing
        with open(self.session_path, 'r') as f:
            original_data = json.load(f)
            original_timestamp = original_data.get("metadata", {}).get("last_updated")
        
        # Ensure we wait at least 1 microsecond to get a different timestamp
        # This isn't necessary in practice but makes the test more robust
        import time
        time.sleep(0.001)
        
        # Edit the message
        result = edit_chat_message(self.test_thread_id, message_index, new_content)
        
        # Assert the edit was successful
        self.assertTrue(result)
        
        # Read the file again to verify changes
        with open(self.session_path, 'r') as f:
            updated_data = json.load(f)
        
        # Check that the content was updated
        self.assertEqual(updated_data["messages"][message_index]["content"], new_content)
        
        # Check that the edited flag was added
        self.assertTrue(updated_data["messages"][message_index]["edited"])
        
        # Check that the last_updated timestamp was changed
        self.assertNotEqual(
            updated_data.get("metadata", {}).get("last_updated"),
            original_timestamp
        )
        
        # Verify that other fields were preserved
        self.assertEqual(updated_data["messages"][message_index]["role"], "user")
    
    def test_edit_assistant_message(self):
        """Test editing an assistant message in a chat session"""
        # Index of the message to edit
        message_index = 2  # This would be the assistant response message
        
        # New content for the message
        new_content = "I've been edited to provide a better response!"
        
        # Get the original message content
        with open(self.session_path, 'r') as f:
            original_data = json.load(f)
            original_content = original_data["messages"][message_index]["content"]
            
        # Ensure the content is different
        self.assertNotEqual(original_content, new_content)
        
        # Edit the message
        result = edit_chat_message(self.test_thread_id, message_index, new_content)
        
        # Assert the edit was successful
        self.assertTrue(result)
        
        # Read the file again to verify changes
        with open(self.session_path, 'r') as f:
            updated_data = json.load(f)
        
        # Check that the content was updated
        self.assertEqual(updated_data["messages"][message_index]["content"], new_content)
        
        # Check that the edited flag was added
        self.assertTrue(updated_data["messages"][message_index]["edited"])
        
        # Verify that other fields were preserved
        self.assertEqual(updated_data["messages"][message_index]["role"], "assistant")
        
    def test_edit_assistant_message_with_thinking(self):
        """Test editing an assistant message that contains thinking tags"""
        # Create a special message with thinking tags
        thinking_message = [{"role": "assistant", "content": "<think>This is my thinking process.</think>\n\nHere's my final answer."}]
        
        # Create a new thread with the thinking content
        thinking_thread_id = "test_thinking_thread"
        save_chat_messages(
            thread_id=thinking_thread_id,
            messages=thinking_message,
            sampling_settings={"temperature": 0.7}
        )
        
        # Edit the message with new content but keep thinking section
        new_content = "<think>This is my thinking process.</think>\n\nHere's my updated answer!"
        
        # Edit the message
        result = edit_chat_message(thinking_thread_id, 0, new_content)
        
        # Assert the edit was successful
        self.assertTrue(result)
        
        # Read the file to verify changes
        thinking_path = get_session_filepath(thinking_thread_id)
        with open(thinking_path, 'r') as f:
            updated_data = json.load(f)
        
        # Check that the content was updated but thinking section preserved
        self.assertEqual(updated_data["messages"][0]["content"], new_content)
        self.assertTrue("<think>" in updated_data["messages"][0]["content"])
        self.assertTrue("updated answer" in updated_data["messages"][0]["content"])
        
    def test_edit_invalid_message_index(self):
        """Test editing a message with an invalid index"""
        # Test with an index that's out of bounds
        with self.assertRaises(ValueError):
            edit_chat_message(self.test_thread_id, 999, "This should fail")
        
        # Also test with a negative index
        with self.assertRaises(ValueError):
            edit_chat_message(self.test_thread_id, -1, "This should fail")
    
    def test_edit_nonexistent_session(self):
        """Test editing a message in a non-existent session"""
        # Try to edit a message in a session that doesn't exist
        result = edit_chat_message("nonexistent_thread", 0, "This should return False")
        
        # Assert the edit failed
        self.assertFalse(result)

    def test_edit_malformed_messages(self):
        """Test editing when messages list is malformed or missing"""
        # Create a malformed session file
        malformed_thread_id = "malformed_test_thread"
        malformed_file_path = os.path.join(self.temp_dir, f"{malformed_thread_id}.json")
        
        # Write a JSON without a proper messages list
        with open(malformed_file_path, 'w') as f:
            json.dump({
                "thread_id": malformed_thread_id,
                "metadata": {"created_at": datetime.datetime.now(UTC).isoformat()},
                "messages": "not a list"  # Malformed messages
            }, f)
        
        # Try to edit a message
        result = edit_chat_message(malformed_thread_id, 0, "This should fail")
        
        # Assert the edit failed
        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()