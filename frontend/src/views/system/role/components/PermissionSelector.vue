<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage, ElCheckbox, ElButton, ElInput, ElRadioGroup, ElRadioButton, ElTag } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import type { PermissionApi } from '../../../../api/core/permission'

const props = defineProps<{
  modelValue: string[]
  permissionTree: PermissionApi.PermissionInfo[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const selectedPermissions = ref<string[]>([])
const searchKeyword = ref('')
const typeFilter = ref<'all' | 'MENU' | 'BUTTON' | 'API' | 'FIELD'>('all')
const expandedCategories = ref<string[]>([])

// 功能分类配置
interface PermissionCategory {
  name: string
  icon: string
  color: string
  keywords: string[]
}

const categories: PermissionCategory[] = [
  {
    name: 'KOL数据管理',
    icon: 'lucide:users',
    color: '#3b82f6',
    keywords: ['kol', 'influencer', 'author', 'data', '达人', '作者', '数据', 'import', 'export'],
  },
  {
    name: '字段权限',
    icon: 'lucide:columns',
    color: '#f97316',
    keywords: ['field', '字段'],
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
    keywords: ['user', 'role', 'permission', '用户', '角色', '权限', 'menu'],
  },
  {
    name: '工单管理',
    icon: 'lucide:clipboard-list',
    color: '#ef4444',
    keywords: ['work-order', '工单', 'ticket'],
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
    keywords: ['ai', 'assistant', 'chat', '助手', '智能', 'bot'],
  },
  {
    name: '搜索功能',
    icon: 'lucide:search',
    color: '#ec4899',
    keywords: ['search', '搜索', 'query'],
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
  let menu = 0, button = 0, api = 0, field = 0
  const countTypes = (permissions: PermissionApi.PermissionInfo[]): void => {
    permissions.forEach(permission => {
      if (permission.status === 1) {
        if (permission.type === 'MENU') menu++
        else if (permission.type === 'BUTTON') button++
        else if (permission.type === 'API') api++
        else if (permission.type === 'FIELD') field++
      }
      if (permission.children && permission.children.length > 0) {
        countTypes(permission.children)
      }
    })
  }
  countTypes(props.permissionTree)
  return { MENU: menu, BUTTON: button, API: api, FIELD: field }
})

// 扁平化权限并分类
const categorizedPermissions = computed(() => {
  const result: Record<string, PermissionApi.PermissionInfo[]> = {}
  
  // 初始化分类
  categories.forEach(cat => {
    result[cat.name] = []
  })
  
  // 扁平化处理权限
  const flattenPermissions = (permissions: PermissionApi.PermissionInfo[]): void => {
    permissions.forEach(permission => {
      // 只取启用的权限
      if (permission.status === 1) {
        const permName = String(permission.name || '')
        const permCode = permission.code || ''
        const permResource = permission.resource || ''
        const permType = permission.type || ''
        
        // 优先按类型分类：FIELD 类型直接放入"字段权限"分类
        if (permType === 'FIELD') {
          result['字段权限'].push(permission)
        } else {
          // 查找匹配的分类
          let matched = false
          for (const cat of categories) {
            if (cat.keywords.length === 0) continue // 跳过"其他功能"
            if (cat.name === '字段权限') continue // 跳过"字段权限"，已经处理过
            
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
          
          // 未匹配的放入"其他功能"
          if (!matched) {
            result['其他功能'].push(permission)
          }
        }
      }
      
      // 递归处理子权限
      if (permission.children && permission.children.length > 0) {
        flattenPermissions(permission.children)
      }
    })
  }
  
  flattenPermissions(props.permissionTree)
  return result
})

// 搜索过滤
const filteredCategories = computed(() => {
  if (!searchKeyword.value) {
    return categorizedPermissions.value
  }
  
  const result: Record<string, PermissionApi.PermissionInfo[]> = {}
  const keyword = searchKeyword.value.toLowerCase()
  
  Object.entries(categorizedPermissions.value).forEach(([catName, permissions]) => {
    const filtered = permissions.filter(p => {
      const name = String(p.name || '').toLowerCase()
      const code = String(p.code || '').toLowerCase()
      const resource = String(p.resource || '').toLowerCase()
      return name.includes(keyword) || code.includes(keyword) || resource.includes(keyword)
    })
    if (filtered.length > 0) {
      result[catName] = filtered
    }
  })
  
  return result
})

// 类型过滤
const displayedCategories = computed(() => {
  let result = filteredCategories.value
  
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
  countPermissions(props.permissionTree)
  return count
})

const selectedCount = computed(() => selectedPermissions.value.length)

const displayedCount = computed(() => {
  return Object.values(displayedCategories.value)
    .reduce((total, perms) => total + perms.length, 0)
})

// 权限选择操作
const isSelected = (permId: string) => {
  return selectedPermissions.value.includes(permId)
}

const togglePermission = (permId: string) => {
  const index = selectedPermissions.value.indexOf(permId)
  if (index > -1) {
    selectedPermissions.value.splice(index, 1)
  } else {
    selectedPermissions.value.push(permId)
  }
  emit('update:modelValue', selectedPermissions.value)
}

// 分类操作
const toggleCategory = (catName: string) => {
  const index = expandedCategories.value.indexOf(catName)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(catName)
  }
}

const selectAllInCategory = (catName: string, permissions: PermissionApi.PermissionInfo[]) => {
  permissions.forEach(perm => {
    if (!isSelected(perm.id)) {
      selectedPermissions.value.push(perm.id)
    }
  })
  emit('update:modelValue', selectedPermissions.value)
}

const deselectAllInCategory = (catName: string, permissions: PermissionApi.PermissionInfo[]) => {
  permissions.forEach(perm => {
    const index = selectedPermissions.value.indexOf(perm.id)
    if (index > -1) {
      selectedPermissions.value.splice(index, 1)
    }
  })
  emit('update:modelValue', selectedPermissions.value)
}

// 批量操作
const selectAll = () => {
  const allPermIds: string[] = []
  const collectIds = (permissions: PermissionApi.PermissionInfo[]): void => {
    permissions.forEach(permission => {
      if (permission.status === 1) {
        allPermIds.push(permission.id)
      }
      if (permission.children && permission.children.length > 0) {
        collectIds(permission.children)
      }
    })
  }
  collectIds(props.permissionTree)
  selectedPermissions.value = [...allPermIds]
  emit('update:modelValue', selectedPermissions.value)
}

const deselectAll = () => {
  selectedPermissions.value = []
  emit('update:modelValue', selectedPermissions.value)
}

// 获取权限类型标签
const getPermissionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    MENU: '菜单',
    BUTTON: '按钮',
    API: '接口',
    FIELD: '字段',
  }
  return labels[type] || type
}

