<template>
  <div class="filter-row">
    <span class="filter-label">内容定位</span>
    <div class="filter-content">
      <!-- 一级标签快捷按钮 -->
      <div class="hot-tags">
        <el-button
          :type="modelValue.length === 0 ? 'primary' : ''"
          size="default"
          @click="clearTags"
        >
          不限
        </el-button>
        
        <!-- 一级标签 -->
        <template v-for="category in (showAllTags ? contentTags : contentTags.slice(0, 8))" :key="category.code">
          <el-button
            :type="isTagSelected(category.code) ? 'primary' : ''"
            size="default"
            @click="toggleCategory(category.code)"
          >
            {{ category.category }}
            <span class="tag-count">({{ getCategoryCount(category.code) }})</span>
          </el-button>
        </template>
        
        <!-- 更多/收起按钮 -->
        <el-button 
          v-if="contentTags.length > 8"
          size="default"
          @click="showAllTags = !showAllTags"
        >
          {{ showAllTags ? '收起' : '更多' }}
          <Icon :icon="showAllTags ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="ml-1" />
        </el-button>
      </div>
      
      <!-- 已选标签 -->
      <div v-if="modelValue.length > 0" class="selected-tags">
        <el-tag
          v-for="tag in modelValue"
          :key="tag"
          closable
          type="primary"
          @close="removeTag(tag)"
        >
          {{ getTagDisplayName(tag) }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { DOUYIN_CONTENT_TAGS, type ContentTagCategory } from '../douyin-config'

const contentTags: ContentTagCategory[] = DOUYIN_CONTENT_TAGS
const showAllTags = ref(false)

const props = defineProps<{
  modelValue: string[]
  tagCounts?: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

// 判断标签是否被选中
const isTagSelected = (categoryCode: string) => {
  return props.modelValue.some(tag => tag.startsWith(categoryCode))
}

// 切换分类
const toggleCategory = (categoryCode: string) => {
  const index = props.modelValue.indexOf(categoryCode)
  const newTags = [...props.modelValue]
  
  if (index > -1) {
    newTags.splice(index, 1)
  } else {
    newTags.push(categoryCode)
  }
  
  emit('update:modelValue', newTags)
}

// 移除标签
const removeTag = (tag: string) => {
  const newTags = props.modelValue.filter(t => t !== tag)
  emit('update:modelValue', newTags)
}

// 清空所有标签
const clearTags = () => {
  emit('update:modelValue', [])
}

// 获取分类下的标签数量
const getCategoryCount = (categoryCode: string) => {
  if (!props.tagCounts) return 0
  return props.tagCounts[categoryCode] || 0
}

// 获取标签显示名称
const getTagDisplayName = (tag: string) => {
  const category = contentTags.find(c => c.code === tag)
  if (category) return category.category
  
  // 查找子标签
  for (const cat of contentTags) {
    const child = cat.children?.find(c => c.code === tag)
    if (child) return `${cat.category} - ${child.name}`
  }
  
  return tag
}
</script>

<style scoped lang="scss">
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.filter-label {
  min-width: 80px;
  font-weight: 500;
  color: #606266;
  padding-top: 8px;
}

.filter-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  
  .tag-count {
    margin-left: 4px;
    opacity: 0.7;
    font-size: 12px;
  }
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
