# GitHub 仓库初始化与协作指引

本文档说明如何在 GitHub 上完成基础设置，以保障协作质量与安全。

## 分支保护（Branch Protection）

路径：`仓库 -> Settings -> Branches -> Branch protection rules`

建议为 `main` 分支创建保护规则并启用：

1. `Require a pull request before merging`
   - 勾选 `Require approvals`（建议至少 1 位审核者）
   - 可勾选 `Dismiss stale pull request approvals when new commits are pushed`
2. `Require status checks to pass before merging`
   - 勾选并选择 `CI` 工作流中的必要检查（如 frontend-install、backend-install）
3. `Require signed commits`（可选）
4. `Require linear history`（可选）
5. `Restrict who can push to matching branches`（可选，通常只允许管理员）

## CODEOWNERS

文件位置：`/.github/CODEOWNERS`

当前默认：`* @samuelone136-boop`

如需精细化：

```
backend/  @backend-team
frontend/ @frontend-team
crawler/  @data-team
```

## Issues 与模板（可选）

建议在根级 `.github/` 添加 Issue 模板与 PR 模板，以提升协作效率。

## Actions 与 Secret（可选）

如需在 CI 中访问受限资源（如私有包、云服务凭据），请在 `仓库 -> Settings -> Secrets and variables -> Actions` 添加必要的 `Repository secrets`（例如 `NPM_TOKEN`、`DOCKERHUB_TOKEN`）。

## 访问与协作者

路径：`仓库 -> Settings -> Collaborators`

将团队成员加入并设置合适的权限（Write/Maintain/Admin）。