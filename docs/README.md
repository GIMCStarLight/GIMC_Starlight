# GIMC Starlight

一个包含后端（NestJS/Node）、前端（Vite/Vue/PNPM）与爬虫（Python）的单仓库项目。

## 仓库结构

- `backend/`：NestJS 后端服务，使用 PNPM 管理依赖。
- `frontend/`：前端应用，基于 Vite + Vue，使用 PNPM 管理依赖。
- `crawler/`：Python 爬虫模块，包含测试与工具脚本。
- `others/`：部署脚本、文档与通用配置。

## 快速开始

### 前端

1. 安装依赖：`pnpm -C frontend install --frozen-lockfile`
2. 本地开发：`pnpm -C frontend dev`
3. 生产构建：`pnpm -C frontend build`

### 后端

1. 安装依赖：`pnpm -C backend install --frozen-lockfile`
2. 本地开发（示例）：`pnpm -C backend dev` 或 `pnpm -C backend start:dev`
3. 生产构建（示例）：`pnpm -C backend build`

> 注：具体脚本名称以 `backend/package.json` 为准。

### 爬虫（Python）

1. 建议使用 Python 3.11+。
2. 安装基础工具：`pip install -U ruff pytest`
3. 质量检查：`ruff crawler`
4. 运行测试：`pytest -q crawler`

## Git 约定与忽略

- 已忽略 `crawler/**/reports/` 与 `crawler/**/results/` 等爬虫输出目录，避免污染版本历史。
- 如需白名单某些文档或输出文件，请在根 `.gitignore` 中添加对应例外规则。

## CI（GitHub Actions）

- 在 `.github/workflows/ci.yml` 配置了基础 CI：前端与后端依赖安装，以及爬虫的可选检查（不阻塞）。
- 可按需补充构建、测试与发布步骤。

## 分支与协作

- 默认分支：`main`。
- 推荐启用分支保护与合并规则（详见 `docs/github-setup.md`）。

## 推送与远程

- 已配置远程：`origin`。
- 首次推送：`git push -u origin main`
