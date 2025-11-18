/**
 * Store 模块化架构说明
 * 
 * 按业务域组织的 Pinia Store 结构
 */

## 目录结构

```
src/store/
├── index.ts                      # 统一导出入口
└── modules/                      # 业务域模块
    ├── auth.ts                   # 认证模块
    ├── influencer-square.ts      # 达人广场模块
    ├── kol.ts                    # KOL管理模块
    ├── supplier.ts               # 供应商管理模块
    ├── tag.ts                    # 标签管理模块
    └── ui.ts                     # UI状态模块
```

## 模块说明

### 1. auth.ts - 认证模块
**职责**：
- 用户登录/登出
- Token 管理
- 用户信息管理
- 权限码管理

**主要状态**：
- `loginLoading`: 登录加载状态

**主要方法**：
- `authLogin()`: 登录
- `logout()`: 退出登录
- `fetchUserInfo()`: 获取用户信息
- `fetchAccessCodes()`: 获取权限码

**使用示例**：
```typescript
import { useAuthStore } from '#/store'

const authStore = useAuthStore()
await authStore.authLogin({ username, password })
```

### 2. influencer-square.ts - 达人广场模块
**职责**：
- 达人列表管理
- 筛选条件管理
- 分页管理
- 达人选中状态

**主要状态**：
- `influencers`: 达人列表
- `filters`: 筛选条件
- `selectedInfluencerIds`: 选中的达人ID集合
- `currentPage`/`pageSize`: 分页

**主要方法**：
- `loadInfluencers()`: 加载达人列表
- `loadInfluencersDebounced()`: 防抖加载（推荐）
- `setFilter()`: 设置筛选条件
- `toggleInfluencerSelection()`: 切换选中状态

**使用示例**：
```typescript
import { useInfluencerSquareStore } from '#/store'

const store = useInfluencerSquareStore()
store.setFilter('platform', 'douyin')
await store.loadInfluencersDebounced()
```

### 3. kol.ts - KOL管理模块
**职责**：
- KOL 列表管理
- KOL 评价管理
- KOL 导入历史

**主要状态**：
- `kolList`: KOL列表
- `filters`: 筛选条件
- `selectedKolIds`: 选中的KOL

**主要方法**：
- `loadKolList()`: 加载KOL列表
- `setFilter()`: 设置筛选条件
- `toggleKolSelection()`: 切换选中

**使用示例**：
```typescript
import { useKolStore } from '#/store'

const kolStore = useKolStore()
await kolStore.loadKolList()
```

### 4. supplier.ts - 供应商管理模块
**职责**：
- 供应商列表管理
- 供应商关系管理

**主要状态**：
- `supplierList`: 供应商列表
- `filters`: 筛选条件
- `selectedSupplierIds`: 选中的供应商

**主要方法**：
- `loadSupplierList()`: 加载供应商列表
- `setFilter()`: 设置筛选条件

**使用示例**：
```typescript
import { useSupplierStore } from '#/store'

const supplierStore = useSupplierStore()
await supplierStore.loadSupplierList()
```

### 5. tag.ts - 标签管理模块
**职责**：
- 标签列表管理
- 标签分类树
- 热门标签缓存

**主要状态**：
- `tagList`: 标签列表
- `tagTree`: 标签树（分类）
- `popularTags`: 热门标签

**主要方法**：
- `loadTagList()`: 加载标签列表
- `loadTagTree()`: 加载标签树
- `loadPopularTags()`: 加载热门标签

**使用示例**：
```typescript
import { useTagStore } from '#/store'

const tagStore = useTagStore()
await tagStore.loadTagTree()
```

### 6. ui.ts - UI状态模块
**职责**：
- 全局UI状态管理
- 侧边栏状态
- 通知状态
- 面包屑导航

**主要状态**：
- `sidebarCollapsed`: 侧边栏折叠状态
- `globalLoading`: 全局加载状态
- `unreadNotifications`: 未读通知数
- `breadcrumbs`: 面包屑

**主要方法**：
- `toggleSidebar()`: 切换侧边栏
- `setGlobalLoading()`: 设置全局加载
- `setBreadcrumbs()`: 设置面包屑

**使用示例**：
```typescript
import { useUiStore } from '#/store'

const uiStore = useUiStore()
uiStore.toggleSidebar()
```

## 使用规范

### 1. 导入规范
统一从 `#/store` 导入，不要使用子路径：

```typescript
// ✅ 正确
import { useAuthStore, useInfluencerSquareStore } from '#/store'

// ❌ 错误
import { useAuthStore } from '#/store/modules/auth'
```

### 2. 状态解构
使用 `storeToRefs` 解构响应式状态：

```typescript
import { storeToRefs } from 'pinia'
import { useInfluencerSquareStore } from '#/store'

const store = useInfluencerSquareStore()
const { influencers, loading } = storeToRefs(store)
```

### 3. 防抖方法
对于高频操作，优先使用防抖版本：

```typescript
// ✅ 推荐：防抖版本
await store.loadInfluencersDebounced()

// ❌ 不推荐：直接调用（除非确实需要立即执行）
await store.loadInfluencers()
```

### 4. 重置状态
所有Store都提供了 `$reset()` 方法：

```typescript
const store = useKolStore()
store.$reset() // 重置所有状态到初始值
```

## 设计原则

### 1. 单一职责
每个Store模块负责一个业务域，避免职责混淆

### 2. 统一接口
所有列表管理Store提供统一的方法命名：
- `load*List()`: 加载列表
- `setFilter()`: 设置筛选
- `resetFilters()`: 重置筛选
- `toggle*Selection()`: 切换选中
- `clearSelection()`: 清空选中

### 3. 性能优化
- 使用 `Set` 存储选中状态（O(1)查找）
- 提供防抖方法避免请求风暴
- 计算属性缓存派生状态

### 4. 类型安全
所有Store都是TypeScript实现，提供完整的类型推断

## 扩展指南

### 添加新的业务模块

1. 在 `src/store/modules/` 创建新文件
2. 使用 `defineStore` 定义Store
3. 在 `src/store/index.ts` 导出

示例：
```typescript
// src/store/modules/order.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOrderStore = defineStore('order', () => {
  const orderList = ref([])
  
  const loadOrderList = async () => {
    // 实现
  }
  
  return {
    orderList,
    loadOrderList
  }
})
```

```typescript
// src/store/index.ts
export * from './modules/order'
```

## 注意事项

1. **避免循环依赖**：Store之间不要互相导入
2. **API调用统一管理**：API调用应该在Store的方法中，不要在组件中直接调用
3. **状态持久化**：如需持久化，使用 `pinia-plugin-persistedstate`
4. **调试日志**：使用统一的 `log` 工具而非 `console`

## 迁移指南

从旧的导入方式迁移：

```typescript
// 旧方式
import { useInfluencerSquareStore } from '#/store/influencer-square'

// 新方式
import { useInfluencerSquareStore } from '#/store'
```

批量替换命令：
```bash
# 在项目根目录执行
find src -name "*.vue" -o -name "*.ts" | xargs sed -i '' "s/#\/store\/influencer-square/#\/store/g"
```
