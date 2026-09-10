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
echo [1/6] Stopping running app...
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
echo [2/6] Saving local changes...
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

:: Send Slack notification (if SLACK_WEBHOOK_URL environment variable is set)
if defined SLACK_WEBHOOK_URL (
    echo     Sending Slack notification...
    powershell -Command "& { $body = @{ text = '✅ Vending machine code updated successfully on %COMPUTERNAME%' }; Invoke-RestMethod -Uri '%SLACK_WEBHOOK_URL%' -Method Post -Body ($body | ConvertTo-Json) }"
)

:: Step 3: Install any new dependencies
echo [3/6] Installing dependencies...
call npm install

:: Step 4: Clean old build and rebuild
echo [4/6] Cleaning build cache...
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

:: Step 5: Start the app in a separate window (keeps server alive)
echo [5/6] Starting the app...
start "LeafWater Vending" cmd /k "cd /d ""%~dp0"" && set PORT=3002&& npm run start"

:: Wait until localhost:3002 responds
echo     Waiting for server on port 3002...
set /a tries=0
:wait_server
set /a tries+=1
if %tries% gtr 60 (
    echo.
    echo ERROR: Server did not become ready in time.
    echo.
    pause
    exit /b 1
)
timeout /t 3 /nobreak >nul
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3002' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -ge 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel% neq 0 goto wait_server
echo     Server is ready.

:: Step 6: Push full 60-slot inventory to Make webhook after deploy
echo [6/6] Sending full 60-slot inventory webhook...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3002/api/cron/deploy-slot-inventory' -UseBasicParsing -TimeoutSec 60; Write-Host $r.Content; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 (
    echo     WARNING: Inventory webhook call failed. Check server logs / Make hook.
) else (
    echo     Full 60-slot inventory webhook sent (deploy_sync).
)

echo.
echo ============================================
echo   UPDATE COMPLETE - Opening browser...
echo ============================================
echo.
start "" http://localhost:3002
echo Server is running in the "LeafWater Vending" window.
echo.
pause
