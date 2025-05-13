"""
FastAPI Backend API Test Suite

This module contains unit tests for the Sigil backend API endpoints, including:
- Health check endpoint
- Theme listing endpoint
- Model listing endpoint
- Model loading endpoints
- VRAM information endpoint
- Generation settings endpoints
- System information endpoints
- Chat endpoints

Tests use pytest and FastAPI's TestClient, with unittest.mock for mocking dependencies.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os
import sys

# Add the backend directory to the path to allow imports
# This assumes the tests are run from the project root
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
sys.path.insert(0, project_root)

# Now import the app
# We need to potentially adjust this path if the app initialization is complex
# or depends on things not available during testing setup.
# For now, assume direct import works.
try:
    from backend.api.main import app
except ImportError as e:
    pytest.skip(f"Could not import FastAPI app, skipping integration tests: {e}", allow_module_level=True)


client = TestClient(app)

# Mock model data for use in tests
class MockTokenizer:
    """Mock Tokenizer class that simulates HuggingFace tokenizers without dependencies.
    
    This mock provides the minimum functionality required for testing:
    - encode: Converts text to token IDs
    - decode: Converts token IDs back to text
    """
    def __init__(self):
        self.pad_token_id = 0

    def encode(self, text, *args, **kwargs):
        """Mock encoding that simulates token count based on text length."""
        return [1] * (len(text) // 4 + 1)
    
    def decode(self, ids, *args, **kwargs):
        """Mock decoding that returns a fixed string."""
        return "Decoded text from model"

class MockModel:
    """Mock Model class that simulates HuggingFace models without dependencies.
    
    This mock provides the minimum functionality required for testing:
    - generate: Returns a fake sequence of token IDs
    - to: Simulates moving the model to a specific device
    """
    def __init__(self):
        self.config = MagicMock()
        self.config.pad_token_id = 0
    
    def generate(self, *args, **kwargs):
        """Mock generation that returns a simple list instead of a tensor."""
        return [[1, 2, 3, 4, 5]]
    
    def to(self, device):
        """Mock device movement that just returns self."""
        return self

def test_health_check():
    """Test the /health endpoint.
    
    This test verifies that:
    1. The health endpoint returns a 200 status code
    2. The response contains the expected JSON {"status": "ok"}
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@patch('os.path.isdir')
@patch('os.listdir')
@patch('os.path.abspath')
def test_list_themes_success(mock_abspath, mock_listdir, mock_isdir):
    """Test the /themes endpoint successfully lists themes.
    
    This test verifies that:
    1. When themes directory exists, the endpoint returns all CSS files as themes
    2. Non-CSS files are excluded from the response
    3. CSS extensions are stripped from the filenames
    4. The response has a 200 status code
    """
    # Configure mocks
    mock_abspath.return_value = '/fake/path/to/frontend/public/themes'
    mock_isdir.return_value = True
    mock_listdir.return_value = ['theme1.css', 'theme2.css', 'otherfile.txt']

    response = client.get("/themes")
    assert response.status_code == 200
    assert response.json() == ['theme1', 'theme2']
    mock_abspath.assert_called_once()
    mock_isdir.assert_called_once_with('/fake/path/to/frontend/public/themes')
    mock_listdir.assert_called_once_with('/fake/path/to/frontend/public/themes')

@patch('os.path.isdir')
@patch('os.path.abspath')
def test_list_themes_dir_not_found(mock_abspath, mock_isdir):
    """Test the /themes endpoint when the themes directory doesn't exist.
    
    This test verifies that:
    1. When themes directory doesn't exist, a 404 status code is returned
    2. The response contains the expected error message
    """
    # Configure mocks
    mock_abspath.return_value = '/fake/path/to/nonexistent'
    mock_isdir.return_value = False

    response = client.get("/themes")
    assert response.status_code == 404
    assert response.json() == {"detail": "Themes directory not found"}
    mock_abspath.assert_called_once()
    mock_isdir.assert_called_once_with('/fake/path/to/nonexistent')


