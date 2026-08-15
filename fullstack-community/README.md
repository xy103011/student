# 全栈 AI 社区

一个面向「全栈」AI 软件的社区网站，功能完整的社区平台。

## 技术栈

- 前端：React 18 + Vite 5 + React Router 6 + Axios + socket.io-client + react-markdown
- 后端：Node.js 22 + Express 4 + 内置 `node:sqlite` + socket.io
- 认证：JWT + bcryptjs

## 功能

- 用户注册 / 登录 / 退出（JWT，第一个注册用户自动成为管理员）
- 发布、编辑、删除帖子（Markdown 编辑器 + 实时预览）
- 评论与回复（支持嵌套），删除评论
- 帖子点赞 / 取消点赞
- 关注 / 取消关注，粉丝与关注列表，关注流
- 通知中心（被关注、被评论、被回复、被点赞，未读数角标）
- 在线聊天室（公共频道 + 一对一私聊，WebSocket 实时，消息持久化）
- 标签分类、全文搜索、最新/最热排序、分页
- 个人主页、编辑个人简介、私聊入口
- 深色 / 浅色主题切换（持久化）
- 管理员面板（数据统计、用户封禁/解封、角色管理、删除用户/帖子）

## 目录结构

```
backend/   Node + Express + SQLite + socket.io 后端（端口 3001）
frontend/  React + Vite 前端（端口 5173，/api 与 /socket.io 反向代理到后端）
start.sh   一键启动脚本
```

## 本地运行

```bash
# 后端
cd backend && npm install && npm start

# 前端
cd frontend && npm install && npm run dev
```

或使用 `bash start.sh`。

前端访问 http://localhost:5173。

## 角色说明

- 系统注册的第一个用户自动成为「管理员」。
- 管理员可在顶部导航的「管理」入口进入管理面板，封禁/解封用户、授予/撤销管理员、删除违规内容。

## 接口概览

- `POST /api/auth/register` 注册
- `POST /api/auth/login` 登录
- `GET  /api/auth/me` 当前用户
- `GET  /api/posts` 帖子列表（page/pageSize/tag/search/userId/sort）
- `GET  /api/posts/feed` 关注流（需登录）
- `GET/POST/PUT/DELETE /api/posts/:id` 帖子详情/创建/编辑/删除
- `POST /api/posts/:id/like` 点赞切换
- `GET/POST /api/posts/:id/comments` 评论列表/发表（支持 parentId 回复）
- `DELETE /api/posts/:id/comments/:commentId` 删除评论
- `GET /api/users/:id` 用户主页（含关注/粉丝统计）
- `PUT /api/users/me` 更新简介
- `POST /api/users/:id/follow` 关注切换
- `GET /api/users/:id/followers` / `following` 粉丝/关注列表
- `GET /api/notifications` 通知列表
- `GET /api/notifications/unread-count` 未读数
- `PUT /api/notifications/:id/read` / `/read-all` 标记已读
- `GET /api/messages/history` 聊天历史（?with= 私聊）
- `GET /api/messages/conversations` 私聊会话列表
- `GET /api/admin/stats` 统计
- `GET /api/admin/users` / `posts` 管理列表
- `PUT /api/admin/users/:id/ban|unban|role` 封禁/解封/角色
- `DELETE /api/admin/users/:id` / `posts/:id` 删除
- WebSocket `/socket.io` 聊天（公共频道 + 私聊）
