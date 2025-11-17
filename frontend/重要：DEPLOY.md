# 前端部署操作指引

## 📋 前置检查清单

在开始部署前，请确认以下事项：

- [ ] 本地代码已提交到 Git
- [ ] SSH 密钥文件存在
- [ ] SSH 密钥权限正确：`chmod 600 /path/to/ssh_key`
- [ ] 能够连接到服务器：`ssh -i <密钥路径> root@192.168.102.168`
---

## 🚀 快速部署（推荐）

### 方式一：使用部署脚本（最简单）

```bash
# 进入部署脚本目录
cd /Users/samuel/Desktop/系统开发/others

# 赋予执行权限（首次需要）
chmod +x deploy-update.sh

# 仅部署前端
./deploy-update.sh frontend
```

**注意事项：**
- 脚本会自动构建前端并推送到服务器
- 如果部署失败会自动回滚
- 部署后会自动验证服务状态

---

## 🔧 手动部署（详细步骤）

### 第一步：本地构建

```bash
# 进入前端目录
cd /Users/samuel/Desktop/系统开发/frontend

# 清理旧的构建产物（可选）
rm -rf dist

# 安装依赖（首次或依赖变更时）
pnpm install
# 注意：postinstall会自动跳过@vben-core/design包构建

# 构建生产版本
pnpm run build
```

**常见构建问题及解决方案：**

#### 问题 1：Sass 编译错误（已解决）
```
Error: An importer must have either canonicalize and load methods
```

**当前状态：** ✅ 已使用 `sass-embedded@^1.77.8` 替代 `sass`，无需手动处理

**如果重新安装依赖后仍出现：**
```bash
# 确认使用了正确的包
grep "sass-embedded" package.json
# 应该显示: "sass-embedded": "^1.77.8"

# 如果不是，重新安装
pnpm add -D sass-embedded@^1.77.8
```

#### 问题 2：@vben-core/design 构建失败（已优化）
```
warn - The content option in your Tailwind CSS configuration is missing
```

**当前状态：** ✅ postinstall 脚本已配置为跳过 design 包构建

**如果仍然失败：**
```bash
# 1. 删除所有依赖
rm -rf node_modules pnpm-lock.yaml
find . -name "node_modules" -type d -prune -exec rm -rf {} \;

# 2. 重新安装（会自动跳过design包）
pnpm install

# 3. 构建主应用
pnpm run build
```

#### 问题 3：内存不足
```
JavaScript heap out of memory
```

**解决方案：**
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

### 第二步：推送到服务器

```bash
# 使用 rsync 同步构建产物
rsync -avz --delete \
  -e "ssh -i '/Users/samuel/Desktop/系统开发/others/192.168.102 (5).168_id_ed25519'" \
  "./dist/" \
  "root@192.168.102.168:/www/wwwroot/gimcstar_proudction_env/gimcstar/frontend/dist/"
```

**参数说明：**
- `-a`: 归档模式，保留权限和时间戳
- `-v`: 显示详细信息
- `-z`: 压缩传输
- `--delete`: 删除目标目录中多余的文件
- `-e`: 指定 SSH 连接方式

### 第三步：验证部署

```bash
# 1. 检查文件是否上传成功
ssh -i "/Users/samuel/Desktop/系统开发/others/192.168.102 (5).168_id_ed25519" \
  root@192.168.102.168 "ls -lh /www/wwwroot/gimcstar_proudction_env/gimcstar/frontend/dist/"

# 2. 检查后端服务状态（重要！）
ssh -i "/Users/samuel/Desktop/系统开发/others/192.168.102 (5).168_id_ed25519" \
  root@192.168.102.168 "pm2 status"

# 3. 测试前端访问
curl -I http://192.168.102.168

# 4. 测试 CSS 文件是否存在
curl -I http://192.168.102.168/css/index-*.css
```

### 第四步：重启后端服务（如果需要）

**⚠️ 重要：** 如果部署后出现 502 错误，说明后端服务未运行