const getPermissionTypeColor = (type: string) => {
  const colors: Record<string, any> = {
    MENU: '',
    BUTTON: 'success',
    API: 'warning',
    FIELD: 'danger',
  }
  return colors[type] || 'info'
}

const getCategoryIcon = (catName: string) => {
  return categories.find(c => c.name === catName)?.icon || 'lucide:folder'
}

const getCategoryColor = (catName: string) => {
  return categories.find(c => c.name === catName)?.color || '#6b7280'
}

// 初始化
onMounted(() => {
  selectedPermissions.value = [...props.modelValue]
  // 默认展开第一个有权限的分类
  const firstCategory = Object.keys(displayedCategories.value)[0]
  if (firstCategory) {
    expandedCategories.value.push(firstCategory)
  }
})

// 监听外部变化
watch(() => props.modelValue, (newVal) => {
  selectedPermissions.value = [...newVal]
})

// 自动展开搜索结果
watch(searchKeyword, (newVal) => {
  if (newVal) {
    // 搜索时展开所有有结果的分类
    expandedCategories.value = Object.keys(displayedCategories.value)
  }
})
</script>

<template>
  <div class="permission-selector">
    <!-- 顶部统计和操作栏 -->
    <div class="selector-header">
      <div class="stats-bar">
        <div class="stat-item">
          <Icon icon="lucide:database" :size="16" />
          <span>总权限: <strong>{{ totalPermissionCount }}</strong></span>
        </div>
        <div class="stat-item">
          <Icon icon="lucide:check-circle" :size="16" />
          <span>已选: <strong class="text-primary">{{ selectedCount }}</strong></span>
        </div>
        <div class="stat-item">
          <Icon icon="lucide:filter" :size="16" />
          <span>显示: <strong>{{ displayedCount }}</strong></span>
        </div>
      </div>
      
      <div class="action-buttons">
        <ElButton text size="small" @click="selectAll">
          <Icon icon="lucide:check-square" :size="14" class="mr-1" />
          全选
        </ElButton>
        <ElButton text size="small" @click="deselectAll">
          <Icon icon="lucide:x-square" :size="14" class="mr-1" />
          清空
        </ElButton>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <ElInput
        v-model="searchKeyword"
        placeholder="搜索权限名称、代码或资源..."
        clearable
        class="search-input"
      >
        <template #prefix>
          <Icon icon="lucide:search" :size="16" />
        </template>
      </ElInput>

      <div class="type-filter">
        <ElRadioGroup v-model="typeFilter" size="small">
          <ElRadioButton label="all">
            全部 ({{ totalPermissionCount }})
          </ElRadioButton>
          <ElRadioButton label="MENU">
            菜单 ({{ typeCount.MENU }})
          </ElRadioButton>
          <ElRadioButton label="BUTTON">
            按钮 ({{ typeCount.BUTTON }})
          </ElRadioButton>
          <ElRadioButton label="API">
            接口 ({{ typeCount.API }})
          </ElRadioButton>
          <ElRadioButton label="FIELD">
            字段 ({{ typeCount.FIELD }})
          </ElRadioButton>
        </ElRadioGroup>
      </div>
    </div>

    <!-- 权限分类列表 -->
    <div class="categories-container">
      <div
        v-for="([catName, permissions]) in Object.entries(displayedCategories)"
        :key="catName"
        class="category-section"
      >
        <!-- 分类标题栏 -->
        <div class="category-header" @click="toggleCategory(catName)">
          <div class="category-left">
            <div class="category-dot" :style="{ backgroundColor: getCategoryColor(catName) }"></div>
            <Icon :icon="getCategoryIcon(catName)" :size="16" />
            <span class="category-name">{{ catName }}</span>
            <span class="category-count">{{ permissions.length }}</span>
          </div>
          
          <div class="category-right">
            <ElButton 
              text 
              size="small" 
              @click.stop="selectAllInCategory(catName, permissions)"
            >
              全选
            </ElButton>
            <ElButton 
              text 
              size="small" 
              @click.stop="deselectAllInCategory(catName, permissions)"
            >
              清除
            </ElButton>
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
              @click="togglePermission(permission.id)"
            >
              <ElCheckbox 
                :model-value="isSelected(permission.id)"
                @click.stop="togglePermission(permission.id)"
              />
              
              <div class="permission-content">
                <div class="permission-main">
                  <span class="permission-name">{{ permission.name }}</span>
                  <ElTag 
                    :type="getPermissionTypeColor(permission.type)" 
                    size="small"
                  >
                    {{ getPermissionTypeLabel(permission.type) }}
                  </ElTag>
                </div>
                
                <div class="permission-meta">
                  <!-- 权限代码 -->
                  <span v-if="permission.code" class="meta-code">
                    <Icon icon="lucide:code" :size="12" />
                    {{ permission.code }}
                  </span>
                  
                  <!-- 页面位置描述 (高亮显示) -->
                  <span v-if="permission.frontendMeta?.pageLocation" class="meta-location">
                    <Icon icon="lucide:map-pin" :size="12" />
                    {{ permission.frontendMeta.pageLocation }}
                  </span>
                  
                  <!-- 前端路由 -->
                  <span v-if="permission.frontendMeta?.routePath" class="meta-route">
                    <Icon icon="lucide:route" :size="12" />
                    {{ permission.frontendMeta.routePath }}
                  </span>
                  
                  <!-- 业务模块 -->
                  <span v-if="permission.frontendMeta?.businessModule" class="meta-module">
                    <Icon icon="lucide:package" :size="12" />
                    {{ permission.frontendMeta.businessModule }}
                  </span>
                  
                  <!-- 资源和描述 (降低优先级) -->
                  <span v-if="permission.resource" class="meta-text">
                    资源: {{ permission.resource }}
                  </span>
                  <span v-if="permission.description" class="meta-text">
                    {{ permission.description }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- 空状态 -->
      <div v-if="Object.keys(displayedCategories).length === 0" class="empty-state">
        <Icon icon="lucide:search-x" :size="48" />
        <p>未找到匹配的权限</p>
        <p class="text-sm">请尝试调整搜索关键词或筛选条件</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.permission-selector {
  display: flex;
  flex-direction: column;
  height: 65vh;
  max-height: 650px;
  min-height: 500px;
}

/* 顶部统计栏 */
.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px 6px 0 0;
  border-bottom: none;
}

