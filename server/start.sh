#!/bin/zsh
# 习惯星球同步服务器启动脚本
# 自动查找 node，无需单独安装

NODE=""

if command -v node >/dev/null 2>&1; then
  NODE="node"
elif [ -x "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node" ]; then
  NODE="/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node"
elif [ -x "/usr/local/bin/node" ]; then
  NODE="/usr/local/bin/node"
elif [ -x "/opt/homebrew/bin/node" ]; then
  NODE="/opt/homebrew/bin/node"
fi

if [ -z "$NODE" ]; then
  echo "❌ 未找到 Node.js"
  echo ""
  echo "请选择以下方式之一："
  echo "  1. 安装 Node.js：https://nodejs.org （推荐 LTS 版）"
  echo "  2. 安装 Homebrew 后运行：brew install node"
  echo ""
  exit 1
fi

DIR="${0:A:h}"
echo "使用 Node: $NODE ($($NODE --version))"
echo "启动同步服务..."
exec "$NODE" "$DIR/server.js"
