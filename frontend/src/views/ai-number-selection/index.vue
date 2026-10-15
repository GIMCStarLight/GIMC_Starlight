<template>
  <div class="ai-selection-page">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>

    <main class="page-shell">
      <RequirementComposer
        v-model="queryText"
        :active-example="activeExample"
        :examples="selectionExamples"
        :loading="isLoading"
        :loading-text="loadingText"
        @select-example="selectExample"
        @submit="runRecommendation"
      />

      <transition name="fade-slide">
        <div v-if="hasRun" class="result-workspace">
          <CriteriaPanel
            :chips="criteriaChips"
            :warnings="currentWarnings"
            @remove="removeCriterion"
            @reset="resetSelection"
          />

          <section class="recommendation-section">
            <div class="results-header">
              <div>
                <div class="section-kicker">RECOMMENDATIONS</div>
                <h2>推荐达人</h2>
                <p>
                  找到 <strong>{{ totalMatched }}</strong> 位符合条件的达人，当前展示匹配度最高的
                  {{ visibleCandidates.length }} 位
                </p>
              </div>
              <div class="result-actions">
                <div class="query-meta">
                  <span><i class="online-dot"></i>静态演示数据</span>
                  <span>{{ queryTimeMs }}ms</span>
                </div>
                <el-button :disabled="selectedIds.length === 0" @click="exportSelection">
                  <el-icon><Download /></el-icon>
                  导出候选（{{ selectedIds.length }}）
                </el-button>
              </div>
            </div>

            <div v-if="isLoading" class="candidate-grid loading-grid">
              <div v-for="index in 6" :key="index" class="skeleton-card">
                <el-skeleton animated :rows="8" />
              </div>
            </div>

            <template v-else>
              <div v-if="visibleCandidates.length" class="candidate-grid">
                <CandidateCard
                  v-for="candidate in visibleCandidates"
                  :key="candidate.authorId"
                  :candidate="candidate"
                  :selected="selectedIds.includes(candidate.authorId)"
                  @detail="openDetail"
                  @score="openScore"
                  @toggle="toggleCandidate"
                />
              </div>

              <div v-else class="empty-state">
                <div class="empty-icon"><el-icon><Search /></el-icon></div>
                <h3>当前条件没有匹配结果</h3>
                <p>可以尝试提高报价上限、移除地域限制，或降低互动率要求。</p>
                <el-button type="primary" plain @click="relaxCriteria">一键放宽条件</el-button>
              </div>
            </template>
          </section>

          <section class="refine-card">
            <div class="refine-copy">
              <div class="refine-icon"><el-icon><ChatLineRound /></el-icon></div>
              <div>
                <h3>继续调整推荐条件</h3>
                <p>上一轮条件会被保留，只修改你这次提到的部分。</p>
              </div>
            </div>
            <div class="refine-input">
              <el-input
                v-model="refineText"
                placeholder="例如：预算改为5万元，只看广东和浙江"
                @keyup.enter="applyRefinement"
              />
              <el-button :disabled="!refineText.trim()" type="primary" @click="applyRefinement">
                更新结果
              </el-button>
            </div>
          </section>
        </div>
      </transition>

      <section v-if="!hasRun" class="capability-strip">
        <div v-for="item in capabilityItems" :key="item.title" class="capability-item">
          <div class="capability-icon"><el-icon><component :is="item.icon" /></el-icon></div>
          <div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.description }}</span>
          </div>
        </div>
      </section>
    </main>

    <ScoreBreakdownDrawer
      v-model="scoreDrawerVisible"
      :candidate="activeCandidate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ChatLineRound,
  Connection,
  DataAnalysis,
  Download,
  Search,
  SetUp,
} from '@element-plus/icons-vue';

import CandidateCard from './components/CandidateCard.vue';
import CriteriaPanel from './components/CriteriaPanel.vue';
import RequirementComposer from './components/RequirementComposer.vue';
import ScoreBreakdownDrawer from './components/ScoreBreakdownDrawer.vue';
import {
  criteriaForExample,
  fixtureCandidates,
  selectionExamples,
  unsupportedRequirements,
} from './constants';
import type {
  CandidateRecommendation,
  CriteriaChip,
  MarketingGoal,
  SelectionCriteria,
  SelectionExample,
} from './types';

defineOptions({ name: 'AiNumberSelection' });

const router = useRouter();
const storageKey = 'gimc:ai-selector:current';

