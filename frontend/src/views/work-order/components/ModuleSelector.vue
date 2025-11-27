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

// 分类权限项
const categorizedModules = computed(() => {
  const result: Record<string, PermissionApi.PermissionInfo[]> = {}
  
  // 初始化分类
  categories.forEach(cat => {
    result[cat.name] = []
  })
  
  // 分类权限（只取MENU类型的权限）
  const flattenPermissions = (permissions: PermissionApi.PermissionInfo[]): void => {
    permissions.forEach(permission => {
      // 只处理MENU类型的权限
      if (permission.type === 'MENU' && permission.status === 1) {
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

// 初始化选中值
onMounted(() => {
  selectedModules.value = [...props.modelValue]
  loadPermissions()
})
</script>

<template>
  <div v-loading="loading" class="module-selector">
    <!-- 搜索框 -->
    <div class="mb-4">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索功能模块..."
        clearable
      >
        <template #prefix>
          <Icon icon="lucide:search" />
        </template>
      </el-input>
    </div>

    <!-- 已选模块 -->
    <div v-if="selectedModules.length > 0" class="mb-4 p-3 bg-blue-50 rounded">
      <div class="text-sm text-gray-600 mb-2">已选择 {{ selectedModules.length }} 个模块：</div>
      <div class="flex flex-wrap gap-2">
        <el-tag
          v-for="permId in selectedModules"
          :key="permId"
          closable
          type="primary"
          @close="toggleModule(permId)"
        >
          {{ getSelectedPermissionName(permId) }}
        </el-tag>
      </div>
    </div>

    <!-- 分类列表 -->
    <div class="categories-container">
      <el-collapse v-model="activeCategories" accordion>
        <el-collapse-item
          v-for="(permissions, catName) in filteredCategories"
          :key="catName"
          :name="catName"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <div
                class="category-icon"
                :style="{ backgroundColor: getCategoryColor(catName) }"
              >
                <Icon :icon="getCategoryIcon(catName)" :size="18" />
              </div>
              <span class="font-medium">{{ catName }}</span>
              <el-badge :value="permissions.length" class="ml-2" />
            </div>
          </template>
          
          <div class="module-list">
            <div
              v-for="permission in permissions"
              :key="permission.id"
              class="module-item"
              :class="{ 'module-item-selected': isSelected(permission.id) }"
              @click="toggleModule(permission.id)"
            >
              <div class="flex items-center gap-2 flex-1">
                <Icon icon="lucide:check-square" :size="16" />
                <div class="flex flex-col">
                  <span class="module-title">{{ permission.name }}</span>
                  <span v-if="permission.description" class="module-desc">{{ permission.description }}</span>
                </div>
              </div>
              <Icon
                v-if="isSelected(permission.id)"
                icon="lucide:check-circle"
                :size="18"
                class="text-blue-500"
              />
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
      
      <el-empty
        v-if="Object.keys(filteredCategories).length === 0"
        description="未找到匹配的功能模块"
      />
    </div>
  </div>
</template>

<script lang="ts">
// 默认展开第一个分类
const activeCategories = ref<string[]>(['KOL数据管理'])
</script>

<style scoped>
.module-selector {
  max-height: 500px;
  overflow-y: auto;
}

.categories-container {
  max-height: 400px;
  overflow-y: auto;
}

.category-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.module-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.module-item:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.module-item-selected {
  border-color: #3b82f6;
  background: #dbeafe;
}

.module-title {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.module-desc {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

.module-item-selected .module-title {
  color: #1e40af;
  font-weight: 500;
}

:deep(.el-collapse-item__header) {
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 8px;
}

:deep(.el-collapse-item__wrap) {
  border: none;
}

:deep(.el-collapse-item__content) {
  padding: 0 16px 12px 16px;
}
</style>
