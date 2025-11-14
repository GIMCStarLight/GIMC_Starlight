<template>
  <div class="kuaishou-grid">
    <el-empty description="快手平台数据展示组件待补充" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  viewMode: 'card' | 'table'
  cardSize: 'compact' | 'standard' | 'detailed'
  loading: boolean
  platform: string
}>()

defineEmits<{
  'update-data': [data: any]
  'evaluate': [data: any]
}>()
</script>

<style scoped lang="scss">
.kuaishou-grid {
  min-height: 400px;
  background: #ffffff;
  border-radius: 8px;
  padding: 40px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
