<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import { getAllMenusApi } from '../../../api/core/menu'
import type { RouteRecordStringComponent } from '@vben/types'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const loading = ref(false)
const menuTree = ref<RouteRecordStringComponent[]>([])
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
    name: '数据管理',
    icon: 'lucide:database',
    color: '#3b82f6',
    keywords: ['kol', 'influencer', 'author', '数据', '列表'],
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
    name: '系统管理',
    icon: 'lucide:settings',
    color: '#8b5cf6',
    keywords: ['system', 'user', 'role', 'permission', '系统', '用户', '角色', '权限'],
  },
  {
    name: '工单管理',
    icon: 'lucide:clipboard-list',
    color: '#ef4444',
    keywords: ['work-order', '工单'],
  },
  {
    name: '其他功能',
    icon: 'lucide:grid',
    color: '#6b7280',
    keywords: ['tag', 'ai', 'dashboard', '标签', '仪表盘'],
  },
]

// 分类菜单项
const categorizedModules = computed(() => {
  const result: Record<string, RouteRecordStringComponent[]> = {}
  
  // 初始化分类
  categories.forEach(cat => {
    result[cat.name] = []
  })
  
  // 分类菜单
  const flattenMenu = (menus: RouteRecordStringComponent[], parentPath = ''): void => {
    menus.forEach(menu => {
      const fullPath = parentPath + (menu.path || '')
      const menuTitle = String(menu.meta?.title || menu.name || '')
      const menuPath = menu.path || ''
      
      // 跳过隐藏的菜单
      if (menu.meta?.hideInMenu) {
        return
      }
      
      // 查找匹配的分类
      let matched = false
      for (const cat of categories) {
        const matchKeyword = cat.keywords.some(keyword => 
          menuTitle.toLowerCase().includes(keyword.toLowerCase()) ||
          menuPath.toLowerCase().includes(keyword.toLowerCase())
        )
        
        if (matchKeyword) {
          result[cat.name].push({
            ...menu,
            path: fullPath,
          })
          matched = true
          break
        }
      }
      
      // 如果没匹配到，放到"其他功能"
      if (!matched && menuTitle) {
        result['其他功能'].push({
          ...menu,
          path: fullPath,
        })
      }
      
      // 递归处理子菜单
      if (menu.children && menu.children.length > 0) {
        flattenMenu(menu.children, fullPath + '/')
      }
    })
  }
  
  flattenMenu(menuTree.value)
  
  return result
})

// 筛选后的分类
const filteredCategories = computed(() => {
  if (!searchKeyword.value) {
    return categorizedModules.value
  }
  
  const result: Record<string, RouteRecordStringComponent[]> = {}
  const keyword = searchKeyword.value.toLowerCase()
  
  Object.entries(categorizedModules.value).forEach(([catName, modules]) => {
    const filtered = modules.filter(m => {
      const title = String(m.meta?.title || '')
      const path = m.path || ''
      return title.toLowerCase().includes(keyword) ||
             path.toLowerCase().includes(keyword)
    })
    
    if (filtered.length > 0) {
      result[catName] = filtered
    }
  })
  
  return result
})

// 加载菜单树
const loadMenuTree = async () => {
  loading.value = true
  try {
    menuTree.value = await getAllMenusApi()
  } catch (error: any) {
    ElMessage.error(error.message || '加载功能模块失败')
  } finally {
    loading.value = false
  }
}

// 切换选中
const toggleModule = (modulePath: string) => {
  const index = selectedModules.value.indexOf(modulePath)
  if (index > -1) {
    selectedModules.value.splice(index, 1)
  } else {
    selectedModules.value.push(modulePath)
  }
  emit('update:modelValue', selectedModules.value)
}

// 是否选中
const isSelected = (modulePath: string) => {
  return selectedModules.value.includes(modulePath)
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
  loadMenuTree()
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
          v-for="path in selectedModules"
          :key="path"
          closable
          type="primary"
          @close="toggleModule(path)"
        >
          {{ path }}
        </el-tag>
      </div>
    </div>

    <!-- 分类列表 -->
    <div class="categories-container">
      <el-collapse v-model="activeCategories" accordion>
        <el-collapse-item
          v-for="(modules, catName) in filteredCategories"
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
              <el-badge :value="modules.length" class="ml-2" />
            </div>
          </template>
          
          <div class="module-list">
            <div
              v-for="module in modules"
              :key="module.path"
              class="module-item"
              :class="{ 'module-item-selected': isSelected(module.path!) }"
              @click="toggleModule(module.path!)"
            >
              <div class="flex items-center gap-2 flex-1">
                <Icon
                  v-if="module.meta?.icon"
                  :icon="module.meta.icon.toString()"
                  :size="16"
                />
                <Icon v-else icon="lucide:file" :size="16" />
                <span class="module-title">{{ module.meta?.title || module.name }}</span>
              </div>
              <Icon
                v-if="isSelected(module.path!)"
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
const activeCategories = ref<string[]>(['数据管理'])
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
