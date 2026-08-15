#!/bin/bash
# 启动全栈 AI 社区：后端(3001) + 前端(5173)
set -e

cd "$(dirname "$0")"

cd backend
npm install --no-audit --no-fund
npm start &
BACKEND_PID=$!

cd ../frontend
npm install --no-audit --no-fund
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
