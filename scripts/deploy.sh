#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOCAL_CONFIG="${PROJECT_ROOT}/.deploy.env"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  shift
fi

ACTION="${1:-status}"

if [[ -f "${LOCAL_CONFIG}" ]]; then
  # shellcheck disable=SC1090
  source "${LOCAL_CONFIG}"
fi

DEPLOY_HOST="${DEPLOY_HOST:-starlight-hk}"
DEPLOY_REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/gimc-starlight}"
DEPLOY_PUBLIC_URL="${DEPLOY_PUBLIC_URL:-http://47.243.170.126}"
REMOTE_COMPOSE="cd '${DEPLOY_REMOTE_DIR}' && docker compose"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1"
}

remote() {
  ssh -o BatchMode=yes -o ConnectTimeout=10 "${DEPLOY_HOST}" "$@"
}

check_target() {
  local actual_dir
  actual_dir="$(remote "test -d '${DEPLOY_REMOTE_DIR}' && test -f '${DEPLOY_REMOTE_DIR}/compose.yaml' && realpath '${DEPLOY_REMOTE_DIR}'")"
  [[ "${actual_dir}" == "${DEPLOY_REMOTE_DIR}" ]] || fail "服务器目录校验失败：${actual_dir}"
  remote "test -f '${DEPLOY_REMOTE_DIR}/.env'"
}

build_frontend() {
  require_command pnpm
  log '构建前端'
  (cd "${PROJECT_ROOT}/frontend" && pnpm run build)
}

build_backend() {
  require_command pnpm
  log '构建后端'
  (cd "${PROJECT_ROOT}/backend" && pnpm run build)
}

backup_frontend() {
  local stamp="$1"
  remote "mkdir -p '${DEPLOY_REMOTE_DIR}/backups/${stamp}' && if test -d '${DEPLOY_REMOTE_DIR}/frontend/dist'; then tar -C '${DEPLOY_REMOTE_DIR}/frontend' -czf '${DEPLOY_REMOTE_DIR}/backups/${stamp}/frontend-dist.tar.gz' dist; fi"
}

backup_backend() {
  local stamp="$1"
  remote "mkdir -p '${DEPLOY_REMOTE_DIR}/backups/${stamp}' && tar -C '${DEPLOY_REMOTE_DIR}' --exclude='backend/node_modules' --exclude='backend/dist' --exclude='backend/uploads' --exclude='backend/logs' --exclude='backend/.env' -czf '${DEPLOY_REMOTE_DIR}/backups/${stamp}/backend-source.tar.gz' backend compose.yaml"
}

sync_config() {
  local rsync_flags=(-az)
  if [[ "${DRY_RUN}" == '1' ]]; then
    rsync_flags+=(--dry-run --itemize-changes)
  fi

  log '同步 Compose 与 Nginx 配置（保留远端 .env）'
  if [[ "${DRY_RUN}" == '0' ]]; then
    remote "mkdir -p '${DEPLOY_REMOTE_DIR}/nginx'"
  fi
  rsync "${rsync_flags[@]}" -e ssh "${PROJECT_ROOT}/compose.yaml" "${DEPLOY_HOST}:${DEPLOY_REMOTE_DIR}/compose.yaml"
  rsync "${rsync_flags[@]}" -e ssh "${PROJECT_ROOT}/nginx/default.conf" "${DEPLOY_HOST}:${DEPLOY_REMOTE_DIR}/nginx/default.conf"
}

deploy_frontend() {
  local stamp
  local rsync_flags=(-az --delete)
  stamp="$(date '+%Y%m%d-%H%M%S')"
  build_frontend
  if [[ "${DRY_RUN}" == '1' ]]; then
    rsync_flags+=(--dry-run --itemize-changes)
  else
    backup_frontend "${stamp}"
  fi

  log '同步前端 dist'
  if [[ "${DRY_RUN}" == '0' ]]; then
    remote "mkdir -p '${DEPLOY_REMOTE_DIR}/frontend/dist'"
  fi
  rsync "${rsync_flags[@]}" -e ssh "${PROJECT_ROOT}/frontend/dist/" "${DEPLOY_HOST}:${DEPLOY_REMOTE_DIR}/frontend/dist/"

  if [[ "${DRY_RUN}" == '0' ]]; then
    remote "find '${DEPLOY_REMOTE_DIR}/frontend/dist' -type d -exec chmod 755 {} + && find '${DEPLOY_REMOTE_DIR}/frontend/dist' -type f -exec chmod 644 {} +"
    remote "${REMOTE_COMPOSE} exec -T nginx nginx -t && ${REMOTE_COMPOSE} exec -T nginx nginx -s reload"
    remote "test -f '${DEPLOY_REMOTE_DIR}/frontend/dist/index.html'"
  fi
}

deploy_backend() {
  local stamp
  local rsync_flags=(-az --delete)
  stamp="$(date '+%Y%m%d-%H%M%S')"
  build_backend
  if [[ "${DRY_RUN}" == '1' ]]; then
    rsync_flags+=(--dry-run --itemize-changes)
  else
    backup_backend "${stamp}"
  fi

  log '同步后端源码（保留运行时数据与密钥）'
  rsync "${rsync_flags[@]}" -e ssh \
    --exclude='.env' \
    --exclude='.DS_Store' \
    --exclude='node_modules/' \
    --exclude='dist/' \
    --exclude='uploads/' \
    --exclude='logs/' \
    "${PROJECT_ROOT}/backend/" "${DEPLOY_HOST}:${DEPLOY_REMOTE_DIR}/backend/"

  if [[ "${DRY_RUN}" == '0' ]]; then
    remote "${REMOTE_COMPOSE} up -d --build --no-deps backend"
    log '等待后端健康检查'
    remote "for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do if curl -fsS http://127.0.0.1/api/health >/dev/null; then exit 0; fi; sleep 5; done; exit 1"
  fi
}

show_status() {
  remote "${REMOTE_COMPOSE} ps"
  remote "curl -fsS http://127.0.0.1/api/health"
  printf '\n'
  log "站点地址：${DEPLOY_PUBLIC_URL}"
}

main() {
  require_command ssh
  require_command rsync
  check_target

  case "${ACTION}" in
    status)
      show_status
      ;;
    config)
      sync_config
      ;;
    frontend)
      deploy_frontend
      ;;
    backend)
      deploy_backend
      ;;
    all)
      sync_config
      deploy_frontend
      deploy_backend
      ;;
    *)
      fail '用法：./scripts/deploy.sh [--dry-run] {status|config|frontend|backend|all}'
      ;;
  esac
}

main "$@"