const capabilityItems = [
  {
    description: '把业务语言转换为可审阅的筛选条件',
    icon: SetUp,
    title: '理解需求',
  },
  {
    description: '从达人指标、报价与内容标签中召回候选',
    icon: Connection,
    title: '真实数据筛选',
  },
  {
    description: '展示评分依据、推荐证据和数据边界',
    icon: DataAnalysis,
    title: '可解释推荐',
  },
];

const restored = restoreSession();
const queryText = ref(restored?.queryText || selectionExamples[0]!.text);
const refineText = ref('');
const activeExample = ref(restored?.activeExample || 'maternal');
const criteria = ref<SelectionCriteria>(
  restored?.criteria || criteriaForExample('maternal'),
);
const candidates = ref<CandidateRecommendation[]>(
  restored?.hasRun ? fixtureCandidates.map((item) => ({ ...item })) : [],
);
const selectedIds = ref<string[]>(restored?.selectedIds || []);
const hasRun = ref(Boolean(restored?.hasRun));
const isLoading = ref(false);
const loadingStage = ref(0);
const totalMatched = ref(restored?.totalMatched || 34);
const queryTimeMs = ref(restored?.queryTimeMs || 428);
const scoreDrawerVisible = ref(false);
const activeCandidate = ref<CandidateRecommendation | null>(null);
const currentWarnings = ref(
  restored?.hasRun ? unsupportedRequirements.map((item) => ({ ...item })) : [],
);

let loadingTimer: ReturnType<typeof setInterval> | undefined;
let resultTimer: ReturnType<typeof setTimeout> | undefined;

const loadingText = computed(() => {
  return ['正在理解需求', '正在筛选达人', '正在计算匹配度'][loadingStage.value] ||
    '正在生成推荐';
});

const visibleCandidates = computed(() => {
  if (criteria.value.price20To60Max && criteria.value.price20To60Max < 50_000) {
    return [];
  }

  return candidates.value.slice(0, 6);
});

const criteriaChips = computed<CriteriaChip[]>(() => {
  const value = criteria.value;
  const chips: CriteriaChip[] = [];

  value.includeTags.forEach((tag, index) => {
    chips.push({ key: `includeTags.${index}`, label: tag });
  });
  value.excludeTags.forEach((tag, index) => {
    chips.push({
      key: `excludeTags.${index}`,
      label: `排除：${tag}`,
      tone: 'danger',
    });
  });
  if (value.gender) {
    chips.push({ key: 'gender', label: value.gender === 'F' ? '女性达人' : '男性达人' });
  }
  if (value.followerMin || value.followerMax) {
    chips.push({
      key: 'follower',
      label: `粉丝 ${formatRange(value.followerMin, value.followerMax)}`,
    });
  }
  if (value.price20To60Max) {
    chips.push({
      key: 'price20To60Max',
      label: `报价 ≤ ${formatCompact(value.price20To60Max)}`,
    });
  }
  if (value.interactRateMin) {
    chips.push({
      key: 'interactRateMin',
      label: `互动率 ≥ ${(value.interactRateMin * 100).toFixed(1)}%`,
    });
  }
  if (value.provinces.length) {
    chips.push({ key: 'provinces', label: `地区：${value.provinces.join('、')}` });
  }
  if (value.ecommerceRequired) {
    chips.push({ key: 'ecommerceRequired', label: '开通电商' });
  }

  chips.push({
    key: 'marketingGoal',
    label: `目标：${goalLabel(value.marketingGoal)}`,
    tone: 'goal',
  });
  return chips;
});

function selectExample(example: SelectionExample) {
  activeExample.value = example.id;
  queryText.value = example.text;
  criteria.value = criteriaForExample(example.id);
}

function runRecommendation() {
  if (!queryText.value.trim() || isLoading.value) return;

  parseStaticQuery(queryText.value, false);
  startRecommendation();
}

function startRecommendation() {
  hasRun.value = true;
  isLoading.value = true;
  loadingStage.value = 0;
  candidates.value = [];
  currentWarnings.value = unsupportedRequirements.map((item) => ({ ...item }));

  loadingTimer = setInterval(() => {
    loadingStage.value = Math.min(2, loadingStage.value + 1);
  }, 360);

  resultTimer = setTimeout(() => {
    if (loadingTimer) clearInterval(loadingTimer);
    isLoading.value = false;
    loadingStage.value = 0;
    candidates.value = adaptCandidates(fixtureCandidates, criteria.value);
    totalMatched.value = estimateMatchedCount(criteria.value);
    queryTimeMs.value = 320 + Math.round(Math.random() * 180);
    saveSession();
  }, 1150);
}

