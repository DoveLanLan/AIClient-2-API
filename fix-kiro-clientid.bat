@echo off
REM Quick fix for missing clientId and clientSecret
REM 快速修复缺失的 clientId 和 clientSecret

echo ============================================================
echo Kiro ClientId/ClientSecret Fix Tool
echo Kiro clientId/clientSecret 修复工具
echo ============================================================
echo.

echo This tool will automatically merge your token files.
echo 此工具将自动合并你的 token 文件。
echo.
echo What it does / 功能说明:
echo   1. Read kiro-auth-token.json
echo      读取 kiro-auth-token.json
echo   2. Find the client credentials file using clientIdHash
echo      使用 clientIdHash 找到 client 凭证文件
echo   3. Merge clientId and clientSecret into kiro-auth-token.json
echo      将 clientId 和 clientSecret 合并到 kiro-auth-token.json
echo.

pause

echo.
echo Running merge tool / 运行合并工具...
echo ------------------------------------------------------------
node merge-kiro-tokens.js

echo.
echo.
echo Verification / 验证...
echo ------------------------------------------------------------
node diagnose-kiro-auth.js

echo.
echo ============================================================
echo Done! / 完成！
echo ============================================================
echo.
echo If successful, restart your server with:
echo 如果成功，请使用以下命令重启服务器:
echo.
echo   node src/api-server.js --model-provider claude-kiro-oauth
echo.

pause
