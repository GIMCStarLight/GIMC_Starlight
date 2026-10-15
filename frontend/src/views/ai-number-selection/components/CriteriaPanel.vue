<template>
  <section class="criteria-card">
    <div class="section-heading">
      <div class="title-block">
        <div class="title-icon"><el-icon><Filter /></el-icon></div>
        <div>
          <h2>已解析需求</h2>
          <p>以下条件将参与本轮筛选和评分</p>
        </div>
      </div>
      <el-button class="reset-button" text @click="$emit('reset')">
        <el-icon><RefreshLeft /></el-icon>
        重置
      </el-button>
    </div>

    <div class="criteria-content">
      <div class="criteria-chips">
        <button
          v-for="chip in chips"
          :key="chip.key"
          class="criteria-chip"
          :class="[`tone-${chip.tone || 'default'}`]"
          type="button"
          @click="$emit('remove', chip.key)"
        >
          <span>{{ chip.label }}</span>
          <el-icon><Close /></el-icon>
        </button>
        <span v-if="chips.length === 0" class="no-criteria">暂无有效条件</span>
      </div>

      <div v-if="warnings.length" class="warning-list">
        <div v-for="warning in warnings" :key="warning.text" class="warning-item">
          <el-icon><Warning /></el-icon>
          <div>
            <strong>“{{ warning.text }}”暂未参与计算</strong>
            <span>{{ warning.reason }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Close, Filter, RefreshLeft, Warning } from '@element-plus/icons-vue';

import type { CriteriaChip, UnsupportedRequirement } from '../types';

defineProps<{
  chips: CriteriaChip[];
  warnings: UnsupportedRequirement[];
}>();

defineEmits<{
  remove: [key: string];
  reset: [];
}>();
</script>

<style scoped>
.criteria-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #ebeaf1;
  border-radius: 18px;
  box-shadow: 0 10px 32px rgba(33, 35, 48, 0.05);
}

.section-heading {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 16px;
  border-bottom: 1px solid #f0eff4;
}

.title-block {
  display: flex;
  gap: 12px;
  align-items: center;
}

.title-icon {
  display: grid;
  width: 38px;
  height: 38px;
  color: #7259ed;
  background: #f0edff;
  border-radius: 12px;
  place-items: center;
}

h2 {
  margin: 0;
  font-size: 17px;
  color: #2a2d39;
}

.title-block p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9699a4;
}

.reset-button {
  color: #7c5cff;
}

.criteria-content {
  padding: 18px 22px 20px;
}

.criteria-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.criteria-chip {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 8px 11px;
  font-size: 13px;
  color: #4b4e5b;
  cursor: pointer;
  background: #f7f7fa;
  border: 1px solid #e7e7ed;
  border-radius: 10px;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.criteria-chip:hover {
  background: #f1efff;
  border-color: #cfc6ff;
}

.criteria-chip .el-icon {
  color: #a5a7b1;
}

.criteria-chip.tone-goal {
  color: #624ad8;
  background: #f2efff;
  border-color: #dcd4ff;
}

.criteria-chip.tone-danger {
  color: #c45462;
  background: #fff3f4;
  border-color: #ffd8dd;
}

.no-criteria {
  font-size: 13px;
  color: #a2a5ae;
}

.warning-list {
  display: grid;
  gap: 8px;
  margin-top: 15px;
}

.warning-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 11px 13px;
  color: #815f19;
  background: #fff9eb;
  border: 1px solid #f4e2b8;
  border-radius: 11px;
}

.warning-item > .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #d79b22;
}

.warning-item div {
  display: flex;
  flex-direction: column;
}

.warning-item strong {
  font-size: 12px;
}

.warning-item span {
  margin-top: 3px;
  font-size: 12px;
  color: #9b7a38;
}
</style>