function applyRefinement() {
  if (!refineText.value.trim() || isLoading.value) return;
  parseStaticQuery(refineText.value, true);
  queryText.value = refineText.value;
  refineText.value = '';
  activeExample.value = '';
  startRecommendation();
  ElMessage.success('已保留原条件并应用本轮修改');
}

function parseStaticQuery(text: string, refining: boolean) {
  const next = refining
    ? cloneCriteria(criteria.value)
    : criteriaForExample(detectExample(text));

  if (/母婴|亲子/.test(text)) next.includeTags = ['母婴亲子'];
  if (/汽车/.test(text)) next.includeTags = ['汽车'];
  if (/科技|数码/.test(text)) next.includeTags = ['科技数码'];
  if (/女性|女达人/.test(text)) next.gender = 'F';
  if (/男性|男达人/.test(text)) next.gender = 'M';
  if (/排除.*剧情|不要.*剧情/.test(text)) next.excludeTags = ['剧情搞笑'];
  if (/电商|带货/.test(text)) next.ecommerceRequired = true;
  if (/曝光|传播|声量/.test(text)) next.marketingGoal = 'awareness';
  if (/转化|带货/.test(text)) next.marketingGoal = 'conversion';
  if (/种草|购物指数/.test(text)) next.marketingGoal = 'seeding';

  const followerRange = text.match(
    /粉丝[^\d]*(\d+(?:\.\d+)?)(万|千)?\s*(?:到|至|[-~—])\s*(\d+(?:\.\d+)?)(万|千)?/,
  );
  if (followerRange) {
    next.followerMin = toNumber(followerRange[1]!, followerRange[2]);
    next.followerMax = toNumber(followerRange[3]!, followerRange[4]);
  } else {
    const followerMin = text.match(/粉丝[^\d]*(\d+(?:\.\d+)?)(万|千)?\s*(?:以上|起)/);
    if (followerMin) next.followerMin = toNumber(followerMin[1]!, followerMin[2]);
  }

  const priceMax = text.match(
    /(?:报价|预算)[^\d]*(\d+(?:\.\d+)?)(万|千)?\s*(?:元)?(?:以内|以下|不超过)?/,
  );
  if (priceMax) next.price20To60Max = toNumber(priceMax[1]!, priceMax[2]);

  const interactMin = text.match(/互动率[^\d]*(\d+(?:\.\d+)?)%/);
  if (interactMin) next.interactRateMin = Number(interactMin[1]) / 100;

  const regions = ['广东', '浙江', '江苏', '福建', '四川', '北京'].filter((region) =>
    text.includes(region),
  );
  if (regions.length) next.provinces = regions.map((region) => `${region}省`.replace('北京省', '北京市'));

  criteria.value = next;
}

function removeCriterion(key: string) {
  const next = cloneCriteria(criteria.value);
  const [field, indexText] = key.split('.');

  if (field === 'includeTags' && indexText !== undefined) {
    next.includeTags.splice(Number(indexText), 1);
  } else if (field === 'excludeTags' && indexText !== undefined) {
    next.excludeTags.splice(Number(indexText), 1);
  } else if (field === 'follower') {
    delete next.followerMin;
    delete next.followerMax;
  } else if (field === 'provinces') {
    next.provinces = [];
  } else if (field === 'marketingGoal') {
    next.marketingGoal = 'awareness';
  } else if (field === 'gender') {
    delete next.gender;
  } else if (field === 'price20To60Max') {
    delete next.price20To60Max;
  } else if (field === 'interactRateMin') {
    delete next.interactRateMin;
  } else if (field === 'ecommerceRequired') {
    next.ecommerceRequired = false;
  }

  criteria.value = next;
  totalMatched.value += 9;
  candidates.value = adaptCandidates(fixtureCandidates, next);
  saveSession();
}

function relaxCriteria() {
  const next = cloneCriteria(criteria.value);
  next.provinces = [];
  delete next.interactRateMin;
  if (next.price20To60Max) next.price20To60Max = Math.max(next.price20To60Max, 80_000);
  criteria.value = next;
  candidates.value = adaptCandidates(fixtureCandidates, next);
  totalMatched.value = 28;
  saveSession();
  ElMessage.success('已放宽报价、互动率和地域条件');
}

function resetSelection() {
  activeExample.value = 'maternal';
  queryText.value = selectionExamples[0]!.text;
  criteria.value = criteriaForExample('maternal');
  candidates.value = [];
  selectedIds.value = [];
  currentWarnings.value = [];
  hasRun.value = false;
  sessionStorage.removeItem(storageKey);
}

function toggleCandidate(authorId: string) {
  selectedIds.value = selectedIds.value.includes(authorId)
    ? selectedIds.value.filter((id) => id !== authorId)
    : [...selectedIds.value, authorId];
  saveSession();
}

