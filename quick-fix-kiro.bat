@echo off
REM Quick Fix for Kiro Authentication Issues
REM Kiro 认证问题快速修复脚本

echo ============================================================
echo Kiro Authentication Quick Fix / Kiro 认证快速修复
echo ============================================================
echo.

echo Step 1: Running Diagnostic Tool / 第1步：运行诊断工具
echo ------------------------------------------------------------
node diagnose-kiro-auth.js
echo.

echo.
echo Step 2: Do you want to fix the configuration? / 第2步：是否修复配置？
echo ------------------------------------------------------------
echo Press any key to continue with configuration fix...
pause >nul

node fix-kiro-config.js

echo.
echo ============================================================
echo Fix Complete / 修复完成
echo ============================================================
echo.
echo Next Steps / 下一步:
echo   1. Review the diagnosis output above / 查看上面的诊断输出
echo   2. Check KIRO-ERROR-GUIDE.md for detailed solutions / 查看详细解决方案
echo   3. Restart your server / 重启服务器
echo.
echo For more help, see: / 更多帮助，请查看:
echo   - KIRO-ERROR-GUIDE.md
echo   - FIX-403-README.md
echo.

pause
