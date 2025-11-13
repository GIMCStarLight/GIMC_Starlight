#!/usr/bin/env bash

set -euo pipefail

# 项目根目录（脚本位于 scripts/ 下）
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"

# 子项目路径
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
CRAWLER_DIR="$ROOT_DIR/task_control"

# 日志目录
LOG_DIR="$ROOT_DIR/dev-logs"
mkdir -p "$LOG_DIR"

# 端口配置（可通过环境变量覆盖）
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
CRAWLER_PORT="${CRAWLER_PORT:-8009}"

# 选项：是否跳过依赖安装（默认不跳过）
SKIP_INSTALL="${SKIP_INSTALL:-false}"

print_header() {
  echo "============================================================"
  echo " 一键本地启动前端、后端、爬虫开发环境"
  echo " Root: $ROOT_DIR"
  echo " Logs: $LOG_DIR"
  echo " Ports: frontend=$FRONTEND_PORT backend=$BACKEND_PORT crawler=$CRAWLER_PORT"
  echo "============================================================"
}

check_cmd() {
  local cmd="$1" msg="${2:-}"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[缺失] $cmd 未安装。$msg"
    return 1
  fi
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -i ":$port" >/dev/null 2>&1 && return 0 || return 1
  else
    (nc -z localhost "$port" >/dev/null 2>&1) && return 0 || return 1
  fi
}

wait_for_port() {
  local port="$1" name="$2" timeout="${3:-20}"
  echo "[等待] $name 启动中，端口 $port ..."
  local start_ts="$(date +%s)"
  while ! port_in_use "$port"; do
    sleep 1
    local now="$(date +%s)"
    if (( now - start_ts > timeout )); then
      echo "[超时] $name 端口 $port 未监听，请检查日志。"
      return 1
    fi
  done
  echo "[就绪] $name 端口 $port 已监听。"
}

ensure_node_env() {
  check_cmd node "请安装 Node.js >= 18" || exit 1
  check_cmd pnpm "请安装 pnpm：npm i -g pnpm" || exit 1
}

ensure_python_env() {
  check_cmd python3 "请安装 Python3" || exit 1
  check_cmd pip3 "请安装 pip3" || exit 1

  # 使用 task_control 私有虚拟环境
  if [ ! -d "$CRAWLER_DIR/.venv" ]; then
    echo "[Python] 创建虚拟环境 $CRAWLER_DIR/.venv"
    (cd "$CRAWLER_DIR" && python3 -m venv .venv)
  fi
  # shellcheck disable=SC1091
  source "$CRAWLER_DIR/.venv/bin/activate"

  if [ "$SKIP_INSTALL" != "true" ]; then
    echo "[Python] 升级 pip & 安装依赖"
    python -m pip install --upgrade pip >/dev/null 2>&1 || true
    # 根依赖（如 pandas/numpy/psycopg2）
    if [ -f "$ROOT_DIR/requirements.txt" ]; then
      pip install -r "$ROOT_DIR/requirements.txt"
    fi
    # REST API 所需依赖
    pip install fastapi uvicorn pydantic requests
  fi
}

start_backend() {
  echo "[启动] 后端 (NestJS) -> 端口 $BACKEND_PORT"
  local log="$LOG_DIR/backend.log"
  if [ "$SKIP_INSTALL" != "true" ]; then
    (cd "$BACKEND_DIR" && pnpm install)
  fi
  (
    cd "$BACKEND_DIR"
    PORT="$BACKEND_PORT" FRONTEND_ORIGIN="http://localhost:$FRONTEND_PORT" pnpm run start:dev
  ) >"$log" 2>&1 &
  BACKEND_PID=$!
  echo "$BACKEND_PID" > "$LOG_DIR/backend.pid"
  wait_for_port "$BACKEND_PORT" "后端" 60
  echo "[日志] 后端日志 -> $log"
}

