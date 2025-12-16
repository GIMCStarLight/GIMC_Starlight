<template>
  

  <!-- 新的布局样式 - 参考 KolDetailDialog.vue 103-112 行 -->
  <el-row :gutter="32" class="stats-cards" justify="center">
    <el-col :xs="24" :sm="12" :md="8" :lg="4" :xl="4">
      <el-card shadow="never">
        <div class="price-info-item">
          <span class="price-info-label">总计</span>
          <div class="price-info-value">
            <span class="price-amount">
              <span class="price-number">{{ stats.total }}</span>
            </span>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="8" :lg="4" :xl="4">
      <el-card shadow="never">
        <div class="price-info-item">
          <span class="price-info-label">未匹配</span>
          <div class="price-info-value">
            <span class="price-amount">
              <span class="price-number">{{ stats.unmatched }}</span>
            </span>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="8" :lg="4" :xl="4">
      <el-card shadow="never">
        <div class="price-info-item">
          <span class="price-info-label">待同步</span>
          <div class="price-info-value">
            <span class="price-amount">
              <span class="price-number">{{ stats.pending }}</span>
            </span>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="8" :lg="4" :xl="4">
      <el-card shadow="never">
        <div class="price-info-item">
          <span class="price-info-label">已匹配</span>
          <div class="price-info-value">
            <span class="price-amount">
              <span class="price-number">{{ stats.matched }}</span>
            </span>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="8" :lg="4" :xl="4">
      <el-card shadow="never">
        <div class="price-info-item">
          <span class="price-info-label">同步失败</span>
          <div class="price-info-value">
            <span class="price-amount">
              <span class="price-number">{{ stats.rejected }}</span>
            </span>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { IconifyIcon as Icon } from '@vben/icons'

interface SyncStats {
  total: number
  unmatched: number
  pending: number
  matched: number
  rejected: number
}

defineOptions({
  name: 'SyncStatsCards',
})

defineProps<{
  stats: SyncStats
}>()
</script>

<style scoped lang="scss">
// 新的样式 - 参考 KolDetailDialog.vue
.stats-cards {
  margin-bottom: 20px;
}

.price-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-info-label {
  color: #909399;
  font-size: 16px;
  font-weight: 500;
}

.price-info-value {
  margin-top: 4px;
}

.price-amount {
  font-size: 20px;
  font-weight: 400;
  color: #409eff;

  &.empty {
    font-size: 16px;
    color: #999;
    font-weight: 500;
  }
}

.price-number {
  margin-left: 2px;
}
</style>
