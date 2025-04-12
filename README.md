# Sigil - Local LLM Runner with Web UI

This project provides a foundation for running Hugging Face transformer models locally using Python (FastAPI backend) and interacting with them through a React/Vite web interface. It handles model loading via API calls, serves the model, and includes a development script to manage the backend and frontend processes.

The goal is to offer a starting point that you can quickly get running and adapt for experiments, integrating local models with a web-based UI.

## Features

*   Loads compatible Hugging Face transformer models from a local directory via an API call.
*   Serves the model via a FastAPI backend API (`/api/v1/...` endpoints).
*   Provides a basic React/Vite web interface for chat.
*   Includes basic GPU (CUDA) detection and attempts to use GPU if available.
*   Backend API endpoint (`/api/v1/vram`) to report VRAM usage (if CUDA is available).
*   Development startup script (`start_dev.sh`) manages starting/stopping the backend and frontend servers.

## Demo

**Launching and Loading Model:**

![Application Launch and Model Loading](assets/demo.gif)

**Chat Interface and Inference:**

![Chat Interface Inference Example](assets/inference.gif)

## Prerequisites

*   Python 3.8+ (tested with 3.9)
*   `pip` (Python package installer)
*   Node.js and `npm` (for the frontend development server and building)
*   A compatible Hugging Face transformer model downloaded locally (e.g., TinyLlama). The model directory should contain files like `*.safetensors` or `pytorch_model.bin`, `config.json`, `tokenizer.json`, etc.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Thrasher-Intelligence/sigil
    cd sigil
    ```

2.  **Create and activate a Python virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    # On Windows use: venv\Scripts\activate
    ```

3.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *Note: Installing `torch` can sometimes be complex. If you need a specific version (e.g., for CUDA), refer to the official PyTorch installation guide: <https://pytorch.org/get-started/locally/>*

4.  **Install Frontend dependencies:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

5.  **(Optional but Recommended) Download a Model:**
    If you don't have one, download a model like TinyLlama:
    *   Go to: <https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0>
    *   Download the necessary files (e.g., `config.json`, `tokenizer.json`, model weights like `.safetensors`).
    *   Create a directory (e.g., `mkdir models/TinyLlama-1.1B-Chat-v1.0`) and place all downloaded files inside it.

## Running the Development Environment

1.  **Ensure your Python virtual environment is activated.**

2.  **Run the development startup script from the project root:**
    ```bash
    ./start_dev.sh
    ```

3.  **Wait for Startup:**
    *   The script first starts the backend API server (Uvicorn). You'll see logs in `backend/backend_api.log`. It will indicate if CUDA is detected.
    *   Then, it starts the frontend Vite development server (usually accessible at `http://localhost:5173`).

4.  **Load Model & Chat:**
    *   Open your web browser to the frontend URL (e.g., `http://localhost:5173`).
    *   The web UI should provide an interface to specify the path to your downloaded model directory.
    *   Once the model path is submitted, the frontend will call the backend API (`/api/v1/model/load`) to load the model. Watch the backend logs (`backend/backend_api.log`) for progress.
    *   After the model is loaded successfully, you can use the chat interface.

5.  **Stopping:**
    *   Press `Ctrl+C` in the terminal where `start_dev.sh` is running. The script will handle shutting down both the backend and frontend processes.

## Project Structure

*   `start_dev.sh`: Main development environment startup script. Manages backend/frontend processes.
*   `requirements.txt`: Python dependencies for the backend.
*   `backend/`: Contains the backend API code.
    *   `api/`: Specific code for the FastAPI app.
        *   `main.py`: FastAPI application definition, model loading logic, API endpoints (`/api/v1/...`).
    *   `backend_api.log`: Log file for the running backend server (created by `start_dev.sh`).
*   `frontend/`: Contains the React/Vite frontend code.
    *   `src/`: React components, application logic, API interaction.
    *   `public/`: Static assets.
    *   `index.html`: Main HTML entry point for Vite.
    *   `package.json`: Frontend dependencies (`npm`) and scripts (`dev`, `build`, `lint`).
    *   `vite.config.js`: Vite configuration file.
*   `venv/`: (Created by you) Python virtual environment.
*   `models/`: (Optional, created by you) Suggested location for downloaded model files.

## Customization

*   **Generation Parameters:**
    *   Defaults are set in `backend/api/main.py` (e.g., `app.state.temperature`).
    *   The `/api/v1/settings/update` endpoint allows changing parameters like `temperature`, `top_p`, `max_new_tokens`, and `system_prompt` at runtime (the frontend might need adjustments to use this).
*   **Backend API:** Add or modify endpoints in `backend/api/main.py`.
*   **Frontend UI:** Modify the React components and logic in `frontend/src/`.
*   **Model Loading Logic:** Found within `load_model_internal` function and the `/api/v1/model/load` endpoint in `backend/api/main.py`.

Support Thrasher Intelligence: patreon.com/Thrasher_Intelligence
Check out the TUI version at: https://github.com/Thrasher-Intelligence/prometheus
