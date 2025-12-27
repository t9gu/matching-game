#!/bin/bash

# ============================================
# 启动单词连连看游戏项目
# ============================================

echo "🎮 单词连连看 - Nintendo风格"
echo "=================================="
echo ""

# 检测操作系统
OS="Unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="Mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="Windows"
fi

echo "📍 检测到系统: $OS"
echo ""

# 获取当前目录
CURRENT_DIR=$(pwd)
echo "📂 项目目录: $CURRENT_DIR"
echo ""

# 检测Python
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PYTHON_VERSION=$(python3 --version)
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    PYTHON_VERSION=$(python --version)
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ 错误: 未找到Python"
    echo "请先安装Python: https://www.python.org/downloads/"
    exit 1
fi

echo "✅ 找到 Python: $PYTHON_VERSION"
echo ""

# 启动服务器
PORT=8000
echo "🚀 正在启动本地服务器..."
echo "=================================="
echo ""
echo "📡 服务器地址: http://localhost:$PORT"
echo "📡 本地访问:   http://127.0.0.1:$PORT"
echo ""
echo "💡 提示:"
echo "   - 请在浏览器中打开上述地址"
echo "   - 允许摄像头权限以启用手势控制"
echo "   - 按 Ctrl+C 停止服务器"
echo ""
echo "=================================="
echo ""

# 启动Python HTTP服务器
$PYTHON_CMD -m http.server $PORT

echo ""
echo "👋 服务器已停止"
