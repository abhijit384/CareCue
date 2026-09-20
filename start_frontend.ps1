#!/usr/bin/env pwsh
# CareCue Frontend Startup Script
# Starts Vite dev server on http://localhost:5173

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\frontend"

Write-Host ""
Write-Host "=== CareCue Frontend ===" -ForegroundColor Cyan
Write-Host "Starting Vite on http://localhost:5173" -ForegroundColor Green
Write-Host "API calls proxied to http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host ""

npm run dev
