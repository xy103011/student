# 开发指南

## 环境要求

- Windows 10/11
- .NET 8 SDK
- Visual Studio 2022 或 JetBrains Rider
- WiX Toolset (用于打包)

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd SmartGrader
```

### 2. 还原依赖
```bash
dotnet restore
```

### 3. 编译项目
```bash
dotnet build
```

### 4. 运行程序
```bash
dotnet run --project SmartGrader.Desktop
```

## 项目结构说明

| 目录 | 说明 |
|------|------|
| SmartGrader.Desktop | WPF主应用程序 |
| SmartGrader.Core | 核心业务逻辑和模型 |
| SmartGrader.Data | 数据访问层 |
| SmartGrader.AI | AI服务模块 |
| SmartGrader.Image | 图片处理模块 |
| SmartGrader.Installer | Windows安装包 |

## 开发规范

### 命名规范
- 类名: PascalCase
- 方法名: PascalCase
- 属性名: PascalCase
- 私有字段: _camelCase
- 接口: I开头 + PascalCase

### 代码风格
- 使用花括号换行
- 缩进4个空格
- 行宽不超过120字符
- 添加必要的注释

### Git提交规范
```
feat: 新增功能
fix: 修复问题
refactor: 重构代码
docs: 更新文档
test: 添加测试
chore: 构建/工具相关
```

## 构建与发布

### 发布为自包含应用
```bash
dotnet publish SmartGrader.Desktop -c Release -r win-x64 --self-contained -o ./publish
```

### 创建安装包
```bash
# 编译发布版本
dotnet publish SmartGrader.Desktop -c Release -r win-x64 --self-contained

# 使用WiX创建安装包
candle SmartGrader.Installer/Product.wxs
light SmartGrader.Installer/Product.wixobj
```

## 常见任务

### 添加新题型
1. 在 Question 模型中添加题型枚举
2. 在 GradingEngine 中添加对应判断逻辑
3. 更新界面支持新题型输入

### 配置AI服务
编辑 `appsettings.json`:
```json
{
  "AI": {
    "ApiKey": "your-api-key",
    "BaseUri": "https://your-endpoint.openai.azure.com/",
    "Model": "gpt-4"
  }
}
```

### 数据库迁移
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```
