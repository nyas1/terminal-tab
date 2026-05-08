#!/bin/bash
# Build script for Terminal Tab Firefox Extension
# Usage: ./build.sh

set -e  # Exit on error

echo "================================"
echo "Terminal Tab - Build Script"
echo "================================"
echo ""

# Check Node.js and npm
echo "Checking Node.js and npm..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js v18.0.0 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✓ Node.js: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed. Please install npm v9.0.0 or higher."
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✓ npm: $NPM_VERSION"

echo ""
echo "Step 1: Installing dependencies..."
npm install

echo ""
echo "Step 2: Building Firefox extension..."
npm run package:extension

echo ""
echo "================================"
echo "✓ Build completed successfully!"
echo "================================"
echo ""
echo "Extension package created at:"
echo "  $(pwd)/terminal-tab-2.0.2.xpi"
echo ""
echo "Ready to submit to Mozilla Add-ons!"
