<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import { getPermissionTreeListApi, type PermissionApi } from '../../../api/core/permission'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const loading = ref(false)
const permissionList = ref<PermissionApi.PermissionInfo[]>([])
const selectedModules = ref<string[]>([])
const searchKeyword = ref('')
const typeFilter = ref<'all' | 'MENU' | 'BUTTON' | 'API'>('all')
const expandedCategories = ref<string[]>(['KOL数据管理'])

// 功能分类（根据实际业务调整）
interface ModuleCategory {
  name: string
  icon: string
  color: string
  keywords: string[]
}

const categories: ModuleCategory[] = [
  {
    name: 'KOL数据管理',
    icon: 'lucide:users',
    color: '#3b82f6',
    keywords: ['kol', 'influencer', 'author', 'data', '达人', '作者', '数据'],
  },
  {
    name: '财务管理',
    icon: 'lucide:dollar-sign',
    color: '#10b981',
    keywords: ['financial', 'rebate', 'policy', '财务', '返点', '政策'],
  },
  {
    name: '供应商管理',
    icon: 'lucide:truck',
    color: '#f59e0b',
    keywords: ['supplier', '供应商'],
  },
  {
    name: '权限管理',
    icon: 'lucide:shield',
    color: '#8b5cf6',
    keywords: ['user', 'role', 'permission', '用户', '角色', '权限'],
  },
  {
    name: '工单管理',
    icon: 'lucide:clipboard-list',
    color: '#ef4444',
    keywords: ['work-order', '工单'],
  },
  {
    name: '标签管理',
    icon: 'lucide:tags',
    color: '#06b6d4',
    keywords: ['tag', '标签'],
  },
  {
    name: 'AI助手',
    icon: 'lucide:bot',
    color: '#a855f7',
    keywords: ['ai', 'assistant', 'chat', '助手', '智能'],
  },
  {
    name: '其他功能',
    icon: 'lucide:grid',
    color: '#6b7280',
    keywords: [],
  },
]

// 权限类型统计
const typeCount = computed(() => {
  let menu = 0, button = 0, api = 0
  const countTypes = (permissions: PermissionApi.PermissionInfo[]): void => {
    permissions.forEach(permission => {
      if (permission.status === 1) {
        if (permission.type === 'MENU') menu++
        else if (permission.type === 'BUTTON') button++
        else if (permission.type === 'API') api++
      }
      if (permission.children && permission.children.length > 0) {
        countTypes(permission.children)
      }
    })
  }
  countTypes(permissionList.value)
  return { MENU: menu, BUTTON: button, API: api }
})

// 根据类型和搜索过滤后的分类
const displayedCategories = computed(() => {
  let result = filteredCategories.value
  
  // 按类型过滤
  if (typeFilter.value !== 'all') {
    const filtered: Record<string, PermissionApi.PermissionInfo[]> = {}
    Object.entries(result).forEach(([catName, permissions]) => {
      const typeFiltered = permissions.filter(p => p.type === typeFilter.value)
      if (typeFiltered.length > 0) {
        filtered[catName] = typeFiltered
      }
    })
    result = filtered
  }
  
  return result
})
const categorizedModules = computed(() => {
  const result: Record<string, PermissionApi.PermissionInfo[]> = {}
  
  // 初始化分类
  categories.forEach(cat => {
    result[cat.name] = []
  })
  
  // 统计所有权限
  const allPermissions: PermissionApi.PermissionInfo[] = []
  
  // 扁平化处理权限（包含所有类型的权限）
  const flattenPermissions = (permissions: PermissionApi.PermissionInfo[]): void => {
    permissions.forEach(permission => {
      // 只取启用的权限，不限制类型
      if (permission.status === 1) {
        allPermissions.push(permission)
        
        const permName = String(permission.name || '')
        const permCode = permission.code || ''
        const permResource = permission.resource || ''
        
        // 查找匹配的分类
        let matched = false
        for (const cat of categories) {
          if (cat.keywords.length === 0) continue // 跳过"其他功能"分类
          
          const matchKeyword = cat.keywords.some(keyword => 
            permName.toLowerCase().includes(keyword.toLowerCase()) ||
            permCode.toLowerCase().includes(keyword.toLowerCase()) ||
            permResource.toLowerCase().includes(keyword.toLowerCase())
          )
          
          if (matchKeyword) {
            result[cat.name].push(permission)
            matched = true
            break
          }
        }
        
        // 如果没匹配到，放到"其他功能"
        if (!matched) {
          result['其他功能'].push(permission)
        }
      }
      
      // 递归处理子权限
      if (permission.children && permission.children.length > 0) {
        flattenPermissions(permission.children)
      }
    })
  }
  
  flattenPermissions(permissionList.value)
  
  // 添加调试信息
  console.log('权限分类统计：', {
    总权限数: allPermissions.length,
    分类详情: Object.fromEntries(
      Object.entries(result).map(([name, perms]) => [name, perms.length])
    ),
    权限类型分布: {
      MENU: allPermissions.filter(p => p.type === 'MENU').length,
      BUTTON: allPermissions.filter(p => p.type === 'BUTTON').length,
      API: allPermissions.filter(p => p.type === 'API').length,
    }
  })
  
  return result
})