function openScore(candidate: CandidateRecommendation) {
  activeCandidate.value = candidate;
  scoreDrawerVisible.value = true;
}

function openDetail(authorId: string) {
  router.push(`/influencer-detail/${authorId}`);
}

function exportSelection() {
  const selected = candidates.value.filter((candidate) =>
    selectedIds.value.includes(candidate.authorId),
  );
  if (!selected.length) return;

  const rows = [
    ['达人昵称', '星图ID', '匹配分', '粉丝数', '报价', '互动率', '标签', '推荐理由'],
    ...selected.map((candidate) => [
      candidate.nickName,
      candidate.starId,
      candidate.matchScore,
      candidate.follower,
      candidate.price20To60,
      `${(candidate.interactRate30d * 100).toFixed(2)}%`,
      candidate.primaryTags.join('/'),
      candidate.reasons.join('；'),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AI选人候选名单-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success(`已导出 ${selected.length} 位候选达人`);
}

function adaptCandidates(
  source: CandidateRecommendation[],
  value: SelectionCriteria,
): CandidateRecommendation[] {
  const primaryTag = value.includeTags[0] || '生活';
  return source.map((candidate, index) => {
    const priceLimit = value.price20To60Max;
    const price = priceLimit
      ? Math.min(candidate.price20To60, Math.round(priceLimit * (0.65 + index * 0.04)))
      : candidate.price20To60;
    const goal = goalLabel(value.marketingGoal);
    const goalSignal =
      value.marketingGoal === 'conversion'
        ? '转化指数'
        : value.marketingGoal === 'seeding'
          ? '购物指数'
          : '传播指数';

    return {
      ...candidate,
      price20To60: price,
      primaryTags: [primaryTag, ...candidate.primaryTags.filter((tag) => tag !== primaryTag)].slice(0, 3),
      reasons: [
        `内容标签命中「${primaryTag}」，满足核心品类要求`,
        `${goalSignal}位于候选集前 ${8 + index * 3}%，符合${goal}目标`,
        priceLimit
          ? `20–60秒报价 ${formatCurrency(price)}，处于预算范围内`
          : `综合互动表现位于候选集前 ${12 + index * 2}%`,
      ],
    };
  });
}

function estimateMatchedCount(value: SelectionCriteria) {
  let count = 58;
  if (value.includeTags.length) count -= 18;
  if (value.gender) count -= 6;
  if (value.price20To60Max) count -= value.price20To60Max < 60_000 ? 20 : 7;
  if (value.interactRateMin) count -= 5;
  if (value.provinces.length) count -= value.provinces.length === 1 ? 13 : 8;
  return Math.max(visibleCandidates.value.length, count);
}

function detectExample(text: string) {
  if (/汽车/.test(text)) return 'auto';
  if (/科技|数码/.test(text)) return 'digital';
  return 'maternal';
}

function toNumber(value: string, unit?: string) {
  const number = Number(value);
  if (unit === '万') return number * 10_000;
  if (unit === '千') return number * 1000;
  return number;
}

function goalLabel(goal: MarketingGoal) {
  return { awareness: '品牌曝光', conversion: '销售转化', seeding: '内容种草' }[goal];
}

function formatCompact(value?: number) {
  if (value === undefined) return '不限';
  if (value >= 10_000) return `${Number((value / 10_000).toFixed(1))}万`;
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatCurrency(value: number) {
  return value >= 10_000
    ? `¥${Number((value / 10_000).toFixed(1))}万`
    : `¥${value}`;
}

function formatRange(min?: number, max?: number) {
  if (min && max) return `${formatCompact(min)}–${formatCompact(max)}`;
  if (min) return `${formatCompact(min)}以上`;
  if (max) return `${formatCompact(max)}以下`;
  return '不限';
}

function cloneCriteria(value: SelectionCriteria): SelectionCriteria {
  return JSON.parse(JSON.stringify(value)) as SelectionCriteria;
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').split('"').join('""')}"`;
}

function saveSession() {
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      activeExample: activeExample.value,
      criteria: criteria.value,
      hasRun: hasRun.value,
      queryText: queryText.value,
      queryTimeMs: queryTimeMs.value,
      selectedIds: selectedIds.value,
      totalMatched: totalMatched.value,
    }),
  );
}

function restoreSession(): null | Record<string, any> {
  try {
    const value = sessionStorage.getItem(storageKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

onBeforeUnmount(() => {
  if (loadingTimer) clearInterval(loadingTimer);
  if (resultTimer) clearTimeout(resultTimer);
});
</script>

<style scoped>
.ai-selection-page {
  position: relative;
  min-height: 100%;
  padding: 28px;
  overflow: hidden;
  background:
    linear-gradient(rgba(250, 250, 253, 0.96), rgba(247, 247, 252, 0.98)),
    radial-gradient(circle at 20% 10%, #eeeaff, transparent 35%);
}

.ambient {
  position: absolute;
  pointer-events: none;
  filter: blur(1px);
  border-radius: 50%;
}

.ambient-one {
  top: 160px;
  left: -110px;
  width: 260px;
  height: 260px;
  background: rgba(126, 93, 255, 0.06);
}

.ambient-two {
  right: -100px;
  bottom: 60px;
  width: 310px;
  height: 310px;
  background: rgba(22, 135, 255, 0.05);
}

.page-shell {
  position: relative;
  z-index: 1;
  width: min(1460px, 100%);
  margin: 0 auto;
}

.result-workspace {
  display: grid;
  gap: 20px;
  margin-top: 22px;
}

.recommendation-section {
  padding: 25px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #ebeaf0;
  border-radius: 20px;
  box-shadow: 0 12px 38px rgba(32, 34, 51, 0.05);
  backdrop-filter: blur(8px);
}

.results-header {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-kicker {
  margin-bottom: 5px;
  font-size: 10px;
  font-weight: 800;
  color: #7c5cff;
  letter-spacing: 0.15em;
}

.results-header h2 {
  margin: 0;
  font-size: 24px;
  color: #272a36;
}

.results-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #858995;
}

.results-header p strong {
  color: #6551d6;
}

.result-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.result-actions .el-button {
  height: 38px;
  border-radius: 10px;
}

.query-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 11px;
  color: #999ca7;
}

.query-meta span {
  display: flex;
  gap: 5px;
  align-items: center;
}

.online-dot {
  width: 6px;
  height: 6px;
  background: #19b47d;
  border-radius: 50%;
}

.candidate-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.skeleton-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #ececf1;
  border-radius: 18px;
}

.empty-state {
  display: flex;
  min-height: 310px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #777b89;
  text-align: center;
  border: 1px dashed #dcdce5;
  border-radius: 16px;
}

.empty-icon {
  display: grid;
  width: 56px;
  height: 56px;
  font-size: 25px;
  color: #7761e8;
  background: #f0edff;
  border-radius: 18px;
  place-items: center;
}

.empty-state h3 {
  margin: 15px 0 6px;
  color: #363946;
}

.empty-state p {
  margin: 0 0 16px;
  font-size: 13px;
}

.refine-card {
  display: flex;
  gap: 30px;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  background: linear-gradient(120deg, #272443, #3d3569);
  border-radius: 18px;
  box-shadow: 0 14px 34px rgba(38, 34, 67, 0.16);
}

.refine-copy {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: center;
  color: #fff;
}

.refine-icon {
  display: grid;
  width: 42px;
  height: 42px;
  font-size: 19px;
  color: #dfd8ff;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 13px;
  place-items: center;
}

.refine-copy h3 {
  margin: 0;
  font-size: 15px;
}

.refine-copy p {
  margin: 5px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.58);
}

.refine-input {
  display: flex;
  flex: 1;
  gap: 10px;
  max-width: 640px;
}

.refine-input :deep(.el-input__wrapper) {
  height: 42px;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
}

.refine-input :deep(.el-input__inner) {
  color: #fff;
}

.refine-input :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.45);
}

.refine-input .el-button {
  height: 42px;
  background: #8066ff;
  border-color: #8066ff;
  border-radius: 10px;
}

.capability-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.capability-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 18px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid #ecebf2;
  border-radius: 15px;
}

.capability-icon {
  display: grid;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  color: #715ce0;
  background: #f0edff;
  border-radius: 12px;
  place-items: center;
}

.capability-item div:last-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.capability-item strong {
  font-size: 13px;
  color: #363946;
}

.capability-item span {
  margin-top: 4px;
  font-size: 11px;
  color: #9699a5;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 1180px) {
  .candidate-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .ai-selection-page {
    padding: 18px;
  }

  .results-header,
  .refine-card {
    align-items: stretch;
    flex-direction: column;
  }

  .result-actions {
    justify-content: space-between;
  }

  .refine-input {
    width: 100%;
    max-width: none;
  }
}

@media (max-width: 680px) {
  .candidate-grid,
  .capability-strip {
    grid-template-columns: 1fr;
  }

  .recommendation-section {
    padding: 18px;
  }

  .result-actions,
  .refine-input {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
