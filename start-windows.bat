@echo off
echo ==============================================
echo       Starting Bible Song Pro (Local)
echo ==============================================

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install Node.js from https://nodejs.org/
    echo Once installed, double-click this file again.
    pause
    exit /b
)

:: Check if node_modules exists, if not run npm install
if not exist "node_modules\" (
    echo [INFO] First time setup: Installing dependencies...
    echo This might take a minute or two...
    call npm install
)

echo [INFO] Starting the local server...
echo [INFO] A browser window should open automatically.
echo [INFO] Keep this window open while using the software.
echo ==============================================

call npm run dev
pause
