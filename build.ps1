# Build script for Terminal Tab Firefox Extension (Windows PowerShell)
# Usage: .\build.ps1

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Terminal Tab - Build Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js and npm
Write-Host "Checking Node.js and npm..." -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
if ($null -eq $nodeVersion) {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js v18.0.0 or higher from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green

$npmVersion = npm --version 2>$null
if ($null -eq $npmVersion) {
    Write-Host "ERROR: npm is not installed. Please install npm v9.0.0 or higher." -ForegroundColor Red
    exit 1
}
Write-Host "✓ npm: $npmVersion" -ForegroundColor Green

Write-Host ""
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Building Firefox extension..." -ForegroundColor Yellow
npm run package:extension

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✓ Build completed successfully!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

$xpiPath = Get-ChildItem -Filter "terminal-tab-*.xpi" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($xpiPath) {
    Write-Host "Extension package created at:" -ForegroundColor Green
    Write-Host "  $(Get-Location)\$($xpiPath.Name)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ready to submit to Mozilla Add-ons!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not find .xpi file" -ForegroundColor Yellow
}
