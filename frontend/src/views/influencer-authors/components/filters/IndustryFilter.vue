<template>
  <div class="filter-row industry-filter">
    <span class="filter-label">适配行业</span>
    <div class="filter-content">
      <div class="filter-buttons">
        <el-button 
          :type="modelValue.length === 0 ? 'primary' : ''"
          size="default"
          @click="handleClear"
        >
          不限
        </el-button>
        
        <!-- 第一层分类按钮 -->
        <el-dropdown 
          v-for="category in contentTagsHierarchy.slice(0, 15)"
          :key="category.code"
          trigger="click"
          @command="handleCategorySelect"
        >
          <el-button 
            size="default"
            :type="isCategorySelected(category) ? 'primary' : ''"
          >
            {{ category.category }}
            <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item 
                v-for="tag in category.children"
                :key="tag.code"
                :command="{ category: category.code, tag: tag.name }"
              >
                <el-checkbox 
                  :model-value="modelValue.includes(tag.name)"
                  @click.stop
                >
                  {{ tag.name }}
                </el-checkbox>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 更多分类 -->
        <el-button 
          size="default"
          @click="showMore = !showMore"
        >
          更多
          <Icon :icon="showMore ? 'lucide:chevron-up' : 'lucide:chevron-down'" style="margin-left: 4px" />
        </el-button>
      </div>
      
      <!-- 更多分类展开内容 -->
      <el-collapse-transition>
        <div v-show="showMore" class="more-categories">
          <div class="more-categories-grid">
            <el-dropdown 
              v-for="category in contentTagsHierarchy.slice(15)"
              :key="category.code"
              trigger="click"
              @command="handleCategorySelect"
            >
              <el-button 
                size="default"
                :type="isCategorySelected(category) ? 'primary' : ''"
              >
                {{ category.category }}
                <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    v-for="tag in category.children"
                    :key="tag.code"
                    :command="{ category: category.code, tag: tag.name }"
                  >
                    <el-checkbox 
                      :model-value="modelValue.includes(tag.name)"
                      @click.stop
                    >
                      {{ tag.name }}
                    </el-checkbox>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-collapse-transition>
      
      <!-- 已选标签显示 -->
      <div v-if="modelValue.length > 0" class="selected-tags">
        <el-tag
          v-for="tag in modelValue"
          :key="tag"
          closable
          @close="handleRemove(tag)"
          style="margin-right: 8px"
        >
          {{ tag }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { contentTagsHierarchy, type ContentCategory } from './content-tags-data'

const props = defineProps<{
  modelValue: string[]
  maxTags?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const showMore = ref(false)

const isCategorySelected = (category: ContentCategory) => {
  return category.children.some((tag) => props.modelValue.includes(tag.name))
}

const handleCategorySelect = (command: { category: string; tag: string }) => {
  const newValue = [...props.modelValue]
  const index = newValue.indexOf(command.tag)
  
  if (index > -1) {
    newValue.splice(index, 1)
  } else {
    const maxTags = props.maxTags || 5
    if (newValue.length < maxTags) {
      newValue.push(command.tag)
    }
  }
  
  emit('update:modelValue', newValue)
}

const handleRemove = (tag: string) => {
  const newValue = props.modelValue.filter(t => t !== tag)
  emit('update:modelValue', newValue)
}

const handleClear = () => {
  emit('update:modelValue', [])
}
</script>

<style scoped>
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
}

.industry-filter {
  flex-direction: column;
}

.filter-label {
  min-width: 80px;
  font-weight: 500;
  line-height: 32px;
  color: #606266;
}

.filter-content {
  width: 100%;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.more-categories {
  margin-top: 12px;
}

.more-categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.selected-tags {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
