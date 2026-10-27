@echo off
rem Doble clic para abrir VELT en Chrome y ver el QR para el movil (Expo Go).
cd /d "%~dp0"
call npx.cmd expo start --web
pause
