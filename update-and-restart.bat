@echo off
title Vending Machine - Update & Restart
color 0A

:: Use the folder where this .bat file is located
cd /d "%~dp0"

echo ============================================
echo   VENDING MACHINE - UPDATE ^& RESTART
echo ============================================
echo.
echo Project folder: %cd%
echo.

:: Step 1: Kill any running node/next processes
echo [1/5] Stopping running app...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Step 2: Pull latest code
echo [2/5] Pulling latest code from git...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Git pull failed! Check your internet or git config.
    echo.
    pause
    exit /b 1
)

:: Step 3: Install any new dependencies
echo [3/5] Installing dependencies...
call npm install

:: Step 4: Build the app
echo [4/5] Building the app...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed!
    echo.
    pause
    exit /b 1
)

:: Step 5: Start the app
echo [5/5] Starting the app...
echo.
echo ============================================
echo   UPDATE COMPLETE - App is starting...
echo ============================================
echo.
call npm start
