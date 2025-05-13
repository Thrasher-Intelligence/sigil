# PowerShell script to start the Sigil development environment
# This is the Windows equivalent of start_dev.sh

# Ensure we're in the project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath

# Change to project root
Set-Location $projectRoot

# Function to check if required paths exist
function Test-ProjectStructure {
    if (-not (Test-Path "backend/api/main.py") -or -not (Test-Path "frontend" -PathType Container)) {
        Write-Error "Error: This script must be run from the project root directory containing 'frontend' and 'backend/api'"
        exit 1
    }
}

# Function to find Python interpreter
function Get-PythonInterpreter {
    $venvPython = Join-Path $projectRoot "venv\Scripts\python.exe"
    
    if (Test-Path $venvPython) {
        return $venvPython
    }
    
    Write-Warning "Virtual environment python not found at '$venvPython'"
    
    # Try to find python on PATH
    $systemPython = Get-Command python -ErrorAction SilentlyContinue
    if ($systemPython) {
        Write-Host "Falling back to system python: $($systemPython.Source)"
        return $systemPython.Source
    }
    
    $systemPython3 = Get-Command python3 -ErrorAction SilentlyContinue
    if ($systemPython3) {
        Write-Host "Falling back to system python3: $($systemPython3.Source)"
        return $systemPython3.Source
    }
    
    Write-Error "Error: No usable Python interpreter found. Please create a virtual environment with 'python -m venv venv' in the project root or ensure Python is installed and on your PATH."
    exit 1
}

# Configuration
$frontendDir = "frontend"
$backendHost = "127.0.0.1"
$backendPort = 8000
$backendLogFile = "backend_api.log"

# Variables to store process IDs
$backendProcess = $null
$frontendProcess = $null

# Cleanup function for termination
function Cleanup {
    Write-Host "Cleaning up processes..."
    
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Write-Host "Stopping frontend process..."
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host "Stopping backend API process..."
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Cleanup finished."
}

# Register cleanup on script exit
$exitScript = {
    Cleanup
}
trap {
    Cleanup
    break
}

# Main script execution
try {
    # Verify project structure
    Test-ProjectStructure
    
    # Get Python interpreter
    $pythonCmd = Get-PythonInterpreter
    
    # Start backend API server
    Write-Host "Starting backend API server (uvicorn)..."
    $backendProcess = Start-Process -FilePath $pythonCmd -ArgumentList "-m", "uvicorn", "backend.api.main:app", "--host", $backendHost, "--port", $backendPort -RedirectStandardOutput $backendLogFile -RedirectStandardError $backendLogFile -PassThru -NoNewWindow
    
    # Give uvicorn a moment to potentially fail
    Start-Sleep -Seconds 2
    
    if ($backendProcess.HasExited) {
        Write-Error "Error: Failed to start backend API server or it exited immediately. Check logs in $backendLogFile"
        exit 1
    }
    
    Write-Host "Backend API server started (PID: $($backendProcess.Id)). Logs in $backendLogFile"
    
    # Start frontend
    Write-Host "Starting frontend dev server..."
    Set-Location $frontendDir
    
    # Install dependencies
    Write-Host "Checking/installing frontend dependencies (npm install)..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error: npm install failed. Please check for errors."
        exit 1
    }
    
    # Start npm run dev
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow
    
    # Return to project root
    Set-Location $projectRoot
    
    # Check if frontend started successfully
    Start-Sleep -Seconds 2
    if ($frontendProcess.HasExited) {
        Write-Error "Error: Failed to start 'npm run dev' or it exited immediately."
        exit 1
    }
    
    Write-Host "Frontend started successfully (PID: $($frontendProcess.Id))."
    Write-Host "Backend API and Frontend are running. Close this window to stop all processes."
    
    # Keep script running
    while (-not $backendProcess.HasExited -and -not $frontendProcess.HasExited) {
        Start-Sleep -Seconds 1
    }
    
    # If we get here, one of the processes has exited
    $exitCode = if ($backendProcess.HasExited) { $backendProcess.ExitCode } else { $frontendProcess.ExitCode }
    Write-Host "A process finished (Exit Code: $exitCode)."
}
finally {
    # Cleanup will be called by the finally block
    Cleanup
}