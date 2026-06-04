#!/bin/zsh
# 启动 App + 同步服务，并显示手机访问地址

NODE=""
if command -v node >/dev/null 2>&1; then
  NODE="node"
elif [ -x "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node" ]; then
  NODE="/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node"
fi

ROOT="${0:A:h}/.."
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "你的电脑IP")

echo ""
echo "🌍 习惯星球 - 局域网启动"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📱 手机浏览器打开："
echo "     http://${IP}:8766"
echo ""
echo "  💻 电脑浏览器打开："
echo "     http://localhost:8766"
echo ""
echo "  ☁️  云同步地址（手机会自动识别）："
echo "     http://${IP}:8787"
echo ""
echo "  ⚠️  手机与电脑须连接同一 WiFi"
echo "  ⚠️  关闭此终端窗口会停止服务"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动同步服务（后台）
if ! curl -s "http://localhost:8787/api/health" >/dev/null 2>&1; then
  if [ -n "$NODE" ]; then
    "$NODE" "$ROOT/server/server.js" &
    SYNC_PID=$!
    sleep 0.5
  else
    echo "⚠️  未找到 Node，云同步不可用。请先运行 server/start.sh"
  fi
else
  echo "✓ 同步服务已在运行 (8787)"
fi

# 启动 App（前台，监听所有网络接口）
echo "✓ 启动 App 服务 (8766)..."
cd "$ROOT" && python3 -m http.server 8766 --bind 0.0.0.0

# 清理
[ -n "$SYNC_PID" ] && kill $SYNC_PID 2>/dev/null
