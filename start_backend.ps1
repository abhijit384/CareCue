#!/usr/bin/env pwsh
# CareCue Backend Startup Script
# Starts FastAPI on http://127.0.0.1:8000

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host ""
Write-Host "=== CareCue Backend ===" -ForegroundColor Cyan
Write-Host "Starting FastAPI on http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "API docs at http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host ""

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
