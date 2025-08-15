@echo off
echo Starting Solana Security Monitor Platform...
echo.

echo [1/2] Starting Backend Server (Port 3000)...
start "Backend Server" cmd /k "cd /d %~dp0 && npm run start:dev"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo [2/2] Starting Dashboard (Port 3001)...
start "Dashboard" cmd /k "cd /d %~dp0dashboard && npm run dev"

echo.
echo ==========================================
echo Platform Started Successfully!
echo ==========================================
echo.
echo Backend API: http://localhost:3000
echo Dashboard:   http://localhost:3001
echo.
echo Press any key to open the dashboard in your browser...
pause > nul
start http://localhost:3001