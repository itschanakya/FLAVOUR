@echo off
echo Starting NCC Refreshment System...

start "Backend Server" cmd /k "start-backend.bat"
start "Frontend Server" cmd /k "start-frontend.bat"

echo Applications are starting in separate windows.
