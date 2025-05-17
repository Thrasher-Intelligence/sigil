import unittest
import sys
import json
import tempfile
import shutil
import os
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import status

# Add the parent directory to the path so we can import the backend modules
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.routes.chat import router, EditMessageRequest
from backend.api.core.history_manager import HISTORY_DIR, get_session_filepath, save_chat_messages

# Create a test client
from fastapi import FastAPI
app = FastAPI()
app.include_router(router, prefix="/api/v1/chat")
client = TestClient(app)

class TestChatRoutes(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for test files
        self.temp_dir = tempfile.mkdtemp()
        self.original_history_dir = HISTORY_DIR
        
        # Patch the history directory to use our temp directory
        self._patcher = patch('backend.api.core.history_manager.HISTORY_DIR', self.temp_dir)
        self._patcher.start()
        
        # Create test session data
        self.test_thread_id = "test_thread_456"
        self.test_messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello there!"},
            {"role": "assistant", "content": "Hi! How can I help you today?"}
        ]
        
        # Save the test session
        save_chat_messages(
            thread_id=self.test_thread_id,
            messages=self.test_messages,
            sampling_settings={"temperature": 0.7},
            system_prompt="You are a helpful assistant."
        )
        
        # Get the session filepath for verification
        self.session_path = get_session_filepath(self.test_thread_id)

    def tearDown(self):
        # Stop the patcher
        self._patcher.stop()
        # Remove the temporary directory
        shutil.rmtree(self.temp_dir)

    def test_edit_message_endpoint(self):
        """Test that the edit message endpoint works correctly"""
        # Test editing a user message
        user_message_index = 1
        new_user_content = "Edited user message!"
        
        response = client.put(
            f"/api/v1/chat/session/{self.test_thread_id}/message/{user_message_index}",
            json={"new_content": new_user_content}
        )
        
        # Verify the response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result = response.json()
        self.assertTrue(result["success"])
        self.assertEqual(result["thread_id"], self.test_thread_id)
        self.assertEqual(result["message_index"], user_message_index)
        
        # Verify the file was updated
        with open(self.session_path, 'r') as f:
            session_data = json.load(f)
        
        self.assertEqual(session_data["messages"][user_message_index]["content"], new_user_content)
        self.assertTrue(session_data["messages"][user_message_index]["edited"])
        
        # Test editing an assistant message
        assistant_message_index = 2
        new_assistant_content = "Edited assistant message!"
        
        response = client.put(
            f"/api/v1/chat/session/{self.test_thread_id}/message/{assistant_message_index}",
            json={"new_content": new_assistant_content}
        )
        
        # Verify the response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result = response.json()
        self.assertTrue(result["success"])
        
        # Verify the file was updated
        with open(self.session_path, 'r') as f:
            session_data = json.load(f)
        
        self.assertEqual(session_data["messages"][assistant_message_index]["content"], new_assistant_content)
        self.assertTrue(session_data["messages"][assistant_message_index]["edited"])

    def test_edit_message_nonexistent_session(self):
        """Test editing a message in a nonexistent session"""
        response = client.put(
            "/api/v1/chat/session/nonexistent-thread/message/0",
            json={"new_content": "This should fail"}
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        result = response.json()
        self.assertIn("not found", result["detail"].lower())

    def test_edit_message_invalid_index(self):
        """Test editing a message with an out-of-range index"""
        response = client.put(
            f"/api/v1/chat/session/{self.test_thread_id}/message/999",
            json={"new_content": "This should fail"}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        result = response.json()
        self.assertIn("out of range", result["detail"].lower())

    def test_edit_message_empty_content(self):
        """Test editing a message with empty content"""
        response = client.put(
            f"/api/v1/chat/session/{self.test_thread_id}/message/1",
            json={"new_content": ""}
        )
        
        # This should still work since the backend doesn't currently validate content
        # But the frontend should prevent this
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_edit_message_invalid_thread_id(self):
        """Test editing a message with an invalid thread ID format"""
        response = client.put(
            "/api/v1/chat/session/../invalid-path/message/0",
            json={"new_content": "This should fail"}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        result = response.json()
        self.assertIn("invalid", result["detail"].lower())

if __name__ == "__main__":
    unittest.main()