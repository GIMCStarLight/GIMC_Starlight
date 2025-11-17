<template>
  <div class="tag-selector">
    <!-- 平台选择 -->
    <div class="platform-selector mb-4">
      <el-radio-group v-model="selectedPlatform" @change="handlePlatformChange">
        <el-radio-button label="星图">星图</el-radio-button>
        <el-radio-button label="花火">花火</el-radio-button>
        <el-radio-button label="蒲公英">蒲公英</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 搜索框 -->
    <div class="search-box mb-4">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索标签..."
        prefix-icon="Search"
        clearable
        @input="handleSearch"
      />
    </div>

    <!-- 面包屑导航 -->
    <div v-if="breadcrumbs.length > 0" class="breadcrumb mb-4">
      <el-breadcrumb separator=">">
        <el-breadcrumb-item 
          v-for="(item, index) in breadcrumbs" 
          :key="item.id"
          class="cursor-pointer"
          @click="handleBreadcrumbClick(index)"
        >
          {{ item.name }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 标签选择区域 -->
    <div class="tag-selection-area">
      <el-row :gutter="16">
        <!-- 左侧：当前层级标签列表 -->
        <el-col :span="12">
          <div class="tag-list-panel">
            <div class="panel-header">
              <h4>{{ currentLevelTitle }}</h4>
              <el-button 
                v-if="currentParent"
                type="text" 
                size="small"
                @click="goBack"
              >
                <el-icon><ArrowLeft /></el-icon>
                返回上级
              </el-button>
            </div>
            
            <div class="tag-list" v-loading="loading">
              <div 
                v-for="tag in currentLevelTags" 
                :key="tag.id"
                class="tag-item"
                :class="{
                  'selected': selectedTags.some(t => t.id === tag.id),
                  'has-children': tag.children && tag.children.length > 0
                }"
                @click="handleTagClick(tag)"
              >
                <div class="tag-content">
                  <el-checkbox 
                    :model-value="selectedTags.some(t => t.id === tag.id)"
                    @change="(checked) => handleTagSelect(tag, checked)"
                    @click.stop
                  >
                    {{ tag.name }}
                  </el-checkbox>
                  
                  <div class="tag-actions">
                    <el-icon 
                      v-if="tag.children && tag.children.length > 0" 
                      class="expand-icon"
                    >
                      <ArrowRight />
                    </el-icon>
                    <el-tag v-if="tag.level" size="small" type="info">
                      L{{ tag.level }}
                    </el-tag>
                  </div>
                </div>
                
                <div v-if="tag.description" class="tag-description">
                  {{ tag.description }}
                </div>
              </div>
              
              <el-empty v-if="!loading && currentLevelTags.length === 0" description="暂无标签" />
            </div>
          </div>
        </el-col>
        
        <!-- 右侧：已选标签 -->
        <el-col :span="12">
          <div class="selected-tags-panel">
            <div class="panel-header">
              <h4>已选标签 ({{ selectedTags.length }})</h4>
              <el-button 
                v-if="selectedTags.length > 0"
                type="text" 
                size="small"
                @click="clearAllSelected"
              >
                清空全部
              </el-button>
            </div>
            
            <div class="selected-tags-list">
              <div 
                v-for="tag in selectedTags" 
                :key="tag.id"
                class="selected-tag-item"
              >
                <div class="tag-path">
                  <el-tag 
                    closable
                    @close="handleTagRemove(tag)"
                  >
                    {{ tag.fullPath || tag.name }}
                  </el-tag>
                </div>
                
                <div class="tag-meta">
                  <el-text size="small" type="info">
                    {{ tag.platform }} · L{{ tag.level }}
                  </el-text>
                </div>
              </div>
              
              <el-empty v-if="selectedTags.length === 0" description="暂未选择标签" />
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 底部操作栏 -->
    <div class="footer-actions mt-4">
      <el-row justify="space-between">
        <el-col :span="12">
          <el-text type="info">
            已选择 {{ selectedTags.length }} 个标签
          </el-text>
        </el-col>
        <el-col :span="12" class="text-right">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" @click="handleConfirm">
            确定 ({{ selectedTags.length }})
          </el-button>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Search } from '@element-plus/icons-vue'
import { getTagTreeByPlatform, getTags, type Tag, type TagTreeNode } from '#/api/tag'

interface Props {
  /** 默认选中的标签 */
  modelValue?: Tag[]
  /** 默认平台 */
  defaultPlatform?: string
  /** 是否多选 */
  multiple?: boolean
  /** 最大选择数量 */
  maxCount?: number
  /** 是否显示平台选择器 */
  showPlatformSelector?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: Tag[]): void
  (e: 'change', value: Tag[]): void
  (e: 'confirm', value: Tag[]): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  defaultPlatform: '星图',
  multiple: true,
  maxCount: 50,
  showPlatformSelector: true
})

const emit = defineEmits<Emits>()

// 响应式数据
const selectedPlatform = ref(props.defaultPlatform)
const searchKeyword = ref('')
const loading = ref(false)
const tagTree = ref<TagTreeNode[]>([])
const currentParent = ref<TagTreeNode | null>(null)
const breadcrumbs = ref<TagTreeNode[]>([])
const selectedTags = ref<Tag[]>([...props.modelValue])

