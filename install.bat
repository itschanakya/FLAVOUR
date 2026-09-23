@echo off
echo Installing Backend dependencies...
cd backend
call npm install
cd ..

echo Installing Frontend dependencies...
cd frontend
call npm install
cd ..

echo All dependencies installed successfully!
pause
