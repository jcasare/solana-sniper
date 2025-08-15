@echo off
echo Starting Solana DeFi Security Monitor...
echo.

REM Check if MongoDB is running
netstat -an | findstr :27017 >nul
if %errorlevel% neq 0 (
    echo MongoDB is not running. Please start MongoDB first!
    echo Run: docker run -d -p 27017:27017 --name mongodb mongo:latest
    echo Or install MongoDB locally
    pause
    exit /b 1
)

echo MongoDB detected on port 27017
echo.

echo Starting Backend Server...
start /B cmd /c "cd /d %~dp0 && npm run start:dev"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Dashboard...
start /B cmd /c "cd /d %~dp0dashboard && npm run dev"

echo.
echo ========================================
echo Services are starting...
echo.
echo Backend:   http://localhost:3000
echo Frontend:  http://localhost:3001
echo.
echo Press Ctrl+C in each window to stop
echo ========================================
echo.

pause