// 筛选后的分类
const filteredCategories = computed(() => {
  if (!searchKeyword.value) {
    return categorizedModules.value
  }
  
  const result: Record<string, PermissionApi.PermissionInfo[]> = {}
  const keyword = searchKeyword.value.toLowerCase()
  
  Object.entries(categorizedModules.value).forEach(([catName, permissions]) => {
    const filtered = permissions.filter(p => {
      const name = String(p.name || '')
      const code = p.code || ''
      const resource = p.resource || ''
      const desc = p.description || ''
      return name.toLowerCase().includes(keyword) ||
             code.toLowerCase().includes(keyword) ||
             resource.toLowerCase().includes(keyword) ||
             desc.toLowerCase().includes(keyword)
    })
    
    if (filtered.length > 0) {
      result[catName] = filtered
    }
  })
  
  return result
})

// 加载权限树
const loadPermissions = async () => {
  loading.value = true
  try {
    const response = await getPermissionTreeListApi()
    permissionList.value = response.data
  } catch (error: any) {
    ElMessage.error(error.message || '加载权限列表失败')
  } finally {
    loading.value = false
  }
}

// 切换选中
const toggleModule = (permissionId: string) => {
  const index = selectedModules.value.indexOf(permissionId)
  if (index > -1) {
    selectedModules.value.splice(index, 1)
  } else {
    selectedModules.value.push(permissionId)
  }
  emit('update:modelValue', selectedModules.value)
}

// 是否选中
const isSelected = (permissionId: string) => {
  return selectedModules.value.includes(permissionId)
}

// 清空所有选中
const clearAll = () => {
  selectedModules.value = []
  emit('update:modelValue', selectedModules.value)
}

// 切换分类展开/收起
const toggleCategory = (catName: string) => {
  const index = expandedCategories.value.indexOf(catName)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(catName)
  }
}

// 全选分类下的所有权限
const selectAllInCategory = (catName: string, permissions: PermissionApi.PermissionInfo[]) => {
  permissions.forEach(perm => {
    if (!isSelected(perm.id)) {
      selectedModules.value.push(perm.id)
    }
  })
  emit('update:modelValue', selectedModules.value)
}

// 统计信息
const totalPermissionCount = computed(() => {
  let count = 0
  const countPermissions = (permissions: PermissionApi.PermissionInfo[]): void => {
    permissions.forEach(permission => {
      if (permission.status === 1) count++
      if (permission.children && permission.children.length > 0) {
        countPermissions(permission.children)
      }
    })
  }
  countPermissions(permissionList.value)
  return count
})

const categorizedCount = computed(() => {
  return Object.values(categorizedModules.value)
    .reduce((total, perms) => total + perms.length, 0)
})

const uncategorizedCount = computed(() => {
  return categorizedModules.value['其他功能']?.length || 0
})

// 获取选中权限的名称（递归查找）
const getSelectedPermissionName = (permId: string): string => {
  const findInList = (list: PermissionApi.PermissionInfo[]): string | null => {
    for (const perm of list) {
      if (perm.id === permId) {
        return perm.name
      }
      if (perm.children && perm.children.length > 0) {
        const found = findInList(perm.children)
        if (found) return found
      }
    }
    return null
  }
  
  return findInList(permissionList.value) || permId
}

// 获取分类图标
const getCategoryIcon = (catName: string) => {
  return categories.find(c => c.name === catName)?.icon || 'lucide:folder'
}

// 获取分类颜色
const getCategoryColor = (catName: string) => {
  return categories.find(c => c.name === catName)?.color || '#6b7280'
}

// 获取权限类型标签
const getPermissionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    MENU: '菜单',
    BUTTON: '按钮',
    API: '接口',
  }
  return labels[type] || type
}

// 获取权限类型颜色
const getPermissionTypeColor = (type: string) => {
  const colors: Record<string, any> = {
    MENU: '',
    BUTTON: 'success',
    API: 'warning',
  }
  return colors[type] || 'info'
}

// 初始化选中值
onMounted(() => {
  selectedModules.value = [...props.modelValue]
  loadPermissions()
})
</script>

