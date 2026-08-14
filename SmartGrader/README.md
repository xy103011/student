# 智能作业批阅平台 - 完整功能实现

## 已完成功能

### 1. 多题型批阅
- 选择题批阅（支持大小写不敏感匹配）
- 填空题批阅（精确匹配）
- 判断题批阅（正确/错误匹配）
- 简答题批阅（支持AI智能评分）

### 2. 图片识别
- 支持图片上传和预览
- 图片格式转换和压缩
- OCR文字识别（基于Tesseract）
- 手写答案识别

### 3. AI智能批阅
- 集成Azure OpenAI API
- 主观题自动评分
- 自动生成评语
- 支持多种AI模型

### 4. 成绩统计分析
- 班级成绩统计（平均分、最高分、最低分、及格率）
- 题目正确率分析
- 批阅历史记录查询
- 成绩趋势图表

### 5. 作业管理
- 作业创建和编辑
- 作业导入导出
- 作业列表查看
- 作业状态管理

### 6. 学生管理
- 学生信息录入
- 学生批量导入
- 学生列表管理
- 班级关联

### 7. 系统设置
- AI服务配置
- 数据库备份恢复
- 系统参数设置

## 项目结构

```
SmartGrader/
├── SmartGrader.Desktop/      # WPF主应用程序
│   ├── Views/               # 用户界面视图
│   │   ├── AssignmentsView.xaml    # 作业管理界面
│   │   ├── GradingView.xaml        # 批阅界面
│   │   ├── StudentsView.xaml       # 学生管理界面
│   │   ├── StatisticsView.xaml     # 成绩统计界面
│   │   ├── ClassStatsView.xaml     # 班级统计界面
│   │   └── SettingsView.xaml       # 系统设置界面
│   └── ViewModels/          # 视图模型
│       └── MainViewModel.cs    # 主视图模型
├── SmartGrader.Core/        # 核心业务逻辑
│   ├── Models/              # 数据模型
│   ├── Services/            # 业务服务
│   │   ├── GradingEngine.cs # 批阅引擎
│   │   └── StatisticsService.cs # 统计服务
│   └── Interfaces/          # 接口定义
├── SmartGrader.Data/        # 数据访问层
│   ├── Database/            # 数据库配置
│   └── Repositories/        # 数据仓库
├── SmartGrader.AI/          # AI服务模块
│   └── Services/
│       └── AIService.cs     # AI批阅服务
├── SmartGrader.Image/       # 图片处理模块
│   └── Services/
│       └── ImageProcessingService.cs # 图片处理服务
└── SmartGrader.Installer/   # Windows安装包
    └── Product.wxs          # WiX安装包配置
```

## 构建说明

在Windows环境下执行：

```bash
# 1. 还原依赖
dotnet restore SmartGrader.sln

# 2. 编译
dotnet build SmartGrader.sln

# 3. 运行
dotnet run --project SmartGrader.Desktop

# 4. 发布为自包含应用
dotnet publish SmartGrader.Desktop/SmartGrader.Desktop.csproj -c Release -r win-x64 --self-contained -o ./publish
```

## 生成安装包

```bash
# 需要先安装 WiX Toolset
cd SmartGrader.Installer
candle Product.wxs
light Product.wixobj
```

## 技术栈

- **语言**: C# 12
- **框架**: .NET 8 / WPF
- **数据库**: SQLite
- **AI服务**: Azure OpenAI
- **图像处理**: ImageSharp + Tesseract OCR
- **UI框架**: CommunityToolkit.Mvvm
- **安装包**: WiX Toolset

## 运行环境要求

- Windows 10/11
- .NET 8 Runtime（如果使用自包含发布）
- 可选：Azure OpenAI API Key（用于AI批阅）
