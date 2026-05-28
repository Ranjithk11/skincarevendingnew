@echo off
title Vending Machine Update
color 0A

:: Use the folder where this .bat file is located
cd /d "%~dp0"

echo ============================================
echo   VENDING MACHINE - UPDATE
echo ============================================
echo.
echo Project folder: %cd%
echo.

:: Step 1: Kill any running node/next processes safely
echo [1/5] Stopping running app...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1
timeout /t 5 /nobreak >nul

:: Remove lock-prone log files
del /f /q service-out.log >nul 2>&1
del /f /q service-err.log >nul 2>&1

:: Step 2: Save local changes then force-update to latest code
echo [2/5] Saving local changes...
git add -A
git commit -m "local changes before update %date% %time%" --allow-empty
echo     Fetching latest code from git...
git fetch origin main
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Git fetch failed! Check your internet or git config.
    echo.
    pause
    exit /b 1
)
git reset --hard origin/main
echo     Code updated successfully!

:: Step 3: Install any new dependencies
echo [3/5] Installing dependencies...
call npm install

:: Step 4: Clean old build and rebuild
echo [4/5] Cleaning build cache...
rmdir /s /q .next >nul 2>&1
echo     Building the app...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed!
    echo.
    pause
    exit /b 1
)

:: Step 5: Start the app and open browser
echo [5/5] Starting the app...
echo.
echo ============================================
echo   UPDATE COMPLETE - Opening browser...
echo ============================================
echo.
start "" http://localhost:3002

:: Note: This keeps the window open keeping the server alive.
set PORT=3002
npm run start