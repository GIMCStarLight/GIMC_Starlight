<template>
  <section class="composer-card">
    <div class="composer-heading">
      <div>
        <p class="eyebrow">AI INFLUENCER MATCHING</p>
        <h1>用一句话，找到更合适的达人</h1>
        <p class="heading-copy">
          描述品类、预算和营销目标，系统会把需求拆成可验证条件，并给出可解释的候选名单。
        </p>
      </div>
      <div class="database-pill">
        <span class="status-dot"></span>
        <div>
          <strong>10,000</strong>
          <span>位真实达人</span>
        </div>
      </div>
    </div>

    <div class="composer-input" :class="{ focused: isFocused }">
      <el-input
        :model-value="modelValue"
        :autosize="{ minRows: 3, maxRows: 6 }"
        maxlength="500"
        placeholder="例如：找10位母婴亲子类女性达人，粉丝200万到500万，报价不超过8万元，优先种草指数高……"
        resize="none"
        show-word-limit
        type="textarea"
        @blur="isFocused = false"
        @focus="isFocused = true"
        @keydown.meta.enter.prevent="$emit('submit')"
        @keydown.ctrl.enter.prevent="$emit('submit')"
        @update:model-value="$emit('update:modelValue', $event)"
      />
      <div class="composer-footer">
        <div class="keyboard-hint">
          <el-icon><MagicStick /></el-icon>
          支持品类、粉丝、地域、报价、互动率和营销目标
        </div>
        <el-button
          class="submit-button"
          :disabled="!modelValue.trim()"
          :loading="loading"
          type="primary"
          @click="$emit('submit')"
        >
          <el-icon v-if="!loading"><Promotion /></el-icon>
          {{ loading ? loadingText : '开始推荐' }}
        </el-button>
      </div>
    </div>

    <div class="examples-wrap">
      <div class="examples-title">快速开始</div>
      <div class="examples-grid">
        <button
          v-for="example in examples"
          :key="example.id"
          class="example-card"
          :class="{ active: activeExample === example.id }"
          :style="{ '--accent': example.accent }"
          type="button"
          @click="$emit('select-example', example)"
        >
          <span class="example-icon">{{ example.icon }}</span>
          <span class="example-content">
            <strong>{{ example.title }}</strong>
            <small>{{ example.description }}</small>
          </span>
          <el-icon class="example-arrow"><ArrowRight /></el-icon>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ArrowRight, MagicStick, Promotion } from '@element-plus/icons-vue';

import type { SelectionExample } from '../types';

defineProps<{
  activeExample?: string;
  examples: SelectionExample[];
  loading: boolean;
  loadingText: string;
  modelValue: string;
}>();

defineEmits<{
  'select-example': [example: SelectionExample];
  'update:modelValue': [value: string];
  submit: [];
}>();

const isFocused = ref(false);
</script>

<style scoped>
.composer-card {
  position: relative;
  padding: 34px;
  overflow: hidden;
  background:
    radial-gradient(circle at 90% 0%, rgba(118, 93, 255, 0.16), transparent 34%),
    linear-gradient(135deg, #ffffff 0%, #fbfaff 56%, #f5f8ff 100%);
  border: 1px solid rgba(107, 94, 200, 0.16);
  border-radius: 24px;
  box-shadow: 0 18px 50px rgba(44, 35, 94, 0.08);
}

.composer-card::after {
  position: absolute;
  top: -72px;
  right: -52px;
  width: 210px;
  height: 210px;
  pointer-events: none;
  content: '';
  border: 1px solid rgba(124, 92, 255, 0.12);
  border-radius: 50%;
}

.composer-heading {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 26px;
}

.eyebrow {
  margin: 0 0 9px;
  font-size: 12px;
  font-weight: 800;
  color: #765cff;
  letter-spacing: 0.13em;
}

h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 42px);
  line-height: 1.18;
  color: #1f2333;
  letter-spacing: -0.035em;
}

.heading-copy {
  max-width: 720px;
  margin: 13px 0 0;
  font-size: 15px;
  line-height: 1.75;
  color: #686d7c;
}

.database-pill {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
  min-width: 136px;
  padding: 11px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(105, 88, 201, 0.13);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(44, 35, 94, 0.06);
  backdrop-filter: blur(8px);
}

.database-pill div {
  display: flex;
  flex-direction: column;
}

.database-pill strong {
  font-size: 17px;
  line-height: 1.1;
  color: #262a38;
}

.database-pill span:not(.status-dot) {
  margin-top: 2px;
  font-size: 12px;
  color: #8b8f9b;
}

.status-dot {
  width: 9px;
  height: 9px;
  background: #18b879;
  border: 3px solid #d9f7e9;
  border-radius: 50%;
  box-sizing: content-box;
}

.composer-input {
  position: relative;
  z-index: 1;
  padding: 16px 18px 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e1e3eb;
  border-radius: 18px;
  box-shadow: 0 8px 30px rgba(45, 42, 68, 0.05);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.composer-input.focused {
  border-color: #8c75ff;
  box-shadow: 0 0 0 4px rgba(124, 92, 255, 0.08), 0 14px 36px rgba(45, 42, 68, 0.08);
}

.composer-input :deep(.el-textarea__inner) {
  padding: 0;
  font-size: 16px;
  line-height: 1.75;
  color: #292d3b;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.composer-input :deep(.el-input__count) {
  right: 0;
  bottom: -37px;
  color: #a0a4ae;
  background: transparent;
}

.composer-footer {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #eef0f5;
}

.keyboard-hint {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 12px;
  color: #9498a5;
}

.keyboard-hint .el-icon {
  color: #7c5cff;
}

.submit-button {
  min-width: 126px;
  height: 42px;
  font-weight: 700;
  background: linear-gradient(135deg, #6f5cf4, #8c62ff);
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 22px rgba(111, 92, 244, 0.24);
}

.examples-wrap {
  position: relative;
  z-index: 1;
  margin-top: 22px;
}

.examples-title {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #8c909e;
  letter-spacing: 0.06em;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.example-card {
  display: flex;
  gap: 11px;
  align-items: center;
  min-width: 0;
  padding: 13px 14px;
  color: #333746;
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #e7e8ef;
  border-radius: 14px;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.example-card:hover,
.example-card.active {
  border-color: color-mix(in srgb, var(--accent), white 48%);
  box-shadow: 0 9px 22px color-mix(in srgb, var(--accent), transparent 88%);
  transform: translateY(-2px);
}

.example-icon {
  display: grid;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  font-size: 18px;
  background: color-mix(in srgb, var(--accent), white 88%);
  border-radius: 11px;
  place-items: center;
}

.example-content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.example-content strong {
  font-size: 14px;
  color: #313543;
}

.example-content small {
  margin-top: 3px;
  overflow: hidden;
  font-size: 11px;
  color: #9296a2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.example-arrow {
  flex: 0 0 auto;
  color: #b2b5be;
}

@media (max-width: 900px) {
  .composer-card {
    padding: 24px;
  }

  .composer-heading {
    flex-direction: column;
  }

  .database-pill {
    align-self: flex-start;
  }

  .examples-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .composer-card {
    padding: 19px;
    border-radius: 18px;
  }

  .composer-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .submit-button {
    width: 100%;
  }
}
</style>
