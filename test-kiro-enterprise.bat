@echo off
REM Test script for Kiro Enterprise IdC authentication

echo ======================================
echo   Kiro Enterprise IdC Test
echo ======================================
echo.

echo [1/3] Checking token status...
node check-tokens.js
echo.

echo ======================================
echo [2/3] Token file content (redacted):
echo.
type "C:\Users\Administrator\.aws\sso\cache\kiro-auth-token.json" | findstr /V "Token"
echo.

echo ======================================
echo [3/3] Starting API server with detailed logging...
echo.
echo Press Ctrl+C to stop the server
echo.
echo Watch for these log entries:
echo   - [Token Manager] Token updated - AuthMethod: IdC
echo   - [Kiro] API Error XXX: (detailed error info)
echo.
pause

node src/api-server.js --model-provider claude-kiro-oauth --kiro-oauth-creds-file "C:\Users\Administrator\.aws\sso\cache\kiro-auth-token.json"
