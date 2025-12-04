@echo off
echo ========================================
echo   AI Recruiter - Starting Application
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies if needed
echo Checking dependencies...
pip install -q -r requirements.txt
echo.

REM Run the application
echo Starting Flask server...
echo.
echo Application will be available at: http://localhost:5000
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

python app.py

pause