.stats-bar {
  display: flex;
  gap: 20px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.stat-item strong {
  color: #111827;
  font-weight: 600;
}

.text-primary {
  color: #3b82f6 !important;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

/* 搜索筛选栏 */
.filter-bar {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-top: none;
}

.search-input {
  flex: 1;
  max-width: 300px;
}

.type-filter {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

/* 分类容器 */
.categories-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.category-section {
  margin-bottom: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: white;
}

.category-section:last-child {
  margin-bottom: 0;
}

/* 分类标题 */
.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.category-header:hover {
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

.category-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.category-count {
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

/* 权限列表 */
.permissions-list {
  padding: 4px;
  background: white;
  max-height: 350px;
  overflow-y: auto;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  margin: 4px 0;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.permission-item:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.permission-item.is-selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.permission-content {
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

.permission-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-text {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.4;
}

.meta-code {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9ca3af;
  font-family: 'Monaco', 'Consolas', monospace;
}

/* 前端元数据样式 - 高亮显示 */
.meta-location {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #3b82f6;
  font-weight: 500;
  line-height: 1.5;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.meta-route {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #059669;
  font-family: 'Monaco', 'Consolas', monospace;
}

.meta-module {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #8b5cf6;
  background: #f5f3ff;
  padding: 2px 6px;
  border-radius: 3px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #9ca3af;
  text-align: center;
}

.empty-state p {
  margin: 8px 0;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
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

/* 滚动条样式 */
.categories-container::-webkit-scrollbar,
.permissions-list::-webkit-scrollbar {
  width: 6px;
}

.categories-container::-webkit-scrollbar-thumb,
.permissions-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.categories-container::-webkit-scrollbar-thumb:hover,
.permissions-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 响应式 */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }
  
  .search-input {
    max-width: none;
  }
  
  .type-filter {
    justify-content: flex-start;
  }
}
</style>
