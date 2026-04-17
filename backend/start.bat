@echo off
title NeuroDesk AI - Backend Server
echo.
echo ============================================
echo   NeuroDesk AI - Backend Launcher
echo ============================================
echo.

REM Activate virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo [OK] Virtual environment activated.
) else (
    echo [WARNING] No venv found. Run setup.bat first or install deps manually.
    echo           pip install -r requirements.txt
)

echo.
echo Starting Flask server on http://127.0.0.1:5000 ...
echo Press Ctrl+C to stop.
echo.
python app.py

pause
