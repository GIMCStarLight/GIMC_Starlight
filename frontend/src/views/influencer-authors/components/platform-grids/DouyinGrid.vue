<template>
  <div class="influencer-grid" v-loading="loading">
    <el-empty v-if="!loading && (!influencers || influencers.length === 0)" description="暂无数据" />

    <!-- 卡片视图 - 紧凑模式使用 InfluencerCardTight -->
    <div v-else-if="viewMode === 'card' && cardSize === 'compact' && influencers" class="card-view compact-content">
      <InfluencerCardTight
        :card-size="cardSize"
        :use-store-selection="useStoreSelection"
        :influencers="influencers"
        @view-detail="handleViewDetail"
        @compare="handleCompare"
        @favorite="handleFavorite"
        @selection-change="handleSelectionChange"
        @update-data="handleUpdateData"
        @evaluate="handleEvaluate"
      />
    </div>

    <!-- 卡片视图 - 标准和详细模式 -->
    <div v-else-if="viewMode === 'card' && influencers" class="card-view table-content">
      <InfluencerCard
        v-for="item in influencers"
        :key="item.author_id"
        :data="item"
        :card-size="cardSize"
        @view-detail="handleViewDetail"
        @compare="handleCompare"
        @favorite="handleFavorite"
        @selection-change="handleSelectionChange"
        @update-data="handleUpdateData"
        @evaluate="handleEvaluate"
      />
    </div>

    <!-- 列表视图 -->
    <InfluencerList
      v-else
      :card-size="cardSize"
      :use-store-selection="useStoreSelection"
      :influencers="influencers"
      @view-detail="handleViewDetail"
      @compare="handleCompare"
      @favorite="handleFavorite"
      @selection-change="handleSelectionChange"
      @update-data="handleUpdateData"
      @evaluate="handleEvaluate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InfluencerCard from '../InfluencerCard.vue'
import InfluencerList from '../InfluencerList.vue'
import InfluencerCardTight from '../InfluencerCardTight.vue'
import { useInfluencerSquareStore } from '#/store'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  viewMode: 'card' | 'table'
  cardSize: 'compact' | 'standard' | 'detailed'
  loading: boolean
  useStoreSelection?: boolean // 是否使用store管理选中状态，默认true
  influencers?: any[] // 外部传入的达人数据，如果不提供则使用store
  platform?: string
}>()

const store = useInfluencerSquareStore()
const storeRefs = storeToRefs(store)

// 使用外部传入的 influencers，或者使用 store 的数据
const influencers = computed(() => props.influencers || storeRefs.influencers.value)

// 事件处理
const handleViewDetail = (data: any) => {
  // 向父组件发送查看详情事件
  emit('view-detail', data)
}

const handleCompare = (data: any) => {
  // 向父组件发送对比事件
  emit('compare', data)
}

const handleFavorite = (data: any) => {
  // 向父组件发送收藏事件
  emit('favorite', data)
}

const handleUpdateData = (row: any) => {
  // 向父组件发送更新事件
  emit('update-data', row)
}

// 评价达人
const handleEvaluate = (row: any) => {
  emit('evaluate', row)
}

// 选中状态变化处理
const handleSelectionChange = (data: any, selected: boolean) => {
  // 先emit事件，让父组件可以拦截处理
  emit('selection-change', data, selected)

  // 如果useStoreSelection为false，则不更新store
  if (props.useStoreSelection !== false) {
    store.setInfluencerSelectionSingle(data.author_id, selected)
  }
}

// 定义 emit
const emit = defineEmits<{
  'view-detail': [data: any]
  'compare': [data: any]
  'favorite': [data: any]
  'update-data': [data: any]
  'evaluate': [data: any]
  'selection-change': [data: any, selected: boolean]
}>()
</script>

<style scoped lang="scss">
.influencer-grid {
  min-height: 400px;

  .card-view {
    &.table-content {
      // 卡片网格布局
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      padding: 20px;
    }

    &.compact-content {
      // 紧凑模式使用列表布局
      padding: 20px;
    }
  }
}
</style>