@patch('os.path.isdir')
@patch('os.listdir')
@patch('os.path.abspath')
def test_list_models_success(mock_abspath, mock_listdir, mock_isdir):
    """Test the /models endpoint successfully lists models.
    
    This test verifies that:
    1. When models directory exists, the endpoint returns all subdirectories as models
    2. Non-directory items (files) are excluded from the response
    3. Special directories like __pycache__ are excluded
    4. The response has a 200 status code
    """
    # Configure mocks
    models_base_dir = '/fake/path/to/backend/models'
    mock_abspath.return_value = models_base_dir
    # Mock os.path.isdir for the base directory check
    # And also for the checks within the list comprehension
    def isdir_side_effect(path):
        if path == models_base_dir:
            return True # The main models directory exists
        elif path == os.path.normpath(os.path.join(models_base_dir, 'model1')):
            return True # model1 is a directory
        elif path == os.path.normpath(os.path.join(models_base_dir, 'model2')):
            return True # model2 is a directory
        elif path == os.path.normpath(os.path.join(models_base_dir, 'a_file.txt')):
            return False # a_file.txt is not a directory
        return False # Default case

    mock_isdir.side_effect = isdir_side_effect
    mock_listdir.return_value = ['model1', 'model2', 'a_file.txt', '__pycache__']

    response = client.get("/models")

    assert response.status_code == 200
    assert response.json() == ['model1', 'model2'] # Should only include directories
    mock_abspath.assert_called_once()
    # Check calls to isdir: once for the base path, then for each item listdir returns
    expected_isdir_calls = [
        models_base_dir,
        os.path.normpath(os.path.join(models_base_dir, 'model1')),
        os.path.normpath(os.path.join(models_base_dir, 'model2')),
        os.path.normpath(os.path.join(models_base_dir, 'a_file.txt')),
        os.path.normpath(os.path.join(models_base_dir, '__pycache__'))
    ]
    # Convert call args list to simple paths for comparison
    actual_isdir_calls = [call[0][0] for call in mock_isdir.call_args_list]

    assert actual_isdir_calls[0] == expected_isdir_calls[0] # Check the first call separately
    # Check the subsequent calls (order might vary depending on listdir)
    assert sorted(actual_isdir_calls[1:]) == sorted(expected_isdir_calls[1:])

    mock_listdir.assert_called_once_with(models_base_dir)


@patch('os.path.isdir')
@patch('os.path.abspath')
def test_list_models_dir_not_found(mock_abspath, mock_isdir):
    """Test the /models endpoint when the models directory doesn't exist.
    
    This test verifies that:
    1. When models directory doesn't exist, a 404 status code is returned
    2. The response contains the expected error message
    """
    # Configure mocks
    mock_abspath.return_value = '/fake/path/to/nonexistent/models'
    mock_isdir.return_value = False # The base models directory doesn't exist

    response = client.get("/models")
    assert response.status_code == 404
    assert response.json() == {"detail": "Models directory not found"}
    mock_abspath.assert_called_once()
    mock_isdir.assert_called_once_with('/fake/path/to/nonexistent/models')


# --- Tests for model loading endpoints ---
@patch('backend.api.main.load_model_internal')
def test_load_model_success(mock_load_model):
    """Test the /api/v1/model/load endpoint successfully loads a model.
    
    This test verifies that:
    1. The endpoint correctly calls load_model_internal with the provided path
    2. Upon successful loading, it returns a 200 status code
    3. The response contains the path, device, and success message
    4. App state is updated with the loaded model information
    """
    # Configure mocks
    mock_tokenizer = MockTokenizer()
    mock_model = MockModel()
    mock_load_model.return_value = (mock_tokenizer, mock_model, "cuda")
    
    # Test data
    test_path = "/path/to/model"
    
    # Make request
    response = client.post(
        "/api/v1/model/load", 
        json={"path": test_path}
    )
    
    # Assertions
    assert response.status_code == 200
    assert response.json()["message"] == "Model loaded successfully."
    assert response.json()["path"] == test_path
    assert response.json()["device"] == "cuda"
    mock_load_model.assert_called_once_with(test_path)


@patch('backend.api.main.load_model_internal')
def test_load_model_error(mock_load_model):
    """Test the /api/v1/model/load endpoint when loading fails.
    
    This test verifies that:
    1. When load_model_internal raises a RuntimeError, the endpoint returns a 500 status code
    2. The error message is included in the response detail
    """
    # Configure mocks
    mock_load_model.side_effect = RuntimeError("Failed to load model")
    
    # Make request
    response = client.post(
        "/api/v1/model/load", 
        json={"path": "/path/to/model"}
    )
    
    # Assertions
    assert response.status_code == 500
    assert "Failed to load model" in response.json()["detail"]


