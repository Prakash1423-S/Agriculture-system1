@echo off
title AgriMitra - Digital Agriculture Intelligence Platform
color 0A
echo =========================================================================
echo    AgriMitra (KrishiSeva) - Agricultural Intelligence Platform
echo    Empowering Indian Farmers across all 28 States and 8 UTs
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting AgriMitra Native PowerShell REST API Server on port 8080...
start "AgriMitra Backend Server" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend\server.ps1" -Port 8080

echo [2/3] Waiting for server initialization...
timeout /t 2 /nobreak >nul

echo [3/3] Opening AgriMitra Web Application in your default browser...
start http://127.0.0.1:8080/

echo.
echo =========================================================================
echo  Application is running!
echo  URL: http://127.0.0.1:8080/
echo  To shut down, close the 'AgriMitra Backend Server' terminal window.
echo =========================================================================
pause
