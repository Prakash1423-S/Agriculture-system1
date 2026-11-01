# AgriMitra PowerShell Launcher
$ErrorActionPreference = "SilentlyContinue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting AgriMitra Platform..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptDir\backend\server.ps1`"" -WindowStyle Minimized
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8080/"
Write-Host "AgriMitra launched at http://127.0.0.1:8080/" -ForegroundColor Cyan
