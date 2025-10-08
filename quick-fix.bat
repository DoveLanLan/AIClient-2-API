@echo off
REM Quick Fix for Kiro 403 Error

echo ======================================
echo   Kiro Error Quick Fix Menu
echo ======================================
echo.
echo Current Status:
node check-tokens.js | findstr /C:"Valid tokens" /C:"Expired tokens"
echo.
echo ======================================
echo.
echo Choose a solution:
echo.
echo [1] Check token status (detailed)
echo [2] Search for other tokens in system
echo [3] Test Enterprise IdC (if you have 400 error)
echo [4] Switch to Claude API (need API key)
echo [5] Switch to OpenAI API (need API key)
echo [6] View all solutions (open SOLUTIONS.md)
echo [7] Exit
echo.
set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" (
    node check-tokens.js
    pause
    goto :menu
)

if "%choice%"=="2" (
    powershell -ExecutionPolicy Bypass -File find-kiro-tokens.ps1
    pause
    goto :menu
)

if "%choice%"=="3" (
    echo.
    echo Testing Enterprise IdC configuration...
    echo Opening guide: ENTERPRISE-IDC-GUIDE.md
    start ENTERPRISE-IDC-GUIDE.md
    echo.
    echo Press any key to run test...
    pause
    test-kiro-enterprise.bat
    goto :end
)

if "%choice%"=="4" (
    echo.
    set /p apikey="Enter your Claude API Key (sk-ant-...): "
    echo.
    echo Starting server with Claude API...
    node src/api-server.js --model-provider claude-custom --claude-api-key %apikey%
    goto :end
)

if "%choice%"=="5" (
    echo.
    set /p apikey="Enter your OpenAI API Key (sk-...): "
    echo.
    echo Starting server with OpenAI API...
    node src/api-server.js --model-provider openai-custom --openai-api-key %apikey%
    goto :end
)

if "%choice%"=="6" (
    start SOLUTIONS.md
    pause
    goto :menu
)

if "%choice%"=="7" (
    goto :end
)

echo Invalid choice, please try again.
pause
goto :menu

:menu
cls
goto :start

:end
echo.
echo Thank you!
