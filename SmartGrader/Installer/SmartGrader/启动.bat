@echo off
chcp 65001 >nul
title 智能作业批阅平台

REM Check if .NET runtime is installed
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo 正在检查 .NET 运行时...
    echo 如果应用无法启动，请访问: https://dotnet.microsoft.com/download/dotnet/8.0
    echo 下载并安装 .NET 8.0 运行时
    pause
)

REM Run the application
echo 正在启动智能作业批阅平台...
SmartGrader.exe
