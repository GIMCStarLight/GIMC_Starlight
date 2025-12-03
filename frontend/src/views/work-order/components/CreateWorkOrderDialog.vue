<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { createWorkOrder, WorkOrderType, WorkOrderPriority } from '../../../api/work-order'
import ModuleSelector from './ModuleSelector.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const attachmentUrl = ref('')

// 表单数据
const formData = reactive({
  title: '',
  description: '',
  type: WorkOrderType.NEW_FEATURE,
  priority: WorkOrderPriority.MEDIUM,
  assignedTo: '',
  expectedCompletionAt: '',
  modules: [] as string[],
  attachments: [] as { name: string; url: string; size: number; type: string }[],
})

// 表单验证规则
const rules: FormRules = {
  title: [
    { required: true, message: '请输入工单标题', trigger: 'blur' },
    { min: 5, max: 200, message: '标题长度应在 5 到 200 个字符之间', trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请输入工单描述', trigger: 'blur' },
    { min: 10, message: '描述至少需要 10 个字符', trigger: 'blur' },
  ],
  type: [
    { required: true, message: '请选择事务类型', trigger: 'change' },
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' },
  ],
}

// 工单类型选项
const typeOptions = [
  { label: '新增功能', value: WorkOrderType.NEW_FEATURE },
  { label: '系统改造', value: WorkOrderType.SYSTEM_REFACTOR },
  { label: '问题调试', value: WorkOrderType.BUG_FIX },
  { label: '性能优化', value: WorkOrderType.OPTIMIZATION },
  { label: '需求变更', value: WorkOrderType.REQUIREMENT_CHANGE },
  { label: '其他', value: WorkOrderType.OTHER },
]

// 优先级选项
const priorityOptions = [
  { label: '低', value: WorkOrderPriority.LOW },
  { label: '中', value: WorkOrderPriority.MEDIUM },
  { label: '高', value: WorkOrderPriority.HIGH },
  { label: '紧急', value: WorkOrderPriority.URGENT },
]

// 重置表单
const resetForm = () => {
  formData.title = ''
  formData.description = ''
  formData.type = WorkOrderType.NEW_FEATURE
  formData.priority = WorkOrderPriority.MEDIUM
  formData.assignedTo = ''
  formData.expectedCompletionAt = ''
  formData.modules = []
  formData.attachments = []
  attachmentUrl.value = ''
  formRef.value?.clearValidate()
}

// 监听对话框关闭
watch(() => props.visible, (val) => {
  if (!val) {
    resetForm()
  }
})

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      const submitData: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
      }

      // 可选字段
      if (formData.assignedTo) {
        submitData.assignedTo = formData.assignedTo
      }
      if (formData.expectedCompletionAt) {
        submitData.expectedCompletionAt = formData.expectedCompletionAt
      }
      if (formData.modules.length > 0) {
        submitData.modules = formData.modules
      }
      
      // 处理附件：如果有输入URL，转换为对象格式
      if (attachmentUrl.value.trim()) {
        submitData.attachments = [{
          name: '附件',
          url: attachmentUrl.value.trim(),
          size: 0,
          type: 'url'
        }]
      }

      await createWorkOrder(submitData)
      ElMessage.success('创建工单成功')
      emit('success')
      emit('update:visible', false)
    } catch (error: any) {
      ElMessage.error(error.message || '创建工单失败')
    } finally {
      loading.value = false
    }
  })
}

// 取消
const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="创建工单"
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="工单标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入工单标题"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="工单描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="请详细描述工单内容"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="事务类型" prop="type">
        <el-select v-model="formData.type" placeholder="请选择事务类型" style="width: 100%">
          <el-option
            v-for="option in typeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="优先级" prop="priority">
        <el-select v-model="formData.priority" placeholder="请选择优先级" style="width: 100%">
          <el-option
            v-for="option in priorityOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="涉及模块">
        <ModuleSelector v-model="formData.modules" />
        <div class="text-xs text-gray-500 mt-1">
          提示：选择工单涉及的功能模块，方便开发人员定位问题
        </div>
      </el-form-item>

      <el-form-item label="预期完成时间">
        <el-date-picker
          v-model="formData.expectedCompletionAt"
          type="datetime"
          placeholder="选择预期完成时间"
          style="width: 100%"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>

      <el-form-item label="附件">
        <el-input
          v-model="attachmentUrl"
          placeholder="附件URL（可选）"
          clearable
        />
        <div class="text-xs text-gray-500 mt-1">
          提示：可以粘贴图片或文件的URL地址
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          确定创建
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
