Write-Host "Starting Solana Security Monitor Platform..." -ForegroundColor Green
Write-Host ""

Write-Host "[1/2] Starting Backend Server (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run start:dev" -WindowStyle Normal

Write-Host "Waiting for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "[2/2] Starting Dashboard (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\dashboard'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Platform Started Successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API: " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Blue
Write-Host "Dashboard:   " -NoNewline
Write-Host "http://localhost:3001" -ForegroundColor Blue
Write-Host ""
Write-Host "Press any key to open the dashboard in your browser..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "http://localhost:3001"