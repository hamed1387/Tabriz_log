@echo off
chcp 65001 >nul
cd /d "%~dp0.."

where py >nul 2>nul
if %errorlevel%==0 (
    echo Serving Tabriz Places at http://localhost:8000
    echo Press Ctrl+C to stop.
    py -m http.server 8000
    goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
    echo Serving Tabriz Places at http://localhost:8000
    echo Press Ctrl+C to stop.
    python -m http.server 8000
    goto :eof
)

echo Python was not found.
echo Install Python from https://www.python.org or run: npx serve .
pause
