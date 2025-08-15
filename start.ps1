# PowerShell script to start both services
Write-Host "Starting Solana DeFi Security Monitor..." -ForegroundColor Green
Write-Host ""

# Check if MongoDB is running
$mongoRunning = netstat -an | Select-String ":27017"
if (-not $mongoRunning) {
    Write-Host "MongoDB is not running. Please start MongoDB first!" -ForegroundColor Red
    Write-Host "Run: docker run -d -p 27017:27017 --name mongodb mongo:latest" -ForegroundColor Yellow
    Write-Host "Or install MongoDB locally" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "MongoDB detected on port 27017" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run start:dev" -PassThru

# Wait a moment for backend to initialize
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "Starting Frontend Dashboard..." -ForegroundColor Cyan
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\dashboard'; npm run dev" -PassThru

Write-Host ""
Write-Host "========================================"  -ForegroundColor Yellow
Write-Host "Services are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening dashboard in browser..." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:3001"
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit this window"