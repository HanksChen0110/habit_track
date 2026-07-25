@echo off
cd /d "%~dp0"
echo Starting Xunji...
echo Keep this window open while using the app.
pnpm dev --host 127.0.0.1 --port 5173 --open
echo.
echo The local server has stopped.
pause