```bash
# SSH 到服务器
ssh -i "/Users/samuel/Desktop/系统开发/others/192.168.102 (5).168_id_ed25519" root@192.168.102.168

# 检查服务状态
pm2 status

# 如果服务是 stopped，重启它们
pm2 restart crawler-backend
pm2 restart crawler-api

# 或者启动所有服务
pm2 start all

# 查看日志（如果有问题）
pm2 logs crawler-backend --lines 50
```

---

## 🔍 常见问题排查

### 问题：前端样式丢失

**症状：** 页面加载但没有样式，布局混乱

**原因：** CSS 文件未正确引入到 HTML

**解决方案：**
1. 检查 `dist/index.html` 是否包含所有 CSS 文件：
   ```bash
   cat dist/index.html | grep "\.css"
   ```
   应该看到 4 个 CSS 文件：
   - `index-*.css`（核心样式，包含 Tailwind）
   - `element-plus-*.css`
   - `vue-core-*.css`
   - `vendor-*.css`

2. 如果缺少 `index-*.css`，检查 `src/main.ts` 是否包含样式导入：
   ```typescript
   import '@vben/styles';
   import '@vben/styles/ele';
   import 'element-plus/dist/index.css';
   ```

### 问题：502 Bad Gateway

**症状：** 前端页面打开，但登录时报 502 错误

**原因：** 后端服务未运行

**解决方案：**
```bash
# 检查后端服务
ssh -i "/path/to/key" root@192.168.102.168 "pm2 status"

# 重启后端
ssh -i "/path/to/key" root@192.168.102.168 "pm2 restart crawler-backend"

# 检查后端日志
ssh -i "/path/to/key" root@192.168.102.168 "pm2 logs crawler-backend --lines 20"
```

### 问题：Nginx 404 错误

**症状：** 访问前端返回 404

**原因：** Nginx 配置的前端路径不正确

**解决方案：**
```bash
# 检查 Nginx 配置
ssh -i "/path/to/key" root@192.168.102.168 "cat /etc/nginx/nginx.conf | grep root"

# 应该指向
# /www/wwwroot/gimcstar_proudction_env/gimcstar/frontend/dist

# 重启 Nginx
ssh -i "/path/to/key" root@192.168.102.168 "nginx -t && systemctl restart nginx"
```

---

## ⚡ 最新优化说明（2025-11-17更新）

### API路径统一
本次部署包含重要的API路径重构：
- ✅ 移除了所有 `/v2/` 和 `/v3/` 版本前缀
- ✅ 统一使用语义化路径命名
- ✅ 前后端64处路径更新

**影响的模块：**
- 达人筛选：`/influencer-filter`
- 影响者管理：`/influencer-manager`
- 达人广场：`/influencer-authors`
- KOL评价：`/kol-reviews`
- 供应商数据库：`/supplier-database`

**重要：** 部署后确保后端也更新到对应版本（feature/unify-api-routes）

### 构建优化
- ✅ 使用 `sass-embedded` 替代 `sass`，编译速度提升3-10倍
- ✅ 跳过 `@vben-core/design` 包预构建，Vite按需编译
- ✅ 优化了 workspace 包的构建流程

---

## 📦 构建产物说明

成功构建后，`dist/` 目录应包含：

```
dist/
├── index.html              # 主 HTML 文件
├── favicon.ico             # 图标
├── _app.config.js          # 应用配置
├── css/                    # 样式文件
│   ├── index-*.css         # ⭐ 核心样式（Tailwind + 自定义）
│   ├── element-plus-*.css  # Element Plus 组件样式
│   ├── vue-core-*.css      # Vue 核心样式
│   └── vendor-*.css        # 第三方库样式
├── js/                     # JavaScript 文件
│   ├── bootstrap-*.js      # 启动文件
│   ├── vue-core-*.js       # Vue 核心
│   ├── element-plus-*.js   # Element Plus
│   ├── vendor-*.js         # 第三方库
│   └── ...                 # 其他代码分片
└── jse/                    # 入口文件
    └── index-index-*.js
```