// 计算属性
const currentLevelTags = computed(() => {
  if (searchKeyword.value) {
    // 搜索模式：返回匹配的标签
    return searchTags(tagTree.value, searchKeyword.value)
  }
  
  if (currentParent.value) {
    return currentParent.value.children || []
  }
  
  return tagTree.value
})

const currentLevelTitle = computed(() => {
  if (searchKeyword.value) {
    return `搜索结果 "${searchKeyword.value}"`
  }
  
  if (currentParent.value) {
    return currentParent.value.name
  }
  
  return `${selectedPlatform.value} - 根级标签`
})

// 方法
const loadTagTree = async () => {
  try {
    loading.value = true
    tagTree.value = await getTagTreeByPlatform(selectedPlatform.value)
  } catch (error) {
    log.error('加载标签树失败:', error)
    ElMessage.error('加载标签失败')
  } finally {
    loading.value = false
  }
}

const searchTags = (tags: TagTreeNode[], keyword: string): TagTreeNode[] => {
  const result: TagTreeNode[] = []
  
  const search = (nodes: TagTreeNode[]) => {
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(keyword.toLowerCase())) {
        result.push(node)
      }
      if (node.children) {
        search(node.children)
      }
    }
  }
  
  search(tags)
  return result
}

const handlePlatformChange = () => {
  currentParent.value = null
  breadcrumbs.value = []
  searchKeyword.value = ''
  loadTagTree()
}

const handleSearch = () => {
  // 搜索时重置导航
  if (searchKeyword.value) {
    currentParent.value = null
    breadcrumbs.value = []
  }
}

const handleTagClick = (tag: TagTreeNode) => {
  if (tag.children && tag.children.length > 0) {
    // 有子标签，进入下一级
    currentParent.value = tag
    breadcrumbs.value.push(tag)
    searchKeyword.value = ''
  }
}

const handleTagSelect = (tag: Tag, checked: boolean) => {
  if (checked) {
    if (!props.multiple) {
      selectedTags.value = [tag]
    } else if (selectedTags.value.length < props.maxCount) {
      selectedTags.value.push(tag)
    } else {
      ElMessage.warning(`最多只能选择 ${props.maxCount} 个标签`)
      return
    }
  } else {
    const index = selectedTags.value.findIndex(t => t.id === tag.id)
    if (index > -1) {
      selectedTags.value.splice(index, 1)
    }
  }
  
  emit('update:modelValue', selectedTags.value)
  emit('change', selectedTags.value)
}

const handleTagRemove = (tag: Tag) => {
  const index = selectedTags.value.findIndex(t => t.id === tag.id)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
    emit('update:modelValue', selectedTags.value)
    emit('change', selectedTags.value)
  }
}

const handleBreadcrumbClick = (index: number) => {
  if (index === -1) {
    // 回到根级
    currentParent.value = null
    breadcrumbs.value = []
  } else {
    // 回到指定层级
    currentParent.value = breadcrumbs.value[index]
    breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  }
  searchKeyword.value = ''
}

const goBack = () => {
  if (breadcrumbs.value.length > 1) {
    breadcrumbs.value.pop()
    currentParent.value = breadcrumbs.value[breadcrumbs.value.length - 1]
  } else {
    currentParent.value = null
    breadcrumbs.value = []
  }
  searchKeyword.value = ''
}

const clearAllSelected = () => {
  selectedTags.value = []
  emit('update:modelValue', selectedTags.value)
  emit('change', selectedTags.value)
}

const handleConfirm = () => {
  emit('confirm', selectedTags.value)
}

const handleCancel = () => {
  emit('cancel')
}

// 监听器
watch(() => props.modelValue, (newValue) => {
  selectedTags.value = [...newValue]
}, { deep: true })

// 生命周期
onMounted(() => {
  loadTagTree()
})
</script>

<style scoped>
.tag-selector {
  @apply w-full;
import { log } from '#/utils/logger';
}

.platform-selector {
  @apply flex justify-center;
}

.search-box {
  @apply w-full;
}

.breadcrumb {
  @apply p-2 bg-gray-50 rounded;
}

.tag-selection-area {
  @apply min-h-96;
}

.tag-list-panel,
.selected-tags-panel {
  @apply border border-gray-200 rounded-lg;
}

.panel-header {
  @apply flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50;
}

.panel-header h4 {
  @apply m-0 text-base font-medium;
}

.tag-list {
  @apply p-2 max-h-80 overflow-y-auto;
}

.tag-item {
  @apply p-3 border border-gray-100 rounded-lg mb-2 cursor-pointer transition-all;
}

.tag-item:hover {
  @apply border-blue-300 bg-blue-50;
}

.tag-item.selected {
  @apply border-blue-500 bg-blue-100;
}

.tag-item.has-children {
  @apply border-l-4 border-l-green-400;
}

.tag-content {
  @apply flex justify-between items-center;
}

.tag-actions {
  @apply flex items-center gap-2;
}

.expand-icon {
  @apply text-green-500;
}

.tag-description {
  @apply text-sm text-gray-500 mt-1;
}

.selected-tags-list {
  @apply p-2 max-h-80 overflow-y-auto;
}

.selected-tag-item {
  @apply p-2 border border-gray-100 rounded mb-2;
}

.tag-path {
  @apply mb-1;
}

.tag-meta {
  @apply text-xs;
}

.footer-actions {
  @apply pt-4 border-t border-gray-200;
}
</style>