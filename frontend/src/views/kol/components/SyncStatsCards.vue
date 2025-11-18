<template>
  <el-row :gutter="16" class="stats-cards">
    <el-col :xs="24" :sm="12" :md="6" :lg="4">
      <el-card shadow="hover" class="stat-card stat-total">
        <div class="stat-content">
          <div class="stat-icon">
            <Icon icon="lucide:database" :size="32" />
          </div>
          <div class="stat-info">
            <div class="stat-label">总计</div>
            <div class="stat-value">{{ stats.total }}</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="6" :lg="4">
      <el-card shadow="hover" class="stat-card stat-unmatched">
        <div class="stat-content">
          <div class="stat-icon">
            <Icon icon="lucide:help-circle" :size="32" />
          </div>
          <div class="stat-info">
            <div class="stat-label">未匹配</div>
            <div class="stat-value">{{ stats.unmatched }}</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="6" :lg="4">
      <el-card shadow="hover" class="stat-card stat-pending">
        <div class="stat-content">
          <div class="stat-icon">
            <Icon icon="lucide:clock" :size="32" />
          </div>
          <div class="stat-info">
            <div class="stat-label">待同步</div>
            <div class="stat-value">{{ stats.pending }}</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="6" :lg="4">
      <el-card shadow="hover" class="stat-card stat-matched">
        <div class="stat-content">
          <div class="stat-icon">
            <Icon icon="lucide:check-circle" :size="32" />
          </div>
          <div class="stat-info">
            <div class="stat-label">已匹配</div>
            <div class="stat-value">{{ stats.matched }}</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="6" :lg="4">
      <el-card shadow="hover" class="stat-card stat-rejected">
        <div class="stat-content">
          <div class="stat-icon">
            <Icon icon="lucide:x-circle" :size="32" />
          </div>
          <div class="stat-info">
            <div class="stat-label">同步失败</div>
            <div class="stat-value">{{ stats.rejected }}</div>
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
.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  transition: all 0.3s ease;

  .stat-total & {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .stat-unmatched & {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  .stat-pending & {
    background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
    color: white;
  }

  .stat-matched & {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }

  .stat-rejected & {
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    color: white;
  }
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}
</style>