<template>
  <div v-loading="loading" class="module-selector-modern">
    <!-- 顶部搜索 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索权限名称、代码或描述..."
        clearable
        class="search-input"
      >
        <template #prefix>
          <Icon icon="lucide:search" :size="16" />
        </template>
      </el-input>
    </div>

    <!-- 统计和类型过滤 -->
    <div class="filter-bar">
      <div class="stats-inline">
        <span class="stat-text">共 <strong>{{ totalPermissionCount }}</strong> 项</span>
        <span class="stat-divider">|</span>
        <span class="stat-text">已选 <strong class="text-primary">{{ selectedModules.length }}</strong></span>
        <span v-if="uncategorizedCount > 0" class="stat-divider">|</span>
        <span v-if="uncategorizedCount > 0" class="stat-text text-warning">未分类 {{ uncategorizedCount }}</span>
      </div>
      
      <el-radio-group v-model="typeFilter" size="small" class="type-tabs">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="MENU">菜单</el-radio-button>
        <el-radio-button label="BUTTON">按钮</el-radio-button>
        <el-radio-button label="API">接口</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 已选权限（精简） -->
    <div v-if="selectedModules.length > 0" class="selected-bar">
      <div class="selected-tags">
        <el-tag
          v-for="permId in selectedModules.slice(0, 5)"
          :key="permId"
          closable
          size="small"
          @close="toggleModule(permId)"
        >
          {{ getSelectedPermissionName(permId) }}
        </el-tag>
        <span v-if="selectedModules.length > 5" class="more-tag">+{{ selectedModules.length - 5 }}</span>
      </div>
      <el-button text type="danger" size="small" @click="clearAll">
        清空
      </el-button>
    </div>

    <!-- 分类列表（扁平） -->
    <div class="categories-list">
      <div
        v-for="(permissions, catName) in displayedCategories"
        :key="catName"
        class="category-section"
      >
        <!-- 分类标题 -->
        <div class="category-title-bar" @click="toggleCategory(catName)">
          <div class="category-left">
            <div 
              class="category-dot"
              :style="{ backgroundColor: getCategoryColor(catName) }"
            ></div>
            <span class="category-label">{{ catName }}</span>
            <span class="category-badge">{{ permissions.length }}</span>
          </div>
          <div class="category-right">
            <el-button text size="small" @click.stop="selectAllInCategory(catName, permissions)">
              全选
            </el-button>
            <Icon 
              :icon="expandedCategories.includes(catName) ? 'lucide:chevron-down' : 'lucide:chevron-right'" 
              :size="16"
            />
          </div>
        </div>
        
        <!-- 权限列表 -->
        <transition name="collapse">
          <div v-show="expandedCategories.includes(catName)" class="permissions-list">
            <div
              v-for="permission in permissions"
              :key="permission.id"
              class="permission-item"
              :class="{ 'is-selected': isSelected(permission.id) }"
              @click="toggleModule(permission.id)"
            >
              <el-checkbox 
                :model-value="isSelected(permission.id)"
                @change="toggleModule(permission.id)"
              />
              <div class="permission-info">
                <div class="permission-main">
                  <span class="permission-name">{{ permission.name }}</span>
                  <el-tag :type="getPermissionTypeColor(permission.type)" size="small" class="permission-tag">
                    {{ getPermissionTypeLabel(permission.type) }}
                  </el-tag>
                </div>
                <div v-if="permission.description || permission.code" class="permission-meta">
                  <span v-if="permission.description" class="meta-text">{{ permission.description }}</span>
                  <span v-if="permission.code" class="meta-code">{{ permission.code }}</span>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="Object.keys(displayedCategories).length === 0"
      description="未找到匹配的权限"
      :image-size="80"
    />
  </div>
</template>

<style scoped>
.module-selector-modern {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 65vh;
  overflow: hidden;
}

/* 搜索栏 */
.search-bar {
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: none;
  border: 1px solid #e5e7eb;
  transition: border-color 0.2s;
}

.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper:focus) {
  border-color: #3b82f6;
}

/* 过滤栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  flex-wrap: wrap;
  gap: 12px;
}

.stats-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #6b7280;
}

.stat-text strong {
  color: #111827;
  font-weight: 600;
}

.stat-text.text-primary strong {
  color: #3b82f6;
}

.stat-text.text-warning {
  color: #f59e0b;
}

.stat-divider {
  color: #d1d5db;
}

.type-tabs :deep(.el-radio-button__inner) {
  padding: 4px 12px;
  border: none;
  background: transparent;
}

.type-tabs :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: white;
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 已选栏 */
.selected-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  gap: 12px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  align-items: center;
}

.more-tag {
  font-size: 12px;
  color: #6b7280;
  padding: 0 8px;
}

/* 分类列表 */
.categories-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: calc(65vh - 140px);
}

.category-section {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: white;
}

/* 分类标题 */
.category-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.category-title-bar:hover {
  background: #f3f4f6;
}

.category-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.category-label {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.category-badge {
  font-size: 12px;
  color: #6b7280;
  background: white;
  padding: 2px 8px;
  border-radius: 10px;
}

.category-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 权限列表*/
.permissions-list {
  padding: 4px;
  background: white;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.permission-item:hover {
  background: #f9fafb;
  border-color: #e5e7eb;
}

.permission-item.is-selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.permission-info {
  flex: 1;
  min-width: 0;
}

.permission-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.permission-name {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  flex: 1;
}

.permission-tag {
  flex-shrink: 0;
}

.permission-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-text {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.meta-code {
  font-size: 11px;
  color: #9ca3af;
  font-family: 'Monaco', 'Consolas', monospace;
}

/* 动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 2000px;
  opacity: 1;
}

/* 响应式 */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .stats-inline {
    width: 100%;
  }
  
  .type-tabs {
    width: 100%;
  }
  
  .type-tabs :deep(.el-radio-group) {
    display: flex;
  }
  
  .type-tabs :deep(.el-radio-button) {
    flex: 1;
  }
}
</style>