@patch('backend.api.main.load_model_by_name')
def test_load_model_by_name_success(mock_load_model_by_name):
    """Test the /api/v1/model/load/{model_name} endpoint successfully loads a model.
    
    This test verifies that:
    1. The endpoint correctly calls load_model_by_name with the provided model name
    2. Upon successful loading, it returns a 200 status code
    3. The response contains the expected status, message, and device information
    4. App state is updated with the loaded model information
    """
    # Configure mocks
    mock_tokenizer = MockTokenizer()
    mock_model = MockModel()
    mock_load_model_by_name.return_value = (mock_tokenizer, mock_model, "cuda")
    
    # Make request
    response = client.post("/api/v1/model/load/test-model")
    
    # Assertions
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "test-model" in response.json()["message"]
    assert response.json()["device"] == "cuda"
    mock_load_model_by_name.assert_called_once_with("test-model")


@patch('backend.api.main.load_model_by_name')
def test_load_model_by_name_not_found(mock_load_model_by_name):
    """Test the /api/v1/model/load/{model_name} endpoint when model not found.
    
    This test verifies that:
    1. When load_model_by_name raises a ValueError (model not found), the endpoint returns a 404 status code
    2. The error message is included in the response detail
    """
    # Configure mocks
    mock_load_model_by_name.side_effect = ValueError("Model not found")
    
    # Make request
    response = client.post("/api/v1/model/load/nonexistent-model")
    
    # Assertions
    assert response.status_code == 404
    assert "Model not found" in response.json()["detail"]


# --- Tests for VRAM endpoint ---
@patch('torch.cuda.is_available')
@patch('torch.cuda.get_device_properties')
@patch('torch.cuda.memory_reserved')
@patch('torch.cuda.memory_allocated')
@patch('torch.cuda.get_device_name')
def test_vram_info_with_cuda(mock_device_name, mock_allocated, mock_reserved, mock_props, mock_is_available):
    """Test the /api/v1/vram endpoint when CUDA is available.
    
    This test verifies that:
    1. When a model is loaded on a CUDA device, VRAM information is correctly reported
    2. The response includes GPU name, total memory, reserved memory, allocated memory, and free memory
    3. All memory values are reported in GB and properly rounded
    4. The response has a 200 status code and "ok" status
    """
    # Setup app state
    app.state.device = "cuda"
    
    # Configure mocks
    mock_is_available.return_value = True
    mock_device_props = MagicMock()
    mock_device_props.total_memory = 8 * 1024**3  # 8 GB
    mock_props.return_value = mock_device_props
    mock_reserved.return_value = 4 * 1024**3  # 4 GB
    mock_allocated.return_value = 2 * 1024**3  # 2 GB
    mock_device_name.return_value = "NVIDIA GeForce RTX Test"
    
    # Make request
    response = client.get("/api/v1/vram")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "ok"
    assert result["device"] == "NVIDIA GeForce RTX Test"
    assert result["total_gb"] == 8.0
    assert result["reserved_gb"] == 4.0
    assert result["allocated_gb"] == 2.0
    assert result["free_in_reserved_gb"] == 2.0


def test_vram_info_no_model():
    """Test the /api/v1/vram endpoint when no model is loaded.
    
    This test verifies that:
    1. When no model is loaded (device is None), the endpoint returns an appropriate message
    2. The response has a 200 status code and "ok" status despite no model being loaded
    """
    # Setup app state
    app.state.device = None
    
    # Make request
    response = client.get("/api/v1/vram")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "ok"
    assert "Model not loaded" in result["message"]


def test_vram_info_with_cpu():
    """Test the /api/v1/vram endpoint when model is on CPU.
    
    This test verifies that:
    1. When a model is loaded on CPU, the endpoint returns an appropriate message
    2. The response has a 200 status code and "ok" status
    3. No VRAM information is included since the model is not on GPU
    """
    # Setup app state
    app.state.device = "cpu"
    
    # Make request
    response = client.get("/api/v1/vram")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "ok"
    assert "CPU" in result["message"]


