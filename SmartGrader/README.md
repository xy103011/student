# 智能作业批阅平台

一个基于Windows桌面应用的智能作业批改系统，支持多种题型的自动批阅、图片识别和AI智能批阅功能。

## 功能特性

- 支持选择题、填空题、判断题、简答题等多种题型
- 图片上传和OCR文字识别
- AI智能批阅主观题
- 成绩统计和分析
- 数据本地存储

## 技术栈

- C# 12 / .NET 8
- WPF 桌面框架
- SQLite 本地数据库
- Azure OpenAI API
- ImageSharp 图像处理

## 快速开始

```bash
# 还原依赖
dotnet restore

# 编译项目
dotnet build

# 运行程序
dotnet run --project SmartGrader.Desktop
```

## 构建安装包

```bash
# 发布应用
dotnet publish SmartGrader.Desktop -c Release -r win-x64 --self-contained

# 创建安装包（需要WiX Toolset）
candle Product.wxs
light Product.wixobj
```

## 项目结构

```
SmartGrader/
├── SmartGrader.Desktop/     # WPF主应用程序
├── SmartGrader.Core/        # 核心业务逻辑
├── SmartGrader.Data/        # 数据访问层
├── SmartGrader.AI/          # AI服务模块
├── SmartGrader.Image/       # 图片处理模块
└── SmartGrader.Installer/   # 安装包项目
```
