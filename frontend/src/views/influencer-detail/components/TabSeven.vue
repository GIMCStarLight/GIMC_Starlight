<template>
  <div class="tab-content">
    <!-- 匹配状态标识 -->

    <!-- 基础信息模块 -->
    <div class="data-module">
      <div class="module-title-with-time">
        <h3 class="module-title">机构信息</h3>
        <div class="right-content">
          <el-tag type="success" size="large" effect="dark">
            已建联
          </el-tag>
          <span v-if="rawData.matched_at" class="matched-time">
            匹配时间：{{ formatDate(rawData.matched_at) }}
          </span>
        </div>
      </div>
      <el-row :gutter="12" class="status-info">
        <el-col :span="5">
          <SingleCard
            label="所属机构"
            :value="rawData.org_name || '-'"
            unit=""
          />
        </el-col>
        <el-col :span="6">
          <SingleCard
            label="分类标签"
            :value="rawData.category || '-'"
            unit=""
          />
        </el-col>
        <el-col :span="6">
          <SingleCard
            label="年框机构"
            :value="rawData.annual_contract_org || '-'"
            unit=""
          />
        </el-col>
        <el-col :span="6">
          <SingleCard
            label="是否独家"
            :value="rawData.is_exclusive === 1 ? '是' : '否'"
            unit=""
          />
        </el-col>
      </el-row>
    </div>

    <!-- 返点政策模块 -->
    <div class="data-module">
      <div class="module-title-with-time">
        <h3 class="module-title">返点政策</h3>
      </div>
      <el-row :gutter="12" class="status-info">
        <el-col :span="6">
          <SingleCard
            label="返点政策"
            :value="rawData.rebate_policy || '-'"
            unit=""
          />
        </el-col>
        <el-col :span="6">
          <SingleCard
            label="返点账期"
            :value="rawData.rebate_period || '-'"
            unit=""
          />
        </el-col>
        <el-col :span="6">
          <SingleCard
            label="支付账期"
            :value="rawData.pay_period || '-'"
            unit=""
          />
        </el-col>
         <el-col :span="6">
          <SingleCard
            label="政策等级"
            :value="rawData.policy_level || '-'"
            unit=""
          />
        </el-col>
        <el-col :span="6">
          <SingleCard
            label="返点区间"
            :value="rawData.rebate_range || '-'"
            unit=""
          />
        </el-col>
      </el-row>
    </div>

    <!-- 合作信息模块 -->
    <div class="data-module">
      <h3 class="module-title">合作信息</h3>
      <el-row :gutter="12" class="status-info">
        <el-col :span="6">
          <SingleCard
            label="配合度"
            :value="getCooperationStars(rawData.cooperation_degree) > 0 ? ['很差', '较差', '一般', '较好', '非常好'][getCooperationStars(rawData.cooperation_degree) - 1] : '-'"
            unit=""
          />
        </el-col>
        <el-col :span="6">
          <SingleCard
            label="联系方式"
            :value="formatContactInfo(rawData.contact_info)"
            unit=""
          />
        </el-col>
         </el-row>
        <el-row :gutter="12" class="status-info">
        <el-col :span="6">
          <SingleCard
            label="合作简介"
            :value="rawData.cooperation_intro || '-'"
            unit=""
          />
        </el-col>
        <el-col :span="6">
          <SingleCard
            label="备注"
            :value="rawData.remark || '-'"
            unit=""
          />
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import SingleCard from '../../../components/SingleCard/index.vue'

interface Props {
  rawData: Record<string, any>
}

defineProps<Props>()

// 格式化日期
const formatDate = (dateStr: any) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN')
  } catch {
    return '-'
  }
}


// 获取配合度星级
const getCooperationStars = (degree: string): number => {
  const stars: Record<string, number> = {
    'high': 5,
    'medium': 3,
    'low': 1,
  }
  return stars[degree] || 0
}

// 格式化联系方式
const formatContactInfo = (info: any): string => {
  if (!info) return '-'
  if (typeof info === 'string') return info
  try {
    return JSON.stringify(info, null, 2)
  } catch {
    return String(info)
  }
}
</script>

<style scoped lang="scss">

.module-title-with-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.module-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.right-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

// 卡片间距样式，与KolDetailDialog一致
.status-info {
  margin-top: 12px;
}

.matched-time {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}
</style>