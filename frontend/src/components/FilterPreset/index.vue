<template>
  <div class="filter-preset">
    <!-- 预设列表 -->
    <div class="preset-list">
      <div class="preset-header">
        <h4>筛选预设</h4>
        <el-button type="primary" size="small" @click="showCreateDialog = true">
          <Icon icon="lucide:plus" class="mr-1" />
          新建预设
        </el-button>
      </div>
      
      <div class="preset-items">
        <div
          v-for="preset in presets"
          :key="preset.id"
          :class="['preset-item', { active: selectedPreset?.id === preset.id }]"
          @click="selectPreset(preset)"
        >
          <div class="preset-info">
            <div class="preset-name">{{ preset.name }}</div>
            <div class="preset-description">{{ preset.description }}</div>
            <div class="preset-meta">
              <span class="preset-count">{{ preset.filterCount }} 个条件</span>
              <span class="preset-date">{{ formatDate(preset.updatedAt) }}</span>
            </div>
          </div>
          <div class="preset-actions">
            <el-button
              type="text"
              size="small"
              @click.stop="editPreset(preset)"
            >
              <Icon icon="lucide:edit" />
            </el-button>
            <el-button
              type="text"
              size="small"
              @click.stop="deletePreset(preset)"
            >
              <Icon icon="lucide:trash-2" />
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑预设对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingPreset ? '编辑预设' : '新建预设'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="presetForm"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="预设名称" prop="name">
          <el-input
            v-model="presetForm.name"
            placeholder="请输入预设名称"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="presetForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入预设描述"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="presetForm.tags"
            multiple
            filterable
            allow-create
            placeholder="选择或创建标签"
            class="w-full"
          >
            <el-option
              v-for="tag in availableTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="savePreset" :loading="saving">
          {{ editingPreset ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="showDeleteDialog"
      title="确认删除"
      width="400px"
    >
      <div class="delete-content">
        <Icon icon="lucide:alert-triangle" class="delete-icon" />
        <p>确定要删除预设 "{{ deletingPreset?.name }}" 吗？</p>
        <p class="delete-warning">此操作不可恢复</p>
      </div>
      
      <template #footer>
        <el-button @click="showDeleteDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete" :loading="deleting">
          删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import type { FormInstance, FormRules } from 'element-plus'

// Props
interface Props {
  modelValue?: any
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({})
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any]
  'preset-select': [preset: any]
  'preset-save': [preset: any]
  'preset-delete': [preset: any]
}>()

// 响应式数据
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editingPreset = ref(null)
const deletingPreset = ref(null)
const selectedPreset = ref(null)

const formRef = ref<FormInstance>()

const presetForm = reactive({
  name: '',
  description: '',
  tags: []
})

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入预设名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { max: 200, message: '描述不能超过 200 个字符', trigger: 'blur' }
  ]
}

// 预设数据
const presets = ref([
  {
    id: 1,
    name: '热门标签筛选',
    description: '筛选当前最热门的标签',
    filterCount: 5,
    tags: ['热门', '推荐'],
    filters: {
      cooperationRequest: {
        contentType: { value: 'shortVideo' },
        industry: { value: ['beauty', 'fashion'] }
      }
    },
    createdAt: '2025-09-24T10:00:00Z',
    updatedAt: '2025-09-24T10:00:00Z'
  },
  {
    id: 2,
    name: '美妆达人筛选',
    description: '专门筛选美妆相关的达人标签',
    filterCount: 8,
    tags: ['美妆', '达人'],
    filters: {
      cooperationRequest: {
        contentType: { value: 'shortVideo' },
        industry: { value: ['beauty'] }
      },
      matchingDegree: {
        talentTypes: [{ value: 'beauty' }]
      }
    },
    createdAt: '2025-09-24T09:00:00Z',
    updatedAt: '2025-09-24T09:00:00Z'
  },
  {
    id: 3,
    name: '高性价比筛选',
    description: '筛选性价比高的合作标签',
    filterCount: 6,
    tags: ['性价比', '合作'],
    filters: {
      costEffectiveness: {
        cooperationData: [
          { value: 'high' }
        ]
      }
    },
    createdAt: '2025-09-24T08:00:00Z',
    updatedAt: '2025-09-24T08:00:00Z'
  }
])

const availableTags = ref([
  '热门', '推荐', '美妆', '达人', '性价比', '合作', '时尚', '美食', '科技', '运动'
])

// 方法
const selectPreset = (preset: any) => {
  selectedPreset.value = preset
  emit('preset-select', preset)
  ElMessage.success(`已选择预设: ${preset.name}`)
}

const editPreset = (preset: any) => {
  editingPreset.value = preset
  presetForm.name = preset.name
  presetForm.description = preset.description
  presetForm.tags = [...preset.tags]
  showCreateDialog.value = true
}

const deletePreset = (preset: any) => {
  deletingPreset.value = preset
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!deletingPreset.value) return
  
  try {
    deleting.value = true
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const index = presets.value.findIndex(p => p.id === deletingPreset.value.id)
    if (index > -1) {
      presets.value.splice(index, 1)
    }
    
    emit('preset-delete', deletingPreset.value)
    ElMessage.success('预设删除成功')
    showDeleteDialog.value = false
    deletingPreset.value = null
  } catch (error) {
    ElMessage.error('删除失败')
  } finally {
    deleting.value = false
  }
}

const savePreset = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    saving.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const presetData = {
      name: presetForm.name,
      description: presetForm.description,
      tags: presetForm.tags,
      filters: props.modelValue,
      filterCount: Object.keys(props.modelValue).length,
      updatedAt: new Date().toISOString()
    }
    
    if (editingPreset.value) {
      // 更新现有预设
      const index = presets.value.findIndex(p => p.id === editingPreset.value.id)
      if (index > -1) {
        presets.value[index] = {
          ...presets.value[index],
          ...presetData
        }
      }
      ElMessage.success('预设更新成功')
    } else {
      // 创建新预设
      const newPreset = {
        id: Date.now(),
        ...presetData,
        createdAt: new Date().toISOString()
      }
      presets.value.unshift(newPreset)
      ElMessage.success('预设创建成功')
    }
    
    emit('preset-save', presetData)
    showCreateDialog.value = false
    resetForm()
  } catch (error) {
    console.error('保存预设失败:', error)
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  editingPreset.value = null
  presetForm.name = ''
  presetForm.description = ''
  presetForm.tags = []
  formRef.value?.resetFields()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.filter-preset {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.preset-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.preset-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--el-fill-color-lighter);
}

.preset-item:hover {
  border-color: var(--el-color-primary-light-7);
  background: var(--el-fill-color-light);
}

.preset-item.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.preset-info {
  flex: 1;
}

.preset-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.preset-description {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.preset-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.preset-actions {
  display: flex;
  gap: 4px;
}

.preset-actions .el-button {
  padding: 4px;
  min-height: auto;
}

.delete-content {
  text-align: center;
  padding: 20px;
}

.delete-icon {
  font-size: 48px;
  color: var(--el-color-warning);
  margin-bottom: 16px;
}

.delete-warning {
  color: var(--el-color-danger);
  font-size: 14px;
  margin-top: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .preset-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .preset-actions {
    align-self: flex-end;
  }
}
</style>
