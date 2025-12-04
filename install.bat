@echo off
echo ========================================
echo   AI Recruiter - Installation Script
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
    echo Virtual environment created!
    echo.
) else (
    echo [1/4] Virtual environment already exists
    echo.
)

REM Activate virtual environment
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Upgrade pip
echo [3/4] Upgrading pip...
python -m pip install --upgrade pip
echo.

REM Install PyTorch first (CPU version for better compatibility)
echo [4/4] Installing dependencies...
echo.
echo Installing PyTorch (this may take a few minutes)...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
echo.

echo Installing Flask and web dependencies...
pip install Flask==3.0.0 Flask-CORS==4.0.0 Flask-SQLAlchemy==3.1.1
echo.

echo Installing transformers...
pip install transformers==4.36.0
echo.

echo Installing other dependencies...
pip install requests==2.31.0
pip install google-api-python-client==2.108.0
pip install google-auth-httplib2==0.2.0
pip install google-auth-oauthlib==1.2.0
pip install msal==1.25.0
pip install APScheduler==3.10.4
pip install python-dotenv==1.0.0
pip install openpyxl==3.1.2
echo.

echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo You can now run the application with:
echo   python app.py
echo.
echo Or use the quick start script:
echo   run.bat
echo.
pause
