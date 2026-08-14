# 需求文档

## 功能1: 多题型批阅

AS 教师, I want 支持多种题型批阅, so that 可以自动批改客观题和部分主观题。

### 验收标准
1. WHEN 系统接收作业, the system SHALL 解析题目类型
2. WHEN 题目是选择题, the system SHALL 比对标准答案
3. WHEN 题目是填空题, the system SHALL 比对填空答案
4. WHEN 题目是判断题, the system SHALL 比对正确/错误选项

## 功能2: 图片识别
AS 教师, I want 上传作业图片, so that 可以自动识别手写答案。
1. WHEN 用户上传图片, the system SHALL 接收图片文件
2. WHEN 图片包含文字, the system SHALL 识别文字内容
3. IF 识别失败, the system SHALL 提示用户重新上传

## 功能3: AI智能批阅
AS 教师, I want 使用AI批阅主观题, so that 可以获得智能评分和评语。
1. WHEN 题目是主观题, the system SHALL 调用AI服务
2. WHEN AI返回结果, the system SHALL 解析评分和评语
3. IF AI服务不可用, the system SHALL 降级到规则批阅

## 功能4: 成绩统计
AS 教师, I want 查看批阅统计, so that 可以了解班级整体情况。
1. WHEN 批阅完成, the system SHALL 生成统计报告
2. WHEN 查看统计, the system SHALL 显示正确率和平均分

## 功能5: 作业管理
AS 教师, I want 管理作业, so that 可以方便地创建和查看作业。
1. WHEN 创建作业, the system SHALL 保存作业信息
2. WHEN 查看作业, the system SHALL 显示作业详情
3. WHEN 导入作业, the system SHALL 解析导入文件
