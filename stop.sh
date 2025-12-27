#!/bin/bash

# ============================================
# 停止单词连连看游戏服务器
# ============================================

echo "🛑 停止单词连连看服务器"
echo "=================================="
echo ""

# 查找占用8000端口的进程
PORT=8000
PID=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PID" ]; then
    echo "❌ 没有找到运行在端口 $PORT 的服务器"
    echo ""
    exit 0
fi

echo "📍 找到进程 PID: $PID"
echo ""

# 停止进程
echo "🔄 正在停止服务器..."
kill -9 $PID 2>/dev/null

# 等待一下确保进程已停止
sleep 1

# 再次检查
PID_CHECK=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PID_CHECK" ]; then
    echo "✅ 服务器已成功停止"
else
    echo "⚠️  服务器可能未完全停止，请手动检查"
fi

echo ""
echo "=================================="
echo "👋 完成"
