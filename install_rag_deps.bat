@echo off
echo Installing RAG dependencies for Manufacturing ICP...
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install chromadb and aiohttp
echo Installing chromadb...
pip install chromadb>=0.4.0

echo Installing aiohttp...
pip install aiohttp>=3.9.0

echo.
echo Installation complete!
echo.
echo Press any key to exit...
pause > nul
