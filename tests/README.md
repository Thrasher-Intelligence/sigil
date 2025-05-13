# Sigil Test Suite

This directory contains tests for the Sigil application, a modern chat interface for large language models running locally on your hardware.

## Test Structure

The tests are organized by component:

- `api/` - Tests for the FastAPI backend API endpoints

## Current Tests

### API Tests (`api/test_main.py`)

The API tests verify that the backend REST endpoints function correctly. These tests use pytest and FastAPI's TestClient with unittest.mock for dependency mocking.

Currently covered endpoints:
- Health check
- Theme listing
- Model listing
- Model loading and management
- VRAM information
- Generation settings
- System information
- Chat interface

## Running Tests

To run all tests from the project root:

```bash
python -m pytest
```

To run tests with verbose output:

```bash
python -m pytest -v
```

To run only API tests:

```bash
python -m pytest tests/api
```

To run a specific test file:

```bash
python -m pytest tests/api/test_main.py
```

To run a specific test function:

```bash
python -m pytest tests/api/test_main.py::test_health_check
```

## Running Tests with Coverage

To run tests with coverage reporting:

```bash
python -m pytest --cov=backend tests/
```

For a detailed HTML coverage report:

```bash
python -m pytest --cov=backend --cov-report=html tests/
# Then open htmlcov/index.html in your browser
```

## Test Dependencies

Tests require the following Python packages:
- pytest
- httpx (for testing HTTP clients)
- pytest-cov (optional, for coverage reporting)

These dependencies should be installed in your development environment.

## Future Test Improvements

The following areas could benefit from additional test coverage:

1. **Frontend Testing**: Add Jest/React tests for frontend components

2. **Integration Tests**: Implement end-to-end tests that cover the integration between frontend and backend

3. **Additional Backend Tests**:
   - WebSocket chat functionality
   - Streaming response handling
   - Error handling and recovery
   - Performance testing for model loading/inference
   - Configuration persistence
   - Theme customization

4. **Security Testing**:
   - Input validation and sanitization
   - Resource limitation
   - Local file access boundaries

5. **Mock LLM Tests**:
   - Create more comprehensive mock models
   - Test different tokenizers
   - Test handling of various model architectures

## Contributing Tests

When contributing new tests:

1. Follow the existing pattern of using descriptive test names
2. Properly mock external dependencies
3. Ensure test isolation (tests should not depend on each other)
4. Keep tests fast and resource-efficient when possible
5. Include both positive tests (expected behavior) and negative tests (error handling)

Remember to update this README when adding new test categories or significant test cases.