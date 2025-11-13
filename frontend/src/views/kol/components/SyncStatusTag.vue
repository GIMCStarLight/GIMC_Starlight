<template>
  <el-tooltip
    v-if="props.status === 'rejected'"
    content="未匹配到达人公开数据，请检查账号ID等是否正确"
    placement="top"
    effect="dark"
  >
    <el-tag :type="statusConfig.type" :size="size" :effect="effect">
      <el-icon v-if="statusConfig.icon" class="status-icon">
        <component :is="statusConfig.icon" />
      </el-icon>
      <span>{{ statusConfig.text }}</span>
    </el-tag>
  </el-tooltip>
  <el-tag v-else :type="statusConfig.type" :size="size" :effect="effect">
    <el-icon v-if="statusConfig.icon" class="status-icon">
      <component :is="statusConfig.icon" />
    </el-icon>
    <span>{{ statusConfig.text }}</span>
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  CircleCheck, 
  Clock, 
  Loading, 
  CircleClose, 
  QuestionFilled 
} from '@element-plus/icons-vue'

interface Props {
  status: string
  size?: 'small' | 'default' | 'large'
  effect?: 'light' | 'dark' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  effect: 'light'
})

// 状态配置映射
const statusConfig = computed(() => {
  const configs = {
    'unmatched': {
      text: '未匹配',
      type: 'info',
      icon: QuestionFilled
    },
    'pending': {
      text: '待同步',
      type: 'warning',
      icon: Clock
    },
    'in_progress': {
      text: '同步中',
      type: 'primary',
      icon: Loading
    },
    'matched': {
      text: '已匹配',
      type: 'success',
      icon: CircleCheck
    },
    'rejected': {
      text: '同步失败',
      type: 'danger',
      icon: CircleClose
    }
  }
  
  return configs[props.status as keyof typeof configs] || configs.unmatched
})
</script>

<style scoped>
.status-icon {
  margin-right: 4px;
  vertical-align: middle;
}

:deep(.el-tag__content) {
  display: flex;
  align-items: center;
}
</style>
