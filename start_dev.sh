#!/bin/bash

# Ensure the script is run from the project root
# Adjusted check: Look for backend/api/main.py
if [ ! -f "backend/api/main.py" ] || [ ! -d "frontend" ]; then
  echo "Error: This script must be run from the project root directory containing 'frontend' and 'backend/api'"
  exit 1
fi

# --- Configuration ---
PYTHON_CMD="python" # Or specify path to venv python: e.g., venv/bin/python
FRONTEND_DIR="frontend"
BACKEND_DIR="backend/api"
BACKEND_HOST="127.0.0.1" # Host for backend API server
BACKEND_PORT=8000          # Port for backend API server
BACKEND_LOG_FILE="backend_api.log" # Log file for uvicorn output

# --- Global PIDs ---
FRONTEND_PID=""
BACKEND_PID=""

# --- Cleanup Function --- 
cleanup() {
  echo "Caught signal or exit. Cleaning up..."
  # Kill frontend if its PID is set
  if [ -n "$FRONTEND_PID" ]; then
    echo "Stopping frontend (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null
    sleep 1
    kill -9 "$FRONTEND_PID" 2>/dev/null
  fi
  # Kill backend if its PID is set
  if [ -n "$BACKEND_PID" ]; then
    echo "Stopping backend API (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null
    sleep 1
    kill -9 "$BACKEND_PID" 2>/dev/null
  fi
  # Temp file cleanup removed as it's no longer used
  echo "Cleanup finished."
  trap - SIGINT SIGTERM EXIT
  exit 0
}

# --- Trap Signals --- 
# Call cleanup function on SIGINT (Ctrl+C), SIGTERM, or script EXIT
trap cleanup SIGINT SIGTERM EXIT

# --- Start Backend API ---
echo "Starting backend API server (uvicorn)..."
cd "$BACKEND_DIR" || exit 1 # Exit if cd fails

# Start uvicorn in the background, redirect stdout/stderr to log file
$PYTHON_CMD -m uvicorn main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" > "../$BACKEND_LOG_FILE" 2>&1 &
BACKEND_PID=$! # Get the PID of the last background process

cd ../.. # Go back to project root

# Check if backend PID was captured and process is running
sleep 2 # Give uvicorn a moment to potentially fail
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Error: Failed to start backend API server or it exited immediately."
    echo "Check logs in $BACKEND_DIR/$BACKEND_LOG_FILE"
    exit 1 # Cleanup will be called by the EXIT trap
fi

echo "Backend API server started (PID: $BACKEND_PID). Logs in $BACKEND_DIR/$BACKEND_LOG_FILE"

# --- Start Frontend ---
echo "Starting frontend dev server..."
cd "$FRONTEND_DIR" || exit 1 # Exit if cd fails

# Start npm run dev in the background
npm run dev &
FRONTEND_PID=$! # Get the PID of the last background process

cd .. # Go back to project root

# Check if frontend PID was captured and process is running
sleep 2 # Give frontend a moment
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Error: Failed to start 'npm run dev' or it exited immediately."
    exit 1 # Cleanup will be called by the EXIT trap
fi

echo "Frontend started successfully (PID: $FRONTEND_PID)."

# --- Wait ---
echo "Backend API and Frontend are running. Press Ctrl+C to stop."
# Wait for either process to finish or for a signal
wait $BACKEND_PID $FRONTEND_PID
EXIT_CODE=$?
echo "A process finished or was interrupted (Exit Code: $EXIT_CODE)."
# Cleanup is handled by the trap

