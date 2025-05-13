# API Tests

This directory contains tests for the Sigil backend API, which is built with FastAPI.

## Test Coverage

The `test_main.py` file includes tests for the following API endpoints:

- **Health Check**: Verifies the API is running and accessible
- **Theme Management**: 
  - Listing available themes
  - Error handling when themes directory is not found
- **Model Management**:
  - Listing available models
  - Loading models by path and name
  - Error handling for model loading failures
- **System Information**:
  - VRAM information (CUDA, CPU, and no-model scenarios)
  - Device information
  - Model status
- **Settings Management**:
  - Updating generation settings
  - Validation of setting values 
  - Getting current settings
  - Setting and getting precision
- **Chat Interface**:
  - Successful chat completion
  - Error handling when no model is loaded

## Running Tests

From the project root:
```bash
# Run all API tests
python -m pytest tests/api

# Run with verbose output
python -m pytest -v tests/api

# Run a specific test function
python -m pytest tests/api/test_main.py::test_health_check
```

## Implementation Details

These tests use:
- `pytest` as the test framework
- FastAPI's `TestClient` for API request simulation
- `unittest.mock` for mocking dependencies like the model, file system, etc.

## Adding New Tests

When adding new API tests:
1. Follow the existing patterns for test setup and teardown
2. Use descriptive function names (`test_feature_scenario_result`)
3. Add proper mocking for external dependencies
4. Test both success and error scenarios

For endpoints that require authentication (if implemented in the future), make sure to add tests with and without proper authorization.