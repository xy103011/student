@echo off
chcp 65001 >nul
title 智能作业批阅平台 - 安装说明

echo ========================================
echo   智能作业批阅平台 安装说明
echo ========================================
echo.
echo 使用方法:
echo 1. 双击 "启动.bat" 运行程序
echo.
echo 2. 首次运行可能需要安装 .NET 8.0 运行时:
echo    下载地址: https://dotnet.microsoft.com/download/dotnet/8.0
echo    选择 "Windows Desktop Runtime - x64" 版本
echo.
echo 3. 运行所需文件:
echo    - SmartGrader.exe (主程序)
echo    - 所有 DLL 文件 (依赖库)
echo    - e_sqlite3.dll (SQLite 数据库引擎)
echo.
echo ========================================
echo.
pause
