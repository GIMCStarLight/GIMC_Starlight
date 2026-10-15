<template>
  <el-drawer
    :model-value="modelValue"
    direction="rtl"
    size="420px"
    title="评分依据"
    @close="$emit('update:modelValue', false)"
  >
    <template v-if="candidate">
      <div class="drawer-hero">
        <div>
          <span>AI 综合匹配分</span>
          <strong>{{ candidate.matchScore }}</strong>
        </div>
        <p>{{ candidate.nickName }}</p>
      </div>

      <div class="method-note">
        分数来自真实字段的相对排名。缺失字段不会计为 0 分，而是降低数据置信度。
      </div>

      <div class="score-list">
        <div
          v-for="item in candidate.scoreBreakdown"
          :key="item.key"
          class="score-item"
        >
          <div class="score-label">
            <span>{{ item.label }}</span>
            <strong>{{ item.score }}/{{ item.max }}</strong>
          </div>
          <el-progress
            :percentage="Math.round((item.score / item.max) * 100)"
            :show-text="false"
            :stroke-width="8"
          />
        </div>
      </div>

      <div class="evidence-section">
        <h4>本次推荐证据</h4>
        <div v-for="reason in candidate.reasons" :key="reason" class="evidence-row">
          <el-icon><CircleCheck /></el-icon>
          <span>{{ reason }}</span>
        </div>
      </div>

      <div class="evidence-section risk-section">
        <h4>数据边界</h4>
        <div v-for="risk in candidate.risks" :key="risk" class="evidence-row">
          <el-icon><Warning /></el-icon>
          <span>{{ risk }}</span>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { CircleCheck, Warning } from '@element-plus/icons-vue';

import type { CandidateRecommendation } from '../types';

defineProps<{
  candidate: CandidateRecommendation | null;
  modelValue: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<style scoped>
.drawer-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 20px;
  color: #fff;
  background: linear-gradient(135deg, #5d4bd7, #9472ff);
  border-radius: 16px;
}

.drawer-hero div {
  display: flex;
  flex-direction: column;
}

.drawer-hero span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.76);
}

.drawer-hero strong {
  margin-top: 2px;
  font-size: 42px;
  line-height: 1;
}

.drawer-hero p {
  margin: 0;
  font-weight: 700;
}

.method-note {
  padding: 12px 14px;
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.65;
  color: #747887;
  background: #f6f6fa;
  border-radius: 10px;
}

.score-list {
  display: grid;
  gap: 18px;
  margin-top: 24px;
}

.score-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #535765;
}

.score-label strong {
  color: #6050c8;
}

.score-item :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #6956e8, #a27eff);
}

.evidence-section {
  padding-top: 20px;
  margin-top: 24px;
  border-top: 1px solid #ececf1;
}

.evidence-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #343744;
}

.evidence-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.55;
  color: #6b6f7d;
}

.evidence-row .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #14a477;
}

.risk-section .evidence-row .el-icon {
  color: #d9a338;
}

@media (max-width: 520px) {
  :deep(.el-drawer) {
    width: 92% !important;
  }
}
</style>
