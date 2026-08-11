@echo off

echo       Starting Bible Song Pro (Local)...........


:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install Node.js from https://nodejs.org/
    echo Once installed, double-click this file again.
    pause
    exit /b
)

if not exist "node_modules\" (
    echo [INFO] First time setup: Installing dependencies...
    echo This might take a minute or two...
    call npm install
)

echo [INFO] Starting the local server...
echo [INFO] A browser window should open automatically with your local network IP.
echo [INFO] To access this on your phone:
echo        1. Connect your phone to the same Wi-Fi or Hotspot as this computer.
echo        2. Scan the QR code that appears below.
echo        3. Or, type the "Network" URL shown below into your phone's browser.
echo.
echo [IMPORTANT] If it doesn't load on your phone, Windows Firewall might be blocking it.
echo             When prompted, make sure to allow Node.js to communicate on "Private" AND "Public" networks.
echo             (Hotspots are often categorized as Public networks by Windows).
echo.
echo [INFO] Keep this window open while using the software.
echo ==============================================

call npm run dev
pause
