<template>
  <div class="xiaohongshu-quick-filter">
    <div class="filter-placeholder">
      <el-empty description="小红书平台筛选条件待补充" />
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  filterChange: [filters: any]
}>()
</script>

<style scoped lang="scss">
.xiaohongshu-quick-filter {
  background: #ffffff;
  border-radius: 8px;
  padding: 40px 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
  .filter-placeholder {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
  }
}
</style>
