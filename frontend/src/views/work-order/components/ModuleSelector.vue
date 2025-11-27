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
    <!-- 顶部搜索和统计 -->
    <div class="selector-header">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索功能模块、权限名称或代码..."
        clearable
        size="large"
        class="search-input"
      >
        <template #prefix>
          <Icon icon="lucide:search" :size="18" />
        </template>
      </el-input>
      
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">权限总数</span>
          <span class="stat-value">{{ totalPermissionCount }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">已选择</span>
          <span class="stat-value text-primary">{{ selectedModules.length }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">已分类</span>
          <span class="stat-value">{{ categorizedCount }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">未分类</span>
          <span class="stat-value text-warning">{{ uncategorizedCount }}</span>
        </div>
      </div>
    </div>

    <!-- 已选模块标签 -->
    <transition name="slide-down">
      <div v-if="selectedModules.length > 0" class="selected-tags">
        <div class="selected-header">
          <span class="selected-title">
            <Icon icon="lucide:check-circle-2" :size="16" />
            已选择 {{ selectedModules.length }} 个权限
          </span>
          <el-button text type="danger" size="small" @click="clearAll">
            <Icon icon="lucide:x" :size="14" class="mr-1" />
            清空
          </el-button>
        </div>
        <div class="selected-list">
          <el-tag
            v-for="permId in selectedModules"
            :key="permId"
            closable
            type="primary"
            size="large"
            class="selected-tag"
            @close="toggleModule(permId)"
          >
            <Icon icon="lucide:shield-check" :size="14" class="mr-1" />
            {{ getSelectedPermissionName(permId) }}
          </el-tag>
        </div>
      </div>
    </transition>

    <!-- 权限类型过滤 -->
    <div class="type-filter">
      <span class="filter-label">权限类型：</span>
      <el-radio-group v-model="typeFilter" size="small" class="type-radio-group">
        <el-radio-button label="all">
          <Icon icon="lucide:layers" :size="14" class="mr-1" />
          全部 ({{ totalPermissionCount }})
        </el-radio-button>
        <el-radio-button label="MENU">
          <Icon icon="lucide:layout-dashboard" :size="14" class="mr-1" />
          菜单 ({{ typeCount.MENU }})
        </el-radio-button>
        <el-radio-button label="BUTTON">
          <Icon icon="lucide:square-mouse-pointer" :size="14" class="mr-1" />
          按钮 ({{ typeCount.BUTTON }})
        </el-radio-button>
        <el-radio-button label="API">
          <Icon icon="lucide:plug" :size="14" class="mr-1" />
          接口 ({{ typeCount.API }})
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 分类卡片网格 -->
    <div class="categories-grid">
      <div
        v-for="(permissions, catName) in displayedCategories"
        :key="catName"
        class="category-card"
        :class="{ 'category-expanded': expandedCategories.includes(catName) }"
      >
        <div 
          class="category-header"
          @click="toggleCategory(catName)"
        >
          <div class="category-info">
            <div 
              class="category-icon-wrapper"
              :style="{ backgroundColor: getCategoryColor(catName) }"
            >
              <Icon :icon="getCategoryIcon(catName)" :size="20" />
            </div>
            <div class="category-title">
              <span class="category-name">{{ catName }}</span>
              <span class="category-count">{{ permissions.length }} 项权限</span>
            </div>
          </div>
          <div class="category-actions">
            <el-button
              text
              size="small"
              @click.stop="selectAllInCategory(catName, permissions)"
            >
              全选
            </el-button>
            <Icon 
              :icon="expandedCategories.includes(catName) ? 'lucide:chevron-up' : 'lucide:chevron-down'" 
              :size="20"
              class="expand-icon"
            />
          </div>
        </div>
        
        <transition name="expand">
          <div v-show="expandedCategories.includes(catName)" class="category-content">
            <div class="permission-grid">
              <div
                v-for="permission in permissions"
                :key="permission.id"
                class="permission-card"
                :class="{ 
                  'permission-selected': isSelected(permission.id),
                  'permission-hover': true
                }"
                @click="toggleModule(permission.id)"
              >
                <div class="permission-checkbox">
                  <el-checkbox 
                    :model-value="isSelected(permission.id)"
                    @click.stop="toggleModule(permission.id)"
                  />
                </div>
                <div class="permission-content">
                  <div class="permission-header">
                    <span class="permission-name">{{ permission.name }}</span>
                    <el-tag 
                      :type="getPermissionTypeColor(permission.type)" 
                      size="small"
                      class="permission-type-tag"
                    >
                      {{ getPermissionTypeLabel(permission.type) }}
                    </el-tag>
                  </div>
                  <div v-if="permission.description" class="permission-desc">
                    {{ permission.description }}
                  </div>
                  <div v-if="permission.code" class="permission-code">
                    <Icon icon="lucide:code" :size="12" />
                    {{ permission.code }}
                  </div>
                  <div v-if="permission.resource" class="permission-resource">
                    <Icon icon="lucide:link" :size="12" />
                    {{ permission.resource }}
                  </div>
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
      :image-size="120"
    >
      <template #image>
        <Icon icon="lucide:search-x" :size="120" style="color: #d1d5db" />
      </template>
    </el-empty>
  </div>
</template>

<style scoped>
.module-selector-modern {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 70vh;
  overflow: hidden;
}

/* 顶部区域 */
.selector-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

/* 统计栏 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.stat-value.text-primary {
  color: #3b82f6;
}

.stat-value.text-warning {
  color: #f59e0b;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: #d1d5db;
}

/* 已选标签区域 */
.selected-tags {
  padding: 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 12px;
  border: 1px solid #bfdbfe;
}

.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selected-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}

.selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-tag {
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  font-size: 13px;
}

/* 类型过滤 */
.type-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
}

.filter-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.type-radio-group :deep(.el-radio-button__inner) {
  border: none;
  background: transparent;
  padding: 8px 16px;
  transition: all 0.3s;
}

.type-radio-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: white;
  color: #3b82f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 分类网格 */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
  overflow-y: auto;
  max-height: calc(70vh - 300px);
  padding-right: 4px;
}

.category-card {
  background: white;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.3s;
}

.category-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.category-expanded {
  border-color: #3b82f6;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  background: #fafafa;
  transition: background 0.3s;
}

.category-header:hover {
  background: #f3f4f6;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.category-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.category-count {
  font-size: 12px;
  color: #6b7280;
}

.category-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  color: #6b7280;
  transition: transform 0.3s;
}

.category-expanded .expand-icon {
  transform: rotate(180deg);
}

.category-content {
  padding: 16px;
  background: white;
}

/* 权限网格 */
.permission-grid {
  display: grid;
  gap: 12px;
}

.permission-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.permission-card:hover {
  border-color: #3b82f6;
  background: #f9fafb;
  transform: translateX(4px);
}

.permission-selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.permission-checkbox {
  flex-shrink: 0;
}

.permission-content {
  flex: 1;
  min-width: 0;
}

.permission-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.permission-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  flex: 1;
}

.permission-type-tag {
  flex-shrink: 0;
}

.permission-desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 4px;
}

.permission-code,
.permission-resource {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9ca3af;
  font-family: 'Monaco', 'Consolas', monospace;
  margin-top: 4px;
}

/* 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}

/* 响应式 */
@media (max-width: 768px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .stat-divider {
    display: none;
  }
}
</style>
