@echo off
chcp 65001 >nul
title 智能作业批阅平台 - 卸载

echo ========================================
echo   智能作业批阅平台 卸载
echo ========================================
echo.

REM Delete program files
echo 正在删除程序文件...
rmdir /s /q "%ProgramFiles%\SmartGrader" 2>nul
rmdir /s /q "%ProgramFiles(x86)%\SmartGrader" 2>nul

REM Delete start menu shortcut
echo 正在删除开始菜单快捷方式...
rmdir /s /q "%ProgramData%\Microsoft\Windows\Start Menu\Programs\智能作业批阅平台" 2>nul
rmdir /s /q "%AppData%\Microsoft\Windows\Start Menu\Programs\智能作业批阅平台" 2>nul

REM Delete registry entries
echo 正在清理注册表...
reg delete "HKCU\Software\SmartGrader" /f 2>nul
reg delete "HKLM\SOFTWARE\SmartGrader" /f 2>nul

echo.
echo 卸载完成!
echo.
pause
