<template>
  <article class="candidate-card" :class="{ selected }">
    <div class="card-topline">
      <div class="score-badge">
        <strong>{{ candidate.matchScore }}</strong>
        <span>匹配分</span>
      </div>
      <el-checkbox
        :model-value="selected"
        label="加入候选"
        @change="$emit('toggle', candidate.authorId)"
      />
    </div>

    <div class="identity-row">
      <div class="avatar" :style="avatarStyle">
        <span>{{ candidate.nickName.slice(0, 1) }}</span>
      </div>
      <div class="identity-copy">
        <div class="name-row">
          <h3>{{ candidate.nickName }}</h3>
          <span v-if="candidate.ecommerceEnabled" class="commerce-badge">电商</span>
        </div>
        <p>@星图ID：{{ candidate.starId }}</p>
        <span class="location">
          <el-icon><Location /></el-icon>
          {{ candidate.province }}{{ candidate.city }}
        </span>
      </div>
    </div>

    <div class="tag-list">
      <span v-for="tag in candidate.primaryTags" :key="tag">{{ tag }}</span>
    </div>

    <div class="metrics-grid">
      <div>
        <span>粉丝数</span>
        <strong>{{ formatCompact(candidate.follower) }}</strong>
      </div>
      <div>
        <span>20–60秒报价</span>
        <strong>{{ formatCurrency(candidate.price20To60) }}</strong>
      </div>
      <div>
        <span>互动率</span>
        <strong>{{ formatPercent(candidate.interactRate30d) }}</strong>
      </div>
      <div>
        <span>预期播放</span>
        <strong>{{ formatCompact(candidate.expectedPlayNum) }}</strong>
      </div>
    </div>

    <div class="confidence-row">
      <span>数据置信度</span>
      <div class="confidence-track">
        <i :style="{ width: `${Math.round(candidate.dataConfidence * 100)}%` }"></i>
      </div>
      <strong>{{ Math.round(candidate.dataConfidence * 100) }}%</strong>
    </div>

    <div class="reason-block">
      <div class="block-title">
        <el-icon><CircleCheckFilled /></el-icon>
        推荐理由
      </div>
      <ul>
        <li v-for="reason in candidate.reasons.slice(0, 3)" :key="reason">
          {{ reason }}
        </li>
      </ul>
    </div>

    <div v-if="candidate.risks.length" class="risk-line">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ candidate.risks[0] }}</span>
    </div>

    <div class="card-actions">
      <el-button @click="$emit('score', candidate)">
        <el-icon><DataAnalysis /></el-icon>
        评分依据
      </el-button>
      <el-button type="primary" plain @click="$emit('detail', candidate.authorId)">
        查看详情
        <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  ArrowRight,
  CircleCheckFilled,
  DataAnalysis,
  Location,
  WarningFilled,
} from '@element-plus/icons-vue';

import type { CandidateRecommendation } from '../types';

const props = defineProps<{
  candidate: CandidateRecommendation;
  selected: boolean;
}>();

defineEmits<{
  detail: [authorId: string];
  score: [candidate: CandidateRecommendation];
  toggle: [authorId: string];
}>();

const avatarStyle = computed(() => {
  const colors = [
    ['#6d5dfc', '#a991ff'],
    ['#1687ff', '#69c2ff'],
    ['#0aa67d', '#55d6ae'],
    ['#ec6c8d', '#ffad8f'],
    ['#f08b42', '#f4c156'],
    ['#4957d8', '#8f99ff'],
  ];
  const hash = [...props.candidate.authorId].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const palette = colors[hash % colors.length]!;
  return {
    background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
  };
});