**⚠️ 关键文件检查：**
- `index.html` 必须引用 `css/index-*.css`
- 所有 `.js` 和 `.css` 文件名都带有哈希值（如 `-BIPcmfV5`）

---

## 🎯 最佳实践

### 1. 部署前检查
```bash
# 在本地预览构建结果
pnpm run build
pnpm vite preview

# 在浏览器访问 http://localhost:4173
# 确认样式正常后再推送到服务器
```

### 2. 使用 Git 标签
```bash
# 为每次部署打标签
git tag -a v1.0.1 -m "部署版本 1.0.1"
git push origin v1.0.1
```

### 3. 备份当前版本
```bash
# 服务器上备份当前版本
ssh -i "/path/to/key" root@192.168.102.168 \
  "cp -r /www/wwwroot/gimcstar_proudction_env/gimcstar/frontend/dist \
   /www/backup/frontend-dist-$(date +%Y%m%d-%H%M%S)"
```

### 4. 查看部署日志
```bash
# 使用部署脚本时会自动记录日志
./deploy-update.sh frontend 2>&1 | tee deploy-$(date +%Y%m%d-%H%M%S).log
```

---

## 🔐 安全建议

1. **定期更新密钥**
   - SSH 密钥应定期轮换
   - 密钥文件权限必须是 `600`

2. **使用环境变量**
   - 敏感信息不要硬编码
   - 使用 `.env.production` 管理生产环境配置

3. **备份策略**
   - 每次部署前自动备份
   - 保留最近 5 个版本的备份
   - 定期清理旧备份释放空间

---

## 📞 紧急回滚

如果部署后发现严重问题，立即回滚：

```bash
# 使用部署脚本回滚
cd /Users/samuel/Desktop/系统开发/others
./deploy-update.sh rollback

# 或手动回滚
ssh -i "/path/to/key" root@192.168.102.168 << 'EOF'
# 查看可用备份
ls -lt /www/backup/ | head -10

# 恢复指定备份（替换时间戳）
cp -r /www/backup/backup-20251113-183518/frontend/dist/* \
  /www/wwwroot/gimcstar_proudction_env/gimcstar/frontend/dist/

# 重启 Nginx
nginx -s reload
EOF
```

---

## 📚 相关命令速查

```bash
# 构建相关
pnpm install                    # 安装依赖
pnpm run build                  # 生产构建
pnpm vite preview              # 本地预览构建结果
pnpm run clean                 # 清理构建产物

# 服务器管理
pm2 status                     # 查看服务状态
pm2 restart <name>             # 重启服务
pm2 logs <name>                # 查看日志
pm2 monit                      # 监控面板

# Nginx 管理
nginx -t                       # 测试配置
nginx -s reload                # 重载配置
systemctl status nginx         # 查看状态
systemctl restart nginx        # 重启服务
```

---

## ✅ 部署检查清单

部署完成后，逐一检查以下项目：

- [ ] 前端页面能正常访问（http://192.168.102.168）
- [ ] 所有 CSS 样式加载正常（无 404 错误）
- [ ] 所有 JS 文件加载正常（无 404 错误）
- [ ] 后端 API 响应正常（无 502 错误）
- [ ] 能够正常登录系统
- [ ] 主要功能页面正常显示
- [ ] 浏览器控制台无严重错误
- [ ] PM2 服务状态都是 online
- [ ] Python API 服务正常（如果需要）

---

**最后更新：** 2025-11-17  
**维护者：** samuel  
**当前分支：** feature/unify-api-routes

**重要提示：**
1. ⚠️ 遇到问题时，先检查后端服务状态，90% 的部署后问题都是因为后端服务未运行！
2. ⚠️ 本次更新包含API路径重构，前后端必须同步部署！
3. ⚠️ 部署前确认使用 `feature/unify-api-routes` 分支或已合并到main
