#!/usr/bin/env bash

set -euo pipefail

# 项目根目录（脚本位于 scripts/ 下）
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"

LOG_DIR="$ROOT_DIR/dev-logs"
BACKEND_DIR="$ROOT_DIR/backend"
CRAWLER_DIR="$ROOT_DIR/task_control"

# 端口（用于兜底关闭）
# 后端端口优先读取 backend/.env 的 PORT
BACKEND_PORT_DEFAULT=3000
if [ -f "$BACKEND_DIR/.env" ]; then
  env_port=$(grep -E '^\s*PORT\s*=' "$BACKEND_DIR/.env" | tail -n 1 | sed -E 's/^\s*PORT\s*=\s*//;s/"//g;s/\s*$//')
  if [[ "$env_port" =~ ^[0-9]+$ ]]; then
    BACKEND_PORT_DEFAULT="$env_port"
  fi
fi

FRONTEND_PORTS=(5173 5777)
CRAWLER_PORT=8009

echo "============================================================"
echo " 一键关闭前端、后端、爬虫进程"
echo " Root: $ROOT_DIR"
echo " Logs: $LOG_DIR"
echo "============================================================"

kill_by_pid_file() {
  local name="$1" pid_file="$2"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "[停止] $name 进程 pid=$pid (来自 $pid_file)"
      # 先尝试优雅终止
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      # 终止可能的子进程（macOS 提供 pgrep）
      if command -v pgrep >/dev/null 2>&1; then
        for cpid in $(pgrep -P "$pid" 2>/dev/null || true); do
          kill "$cpid" >/dev/null 2>&1 || true
        done
      fi
      # 如果仍在运行，强制结束
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill -9 "$pid" >/dev/null 2>&1 || true
      fi
    else
      echo "[跳过] $name 无活动进程或 pid 文件为空：$pid_file"
    fi
  else
    echo "[跳过] 未找到 $name 的 pid 文件：$pid_file"
  fi
}

kill_by_port() {
  local name="$1" port="$2"
  local pids
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [ -n "${pids:-}" ]; then
    echo "[停止] 通过端口关闭 $name :$port (pids: $pids)"
    echo "$pids" | xargs -I{} kill {} >/dev/null 2>&1 || true
    sleep 1
    # 仍在则强制
    pids="$(lsof -ti :"$port" 2>/dev/null || true)"
    if [ -n "${pids:-}" ]; then
      echo "$pids" | xargs -I{} kill -9 {} >/dev/null 2>&1 || true
    fi
  else
    echo "[跳过] 端口 :$port 未被占用（$name）"
  fi
}

echo "[步骤] 优先通过 pid 文件关闭"
kill_by_pid_file "后端"   "$LOG_DIR/backend.pid"
kill_by_pid_file "爬虫"   "$LOG_DIR/crawler.pid"
kill_by_pid_file "前端"   "$LOG_DIR/frontend.pid"

echo "[步骤] 兜底：通过端口关闭残留进程"
kill_by_port "后端" "$BACKEND_PORT_DEFAULT"
kill_by_port "爬虫" "$CRAWLER_PORT"
for fp in "${FRONTEND_PORTS[@]}"; do
  kill_by_port "前端" "$fp"
done

echo "[检查] 当前端口占用："
for p in "$BACKEND_PORT_DEFAULT" "$CRAWLER_PORT" "${FRONTEND_PORTS[@]}"; do
  if lsof -i :"$p" >/dev/null 2>&1; then
    echo " - 端口 $p 仍有进程："
    lsof -nP -iTCP:"$p" -sTCP:LISTEN || true
  else
    echo " - 端口 $p 已空闲"
  fi
done

echo "[完成] 已尝试关闭所有服务。"