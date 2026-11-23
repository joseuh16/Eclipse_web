@echo off
title Eclipse Tech - Publicar reglas de Storage
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publicar-reglas.ps1" -Storage
echo.
pause
