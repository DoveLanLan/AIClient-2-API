@echo off
REM Windows 版本 - 切换到不同的 Provider

echo 可用的 Provider 选项：
echo.
echo 1. Claude API (官方)
echo    需要: CLAUDE_API_KEY
echo    启动: node src/api-server.js --model-provider claude-custom --claude-api-key sk-ant-xxx
echo.
echo 2. OpenAI API
echo    需要: OPENAI_API_KEY  
echo    启动: node src/api-server.js --model-provider openai-custom --openai-api-key sk-xxx
echo.
echo 3. Gemini (Google)
echo    需要: Google OAuth credentials
echo    启动: node src/api-server.js --model-provider gemini-cli-oauth
echo.
echo 4. Qwen (通义千问)
echo    需要: Qwen OAuth credentials
echo    启动: node src/api-server.js --model-provider openai-qwen-oauth
echo.
echo 示例启动命令（使用环境变量）：
echo set CLAUDE_API_KEY=sk-ant-xxx
echo node src/api-server.js --model-provider claude-custom
