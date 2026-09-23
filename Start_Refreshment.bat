@echo off
echo Starting Refreshment App...

:: Start the backend in a new window
start "Refreshment Backend" cmd /c "cd /d E:\SOFTWARES\REFRESHMENT\backend && npm start"

:: Start the frontend in a new window
start "Refreshment Frontend" cmd /c "cd /d E:\SOFTWARES\REFRESHMENT\frontend && npm run dev"

:: Wait a few seconds to let servers start
ping -n 4 127.0.0.1 >nul