start_frontend() {
  echo "[启动] 前端 (Vite) -> 端口 $FRONTEND_PORT"
  local log="$LOG_DIR/frontend.log"
  if [ "$SKIP_INSTALL" != "true" ]; then
    (cd "$FRONTEND_DIR" && pnpm install)
  fi
  (
    cd "$FRONTEND_DIR"
    VITE_API_BASE_URL="http://localhost:$BACKEND_PORT" \
    VITE_CRAWLER_API_BASE_URL="http://localhost:$CRAWLER_PORT/api/v1" \
    pnpm run dev -- --port "$FRONTEND_PORT"
  ) >"$log" 2>&1 &
  FRONTEND_PID=$!
  echo "$FRONTEND_PID" > "$LOG_DIR/frontend.pid"
  wait_for_port "$FRONTEND_PORT" "前端" 60
  echo "[日志] 前端日志 -> $log"
}

start_crawler() {
  echo "[启动] 爬虫 REST API (FastAPI) -> 端口 $CRAWLER_PORT"
  local log="$LOG_DIR/crawler.log"
  ensure_python_env
  (
    cd "$CRAWLER_DIR/entrypoints"
    python restful_api_server.py --reload --port "$CRAWLER_PORT"
  ) >"$log" 2>&1 &
  CRAWLER_PID=$!
  echo "$CRAWLER_PID" > "$LOG_DIR/crawler.pid"
  wait_for_port "$CRAWLER_PORT" "爬虫API" 60
  echo "[日志] 爬虫日志 -> $log"
}

cleanup() {
  echo "\n[清理] 收到退出信号，停止所有服务..."
  for name in BACKEND_PID FRONTEND_PID CRAWLER_PID; do
    pid="${!name:-}"
    if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "[停止] 进程 $name=$pid"
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  echo "[完成] 已清理。"
}

usage() {
  cat <<EOF
用法：
  FRONTEND_PORT=5173 BACKEND_PORT=3000 CRAWLER_PORT=8009 \\
  SKIP_INSTALL=false ./scripts/dev-all.sh

选项（通过环境变量）：
  FRONTEND_PORT    前端端口（默认 5173）
  BACKEND_PORT     后端端口（默认读取 backend/.env 的 PORT；若无则 3000）
  CRAWLER_PORT     爬虫端口（默认 8009）
  SKIP_INSTALL     跳过依赖安装（默认 false）

启动完成后：
  前端地址:   http://localhost:
    - $FRONTEND_PORT/
  后端 API:   http://localhost:$BACKEND_PORT/api/health | /api/docs
  爬虫 API:   http://localhost:$CRAWLER_PORT/api/docs | /api/v1/crawl-jobs

日志：
  $LOG_DIR/frontend.log
  $LOG_DIR/backend.log
  $LOG_DIR/crawler.log
EOF
}

main() {
  # 若未显式指定，尝试从后端 .env 读取 PORT 作为 BACKEND_PORT
  if [ -f "$BACKEND_DIR/.env" ]; then
    env_port=$(grep -E '^\s*PORT\s*=' "$BACKEND_DIR/.env" | tail -n 1 | sed -E 's/^\s*PORT\s*=\s*//;s/"//g;s/\s*$//')
    if [[ "$env_port" =~ ^[0-9]+$ ]]; then
      BACKEND_PORT="$env_port"
    fi
  fi

  print_header
  usage

  ensure_node_env

  # 端口占用提示
  for p in "$FRONTEND_PORT" "$BACKEND_PORT" "$CRAWLER_PORT"; do
    if port_in_use "$p"; then
      echo "[警告] 端口 $p 已被占用，可能已在运行其他实例。"
    fi
  done

  trap cleanup INT TERM EXIT

  # 并发启动三个服务
  start_backend
  start_crawler
  start_frontend

  echo "\n[完成] 所有服务已启动。按 Ctrl+C 结束并清理。"
  # 保持前台运行，等待用户中断
  wait
}

main "$@"