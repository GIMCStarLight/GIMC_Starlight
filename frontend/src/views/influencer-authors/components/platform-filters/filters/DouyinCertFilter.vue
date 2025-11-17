<template>
  <div class="filter-row">
    <span class="filter-label">达人认证</span>
    <div class="filter-buttons">
      <el-button
        :type="modelValue === undefined ? 'primary' : ''"
        size="default"
        @click="emit('update:modelValue', undefined)"
      >
        不限
      </el-button>
      <el-button
        v-for="cert in certTypes"
        :key="cert.value"
        :type="modelValue === cert.value ? 'primary' : ''"
        size="default"
        @click="emit('update:modelValue', cert.value)"
      >
        {{ cert.label }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CERT_TYPE_LABELS } from '../douyin-config'

type CertType = 'shenguangxingmei' | 'xingliandaren' | 'excellentAuthor' | 'risingStart' | 'highPotential' | 'blackHorse'

const certTypes = [
  { value: 'shenguangxingmei' as CertType, label: CERT_TYPE_LABELS.shenguangxingmei },
  { value: 'xingliandaren' as CertType, label: CERT_TYPE_LABELS.xingliandaren },
  { value: 'excellentAuthor' as CertType, label: CERT_TYPE_LABELS.excellentAuthor },
  { value: 'risingStart' as CertType, label: CERT_TYPE_LABELS.risingStart },
]

defineProps<{
  modelValue: CertType | undefined
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CertType | undefined): void
}>()
</script>

<style scoped lang="scss">
.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.filter-label {
  min-width: 80px;
  font-weight: 500;
  color: #606266;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