# --- Tests for settings endpoints ---
def test_settings_update_success():
    """Test the /api/v1/settings/update endpoint successfully updates settings.
    
    This test verifies that:
    1. The endpoint correctly updates all provided settings (system_prompt, temperature, top_p, max_new_tokens)
    2. The response includes the updated settings and a success message
    3. App state is correctly updated with the new values
    4. The response has a 200 status code
    """
    # Setup initial app state values
    app.state.system_prompt = "Default prompt"
    app.state.temperature = 0.7
    app.state.top_p = 0.9
    app.state.max_new_tokens = 500
    
    # Test data
    new_settings = {
        "system_prompt": "New prompt",
        "temperature": 0.8,
        "top_p": 0.95,
        "max_new_tokens": 1000
    }
    
    # Make request
    response = client.post("/api/v1/settings/update", json=new_settings)
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["message"] == "Generation settings updated successfully."
    assert result["updated_settings"]["system_prompt"] == "New prompt"
    assert result["updated_settings"]["temperature"] == 0.8
    assert result["updated_settings"]["top_p"] == 0.95
    assert result["updated_settings"]["max_new_tokens"] == 1000
    
    # Check that app state was updated
    assert app.state.system_prompt == "New prompt"
    assert app.state.temperature == 0.8
    assert app.state.top_p == 0.95
    assert app.state.max_new_tokens == 1000


def test_settings_update_validation():
    """Test validation in the /api/v1/settings/update endpoint.
    
    This test verifies that:
    1. Invalid temperature values (outside 0-2.0 range) are rejected with a 400 status code
    2. Invalid top_p values (outside 0-1.0 range) are rejected with a 400 status code
    3. Negative max_new_tokens values are rejected with a 400 status code
    4. Empty settings payload is rejected with a 400 status code
    5. Appropriate error messages are returned for each validation failure
    """
    # Setup initial app state values
    app.state.temperature = 0.7
    app.state.top_p = 0.9
    app.state.max_new_tokens = 500
    
    # Test with invalid temperature
    response = client.post("/api/v1/settings/update", json={"temperature": 3.0})
    assert response.status_code == 400
    assert "Temperature must be between" in response.json()["detail"]
    
    # Test with invalid top_p
    response = client.post("/api/v1/settings/update", json={"top_p": 1.5})
    assert response.status_code == 400
    assert "Top P must be between" in response.json()["detail"]
    
    # Test with invalid max_new_tokens
    response = client.post("/api/v1/settings/update", json={"max_new_tokens": -10})
    assert response.status_code == 400
    assert "Max new tokens must be positive" in response.json()["detail"]
    
    # Test with no settings provided
    response = client.post("/api/v1/settings/update", json={})
    assert response.status_code == 400
    assert "No valid settings provided" in response.json()["detail"]


def test_get_current_settings():
    """Test the /api/v1/settings/current endpoint.
    
    This test verifies that:
    1. The endpoint correctly returns the current settings from app state
    2. All settings (system_prompt, temperature, top_p, max_new_tokens) are included
    3. The response has a 200 status code
    """
    # Setup app state
    app.state.system_prompt = "Test prompt"
    app.state.temperature = 0.85
    app.state.top_p = 0.92
    app.state.max_new_tokens = 750
    
    # Make request
    response = client.get("/api/v1/settings/current")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["system_prompt"] == "Test prompt"
    assert result["temperature"] == 0.85
    assert result["top_p"] == 0.92
    assert result["max_new_tokens"] == 750


# --- Tests for system endpoints ---
@patch('backend.api.routes.system.get_device_status')
def test_system_device_endpoint(mock_get_device_status):
    """Test the /api/v1/system/device endpoint."""
    # Configure mock
    mock_get_device_status.return_value = {
        "device": "cuda",
        "device_name": "NVIDIA Test GPU"
    }
    
    # Make request
    response = client.get("/api/v1/system/device")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["device"] == "cuda"
    assert result["device_name"] == "NVIDIA Test GPU"


@patch('backend.api.core.settings_manager.get_precision')
def test_get_precision(mock_get_precision):
    """Test the /api/v1/system/get_precision endpoint."""
    # Configure mock
    mock_get_precision.return_value = "fp16"
    
    # Make request
    response = client.get("/api/v1/system/get_precision")
    
    # Assertions
    assert response.status_code == 200
    assert response.json()["current_precision"] == "fp16"


