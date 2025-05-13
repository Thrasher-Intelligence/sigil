@echo off
setlocal enabledelayedexpansion

rem Batch script to start the Sigil development environment
rem This is the Windows equivalent of start_dev.sh

rem Navigate to project root directory (parent of scripts directory)
cd /d "%~dp0\.."

rem Check for required project structure
if not exist "backend\api\main.py" (
    echo Error: This script must be run from the project root directory containing 'frontend' and 'backend/api'
    exit /b 1
)
if not exist "frontend" (
    echo Error: This script must be run from the project root directory containing 'frontend' and 'backend/api'
    exit /b 1
)

rem Configuration
set FRONTEND_DIR=frontend
set BACKEND_HOST=127.0.0.1
set BACKEND_PORT=8000
set BACKEND_LOG_FILE=backend_api.log
set ERROR_LOG_FILE=console.log

rem Find Python interpreter
set PYTHON_CMD=venv\Scripts\python.exe
if not exist "%PYTHON_CMD%" (
    echo Warning: Virtual environment python not found at '%PYTHON_CMD%'
    where python >nul 2>&1
    if errorlevel 1 (
        echo Error: No usable Python interpreter found. Please create a virtual environment with 'python -m venv venv' in the project root or ensure Python is on your PATH.
        exit /b 1
    ) else (
        for /f "tokens=*" %%i in ('where python') do (
            set PYTHON_CMD=%%i
            goto :found_python
        )
    )
)
:found_python
echo Using Python: %PYTHON_CMD%

rem Start backend API
echo Starting backend API server (uvicorn)...
start /b cmd /c "%PYTHON_CMD% -m uvicorn backend.api.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% > %BACKEND_LOG_FILE% 2>&1"
set BACKEND_PID=%ERRORLEVEL%

rem Give uvicorn a moment to start
timeout /t 2 /nobreak > nul

rem Check if backend started successfully by checking the log file
find "Uvicorn running on" %BACKEND_LOG_FILE% > nul 2>&1
if errorlevel 1 (
    echo Error: Failed to start backend API server or it exited immediately.
    echo Check logs in %BACKEND_LOG_FILE%
    exit /b 1
)

echo Backend API server started. Logs in %BACKEND_LOG_FILE%

rem Start frontend
echo Starting frontend dev server...
cd "%FRONTEND_DIR%"

rem Install dependencies
echo Checking/installing frontend dependencies (npm install)...
call npm install > ..\%ERROR_LOG_FILE% 2>&1
if errorlevel 1 (
    echo Error: npm install failed. Please check for errors in %ERROR_LOG_FILE%.
    cd ..
    exit /b 1
)

rem Start npm run dev
echo Starting npm run dev...
start cmd /c "title Sigil Frontend && npm run dev"

rem Return to project root
cd ..

echo Frontend started successfully.
echo Backend API and Frontend are running.
echo Close the command windows to stop the services.

rem Keep this window open
echo Press any key to terminate all processes...
pause > nul

rem When user presses a key, kill the backend process
echo Stopping services...
taskkill /f /fi "WINDOWTITLE eq Sigil Frontend" > nul 2>&1
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq cmd.exe" /fi "windowtitle eq Sigil Frontend" /fo list ^| find "PID:"') do (
    taskkill /f /pid %%a > nul 2>&1
)

rem Kill any uvicorn process
taskkill /f /im python.exe /fi "WINDOWTITLE eq %PYTHON_CMD% -m uvicorn*" > nul 2>&1

echo Cleanup finished.
exit /b 0