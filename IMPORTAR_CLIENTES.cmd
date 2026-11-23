@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "scripts\importar-clientes-auth.ps1"
pause
