@echo off
cd /d "%~dp0"
set NODE_ENV=production
set PORT=3001
call npx next start -p 3001