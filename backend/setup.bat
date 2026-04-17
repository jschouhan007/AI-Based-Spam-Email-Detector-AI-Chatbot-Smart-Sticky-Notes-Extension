@echo off
echo ============================================
echo   NeuroDesk AI - First Time Setup
echo ============================================
echo.

REM Create virtual environment
python -m venv venv
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Copy env file if not present
if not exist .env (
    copy .env.example .env
    echo.
    echo [ACTION REQUIRED] Open backend\.env and paste your Groq API key.
    echo Get a free key at: https://console.groq.com
    echo.
)

REM Train the spam model
echo.
echo Training spam detection model...
python train_model.py

echo.
echo ============================================
echo   Setup complete! Run start.bat to launch.
echo ============================================
pause