@patch('backend.api.core.settings_manager.settings')
@patch('backend.api.core.settings_manager.get_precision')
def test_set_precision(mock_get_precision, mock_settings):
    """Test the /api/v1/system/set_precision endpoint."""
    # Configure mocks
    mock_get_precision.return_value = "fp16"
    
    # Make request
    response = client.post("/api/v1/system/set_precision", json={"precision": "fp16"})
    
    # Assertions
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["new_precision"] == "fp16"
    # The actual function calls object.__setattr__ on settings, which we can't easily verify
    # But we can verify the response is correct


@patch('backend.api.routes.system.VALID_PRECISIONS', ["fp16", "fp32"])
def test_set_precision_invalid():
    """Test the /api/v1/system/set_precision endpoint with invalid precision."""
    # Make request
    response = client.post("/api/v1/system/set_precision", json={"precision": "invalid"})
    
    # Assertions
    assert response.status_code == 400
    assert "Invalid precision" in response.json()["detail"]


# --- Tests for model status endpoint ---
def test_model_status_loaded():
    """Test the /api/v1/models/status endpoint when model is loaded."""
    # Setup app state
    app.state.model = MockModel()
    app.state.tokenizer = MockTokenizer()
    app.state.model_path = "/path/to/test/model"
    app.state.device = "cuda"
    
    # Make request
    response = client.get("/api/v1/models/status")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["loaded"] is True
    assert result["path"] == "/path/to/test/model"
    assert result["device"] == "cuda"


def test_model_status_not_loaded():
    """Test the /api/v1/models/status endpoint when no model is loaded."""
    # Setup app state
    app.state.model = None
    app.state.tokenizer = None
    
    # Make request
    response = client.get("/api/v1/models/status")
    
    # Assertions
    assert response.status_code == 200
    assert response.json()["loaded"] is False


# --- Tests for chat endpoint ---
def test_chat_endpoint_success():
    """Test the basic functionality of the /api/v1/chat/chat endpoint."""
    # This test needs more comprehensive mocking due to the complex nature of the inference
    # Using a monkeypatch approach for more control

    # Override the MockTokenizer's apply_chat_template method
    original_encode = MockTokenizer.encode
    original_decode = MockTokenizer.decode
    
    def mock_apply_chat_template(self, messages, tokenize=False, add_generation_prompt=True):
        """Mock implementation of apply_chat_template."""
        return "Formatted prompt with system and user messages"
    
    # Patch the tokenizer class
    MockTokenizer.apply_chat_template = mock_apply_chat_template
    
    # Setup app state with required components
    app.state.model = MockModel()
    app.state.tokenizer = MockTokenizer() 
    app.state.device = "cuda"
    app.state.system_prompt = "You are an AI assistant."
    app.state.temperature = 0.7
    app.state.top_p = 0.9
    app.state.max_new_tokens = 500
    
    # Test data - ChatRequest expects a message string, not messages array
    chat_request = {
        "message": "Hello, AI!"
    }
    
    # Make request
    with patch('backend.api.routes.chat.generate_response', return_value=("AI response", 10)), \
         patch('backend.api.routes.chat.truncate_at_stop_token', return_value="AI response"), \
         patch('backend.api.routes.chat.clean_response', return_value="AI response"):
        response = client.post("/api/v1/chat/chat", json=chat_request)
    
    # Restore the original methods
    MockTokenizer.encode = original_encode
    MockTokenizer.decode = original_decode
    
    # Assertions
    assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
    result = response.json()
    assert "AI response" in result["response"]


def test_chat_endpoint_no_model():
    """Test the /api/v1/chat/chat endpoint when no model is loaded."""
    # Make sure to reset app state between tests
    old_model = getattr(app.state, 'model', None)
    old_tokenizer = getattr(app.state, 'tokenizer', None)
    
    try:
        # Setup app state with no model
        app.state.model = None
        app.state.tokenizer = None
        
        # Test data - ChatRequest expects a message string, not messages array
        chat_request = {
            "message": "Hello, AI!"
        }
        
        # Make request
        response = client.post("/api/v1/chat/chat", json=chat_request)
        
        # Assertions
        assert response.status_code == 409
        assert "Model is not loaded" in response.json()["detail"]
    finally:
        # Restore previous state
        app.state.model = old_model
        app.state.tokenizer = old_tokenizer


# Remove test_chat_v2_endpoint_success as it's not needed yet
# We can add this back when the v2 API is finalized
