# GIMC Starlight 部署说明

## 当前环境

- 公网地址：`http://47.243.170.126`
- SSH 别名：`starlight-hk`
- 服务器目录：`/opt/gimc-starlight`
- 服务方式：Docker Compose（PostgreSQL、Redis、NestJS 后端、Nginx）
- 爬虫：不启动、不部署

SSH 私钥安装在 `~/.ssh/starlight_deploy`，主机参数位于 `~/.ssh/config`。项目中的 `.deploy.env` 只保存主机别名、目录和公开 URL，不保存口令或私钥。

## 首次准备

服务器必须已有以下运行时文件，部署脚本不会覆盖它们：

- `/opt/gimc-starlight/.env`：数据库、Redis、JWT 等服务端密钥
- `/opt/gimc-starlight/nginx/.htpasswd`：演示站 Basic Auth 凭据

新服务器可从 `.env.example` 创建 `.env`，并执行：

```bash
mkdir -p /opt/gimc-starlight/nginx
htpasswd -c /opt/gimc-starlight/nginx/.htpasswd demo
chmod 600 /opt/gimc-starlight/.env /opt/gimc-starlight/nginx/.htpasswd
```

`db-init/` 只会在 PostgreSQL 数据卷首次创建时运行。为避免误伤线上数据，常规部署脚本不会同步数据库初始化文件，也不会执行 `docker compose down -v`。

## 日常部署

在项目根目录运行：

```bash
./scripts/deploy.sh status
./scripts/deploy.sh frontend
./scripts/deploy.sh backend
./scripts/deploy.sh all
```

先预览将发生的文件同步：

```bash
./scripts/deploy.sh --dry-run frontend
./scripts/deploy.sh --dry-run backend
./scripts/deploy.sh --dry-run all
```

脚本会先在本机完成对应构建，再备份线上文件、同步变更并做健康检查。它不会传输 `.env`、SSH 密钥、`.htpasswd`、上传文件、日志或数据库数据卷。

## 配置与数据

- `compose.yaml`：四个线上服务；后端和数据库不开放公网端口。
- `nginx/default.conf`：只暴露 80 端口，API 反向代理至后端，页面启用 Basic Auth。
- `db-init/`：新环境初始化 SQL 与演示数据加载脚本。
- `deploy/sql/`：需要人工确认后执行的一次性修复 SQL。

生产环境口令只应放在服务器 `.env`。不要提交 `.deploy.env`、`nginx/.htpasswd` 或 `db-init/03-parsed.csv`。

## 回滚

每次真实部署前，服务器会在 `/opt/gimc-starlight/backups/<时间戳>/` 保存相关文件。前端可把备份中的 `frontend-dist.tar.gz` 解回 `frontend/dist`；后端可把 `backend-source.tar.gz` 解回项目目录后重新构建容器。
