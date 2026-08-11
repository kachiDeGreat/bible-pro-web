#!/bin/bash
echo "=============================================="
echo "      Starting Bible Song Pro (Local)"
echo "=============================================="

cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed on this computer!"
    echo "Please download and install Node.js from https://nodejs.org/"
    echo "Once installed, double-click this file again."
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ]; then
    echo "[INFO] First time setup: Installing dependencies..."
    echo "This might take a minute or two..."
    npm install
fi

echo "[INFO] Starting the local server..."
echo "[INFO] A browser window should open automatically."
echo "[INFO] Keep this window open while using the software."
echo "=============================================="

npm run dev
