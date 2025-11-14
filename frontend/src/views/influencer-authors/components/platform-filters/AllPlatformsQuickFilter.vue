<template>
  <div class="all-platforms-quick-filter">
    <div class="filter-placeholder">
      <el-empty description="全部平台筛选条件待补充">
        <template #description>
          <p>全部平台的通用筛选条件正在开发中</p>
          <p style="color: var(--el-text-color-secondary); font-size: 12px; margin-top: 8px;">
            请先选择具体平台查看达人数据
          </p>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  filterChange: [filters: any]
}>()
</script>

<style scoped lang="scss">
.all-platforms-quick-filter {
  background: #ffffff;
  border-radius: 8px;
  padding: 60px 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
  .filter-placeholder {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 250px;
    
    :deep(.el-empty__description) {
      p {
        margin: 0;
        padding: 4px 0;
      }
    }
  }
}
</style>
