# Verification script for Solana DeFi Security Monitor

Write-Host "🔍 Verifying Solana DeFi Security Monitor Setup..." -ForegroundColor Cyan
Write-Host ""

# Check MongoDB
Write-Host "Checking MongoDB..." -NoNewline
$mongoRunning = netstat -an | Select-String ":27017"
if ($mongoRunning) {
    Write-Host " ✅ MongoDB is running on port 27017" -ForegroundColor Green
} else {
    Write-Host " ❌ MongoDB is NOT running" -ForegroundColor Red
    Write-Host "   Please start MongoDB with: docker run -d -p 27017:27017 --name mongodb mongo:latest" -ForegroundColor Yellow
}

# Check Backend
Write-Host "Checking Backend API..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -ErrorAction Stop -TimeoutSec 2
    $health = $response.Content | ConvertFrom-Json
    if ($health.status -eq "healthy") {
        Write-Host " ✅ Backend is running on port 3000" -ForegroundColor Green
    } else {
        Write-Host " ⚠️ Backend is running but unhealthy" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ Backend is NOT running" -ForegroundColor Red
    Write-Host "   Start with: npm run start:dev" -ForegroundColor Yellow
}

# Check Frontend
Write-Host "Checking Frontend..." -NoNewline
$frontendPorts = @(3001, 3002, 3003, 3004, 3005)
$frontendRunning = $false
$frontendPort = 0

foreach ($port in $frontendPorts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -Method GET -ErrorAction SilentlyContinue -TimeoutSec 1
        if ($response.StatusCode -eq 200) {
            $frontendRunning = $true
            $frontendPort = $port
            break
        }
    } catch {
        # Continue to next port
    }
}

if ($frontendRunning) {
    Write-Host " ✅ Frontend is running on port $frontendPort" -ForegroundColor Green
} else {
    Write-Host " ❌ Frontend is NOT running" -ForegroundColor Red
    Write-Host "   Start with: cd dashboard && npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow

if ($mongoRunning -and $frontendRunning) {
    Write-Host "✅ System is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access the dashboard at:" -ForegroundColor Cyan
    Write-Host "http://localhost:$frontendPort" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening dashboard in browser..." -ForegroundColor Green
    Start-Process "http://localhost:$frontendPort"
} else {
    Write-Host "⚠️ System is not fully operational" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick Start Commands:" -ForegroundColor Cyan
    Write-Host "1. Start MongoDB (if not running):" -ForegroundColor Yellow
    Write-Host "   docker run -d -p 27017:27017 --name mongodb mongo:latest" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Start Backend (in root directory):" -ForegroundColor Yellow
    Write-Host "   npm run start:dev" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Start Frontend (in new terminal):" -ForegroundColor Yellow
    Write-Host "   cd dashboard" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"