function formatCompact(value: number) {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatCurrency(value: number) {
  if (value >= 10_000) return `¥${(value / 10_000).toFixed(1)}万`;
  return `¥${new Intl.NumberFormat('zh-CN').format(value)}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}
</script>

<style scoped>
.candidate-card {
  position: relative;
  display: flex;
  min-width: 0;
  padding: 20px;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e9e9f0;
  border-radius: 18px;
  box-shadow: 0 9px 28px rgba(30, 34, 52, 0.045);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.candidate-card:hover {
  border-color: #cfc8f8;
  box-shadow: 0 16px 38px rgba(61, 51, 119, 0.1);
  transform: translateY(-3px);
}

.candidate-card.selected {
  border-color: #8f7af7;
  box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.08), 0 16px 38px rgba(61, 51, 119, 0.1);
}

.card-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.score-badge {
  display: inline-flex;
  gap: 7px;
  align-items: baseline;
  padding: 6px 10px;
  color: #6650dd;
  background: #f0edff;
  border-radius: 9px;
}

.score-badge strong {
  font-size: 20px;
  line-height: 1;
}

.score-badge span {
  font-size: 11px;
  font-weight: 600;
}

.card-topline :deep(.el-checkbox__label) {
  padding-left: 6px;
  font-size: 12px;
  color: #888c98;
}

.identity-row {
  display: flex;
  gap: 13px;
  align-items: center;
  margin-top: 17px;
}

.avatar {
  display: grid;
  flex: 0 0 auto;
  width: 58px;
  height: 58px;
  color: #fff;
  border: 3px solid #fff;
  border-radius: 18px;
  box-shadow: 0 7px 16px rgba(52, 47, 91, 0.16);
  place-items: center;
}

.avatar span {
  font-size: 21px;
  font-weight: 800;
}

.identity-copy {
  min-width: 0;
}

.name-row {
  display: flex;
  gap: 7px;
  align-items: center;
}

.name-row h3 {
  margin: 0;
  overflow: hidden;
  font-size: 17px;
  color: #272a37;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commerce-badge {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  color: #0b8a66;
  background: #e8f8f2;
  border-radius: 5px;
}

.identity-copy p {
  margin: 5px 0;
  overflow: hidden;
  font-size: 11px;
  color: #a0a3ad;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: #727683;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  margin-top: 16px;
}

.tag-list span {
  padding: 4px 8px;
  font-size: 11px;
  color: #666b78;
  background: #f5f6f8;
  border-radius: 6px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin-top: 16px;
  overflow: hidden;
  background: #ececf1;
  border: 1px solid #ececf1;
  border-radius: 12px;
}

.metrics-grid div {
  display: flex;
  min-width: 0;
  padding: 10px 11px;
  flex-direction: column;
  background: #fafafd;
}

.metrics-grid span {
  font-size: 10px;
  color: #979aa5;
}

.metrics-grid strong {
  margin-top: 4px;
  font-size: 14px;
  color: #353947;
}

.confidence-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  margin-top: 14px;
  font-size: 11px;
  color: #8f939f;
}

.confidence-row strong {
  font-size: 11px;
  color: #575c69;
}

.confidence-track {
  height: 5px;
  overflow: hidden;
  background: #ececf2;
  border-radius: 999px;
}

.confidence-track i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #745cf5, #9d7cff);
  border-radius: inherit;
}

.reason-block {
  padding: 13px;
  margin-top: 15px;
  background: #f8f9fc;
  border-radius: 11px;
}

.block-title {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #4a4e5c;
}

.block-title .el-icon {
  color: #19a87d;
}

.reason-block ul {
  padding: 0;
  margin: 8px 0 0;
  list-style: none;
}

.reason-block li {
  position: relative;
  padding-left: 12px;
  margin-top: 5px;
  font-size: 11px;
  line-height: 1.55;
  color: #6d7180;
}

.reason-block li::before {
  position: absolute;
  top: 7px;
  left: 0;
  width: 4px;
  height: 4px;
  content: '';
  background: #8d77f7;
  border-radius: 50%;
}

.risk-line {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  margin-top: 10px;
  font-size: 10px;
  line-height: 1.45;
  color: #9a7530;
}

.risk-line .el-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: #daa333;
}

.card-actions {
  display: flex;
  gap: 9px;
  padding-top: 15px;
  margin-top: auto;
}

.card-actions .el-button {
  flex: 1;
  height: 36px;
  margin: 0;
  border-radius: 9px;
}
</style>
