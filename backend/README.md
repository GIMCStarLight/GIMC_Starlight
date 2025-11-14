# 智能达人推荐系统 - 后端服务

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

基于 NestJS 框架构建的智能达人推荐系统后端服务，提供完整的达人数据管理、标签系统和推荐算法 API。

## 🚀 项目特性

- **多数据库支持**: MySQL + PostgreSQL 双数据库架构
- **智能标签系统**: 支持星图、花火、蒲公英三大平台标签体系
- **达人数据管理**: 完整的达人信息存储和检索
- **RESTful API**: 标准化的 API 接口设计
- **JWT 认证**: 安全的用户认证和授权
- **Redis 缓存**: 高性能数据缓存
- **Swagger 文档**: 自动生成的 API 文档

## 📋 环境要求

- Node.js >= 16.0.0
- pnpm >= 8.0.0
- MySQL >= 8.0
- PostgreSQL >= 13.0
- Redis >= 6.0

## 🛠️ 项目安装

```bash
# 克隆项目
git clone <repository-url>
cd backend

# 安装依赖
pnpm install

# 复制环境配置文件
cp .env.example .env
```

## ⚙️ 环境配置

编辑 `.env` 文件，配置以下关键参数：

### 应用配置
```env
APP_NAME=智能达人推荐系统
PORT=9000
API_PREFIX=api/v1
```

### 数据库配置
```env
# MySQL (用于用户认证和基础数据) - 使用root超级管理员账号
MYSQL_HOST=192.168.102.168
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=newrootpassword123
MYSQL_DATABASE=gimcstar_system

# PostgreSQL (用于达人数据和标签系统) - 使用超级管理员账号
POSTGRES_HOST=192.168.102.168
POSTGRES_PORT=5432
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DATABASE=gimcstar
```

### Redis 配置
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 🚀 项目启动

### 完整启动流程

```bash
# 1. 重置 MySQL 数据库
pnpm run db:reset

# 2. 重置并初始化 PostgreSQL 数据库
pnpm run pgsql:reset

# 3. 导入达人数据到 PostgreSQL
pnpm run pgsql:seed

# 4. 启动开发服务器
pnpm run start:dev
```

### 单独命令说明

```bash
# 开发模式启动
pnpm run start:dev

# 生产模式启动
pnpm run start:prod

# 构建项目
pnpm run build

# 代码格式化
pnpm run format

# 代码检查
pnpm run lint
```

## 🗄️ 数据库管理

### MySQL 数据库
- **用途**: 用户认证、权限管理、基础配置
- **重置**: `pnpm run db:reset`

### PostgreSQL 数据库
- **用途**: 达人数据存储、标签系统、推荐算法数据
- **初始化**: `pnpm run pgsql:reset`
- **数据导入**: `pnpm run pgsql:seed`

### 标签系统
支持三大平台标签体系：
- **星图**: 552个标签
- **花火**: 447个标签  
- **蒲公英**: 749个标签

### 达人数据
- **数据量**: 10,165条达人信息
- **数据源**: MySQL 迁移到 PostgreSQL
- **包含**: 基础信息、平台数据、标签关联

## 📚 API 文档

启动服务后访问 Swagger 文档：
```
http://localhost:9000/docs
```

## 🧪 测试

```bash
# 单元测试
pnpm run test

# 端到端测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:cov

# 调试模式测试
pnpm run test:debug
```

## 📁 项目结构

```
src/
├── app.module.ts          # 应用主模块
├── main.ts               # 应用入口
├── auth/                 # 认证模块
├── users/                # 用户管理
├── roles/                # 角色管理
├── permissions/          # 权限管理
├── tags/                 # 标签系统
├── modules/              # 业务模块
├── database/             # 数据库配置
├── config/               # 配置管理
├── common/               # 公共组件
├── search/               # 搜索功能
└── logs/                 # 日志模块
```

## 🔧 开发工具

- **TypeScript**: 类型安全的 JavaScript
- **NestJS**: 企业级 Node.js 框架
- **TypeORM**: 对象关系映射
- **Swagger**: API 文档生成
- **Jest**: 测试框架
- **ESLint**: 代码检查
- **Prettier**: 代码格式化

## 🚀 部署

### 生产环境部署

```bash
# 构建项目
pnpm run build

# 启动生产服务
pnpm run start:prod
```

### Docker 部署 (可选)

```bash
# 构建镜像
docker build -t gimcstar-backend .

# 运行容器
docker run -p 9000:9000 gimcstar-backend
```

## 🔒 安全配置

- JWT Token 认证
- CORS 跨域配置
- 请求频率限制
- 数据加密存储
- 环境变量保护

## 📊 监控和日志

- **健康检查**: `/health`
- **指标监控**: Prometheus 集成
- **日志系统**: 结构化日志记录
- **错误追踪**: 完整的错误堆栈

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- 项目维护者: 省广星芒开发团队
- 邮箱: dev@gimcstar.com
- 文档: [项目文档](http://localhost:9000/docs)

---

**智能达人推荐系统** - 让达人推荐更智能，让营销更精准 🎯
