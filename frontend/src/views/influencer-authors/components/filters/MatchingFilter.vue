<template>
  <div class="filter-row">
    <span class="filter-label">匹配度</span>
    <div class="filter-buttons">
      <!-- 达人认证 -->
      <el-dropdown trigger="click">
        <el-button 
          size="default"
          :type="certifications.length > 0 ? 'primary' : ''"
        >
          达人认证
          <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item 
              v-for="cert in certificationOptions"
              :key="cert.value"
              @click.stop
            >
              <el-checkbox 
                :model-value="certifications.includes(cert.value)"
                @change="handleCertificationChange(cert.value)"
              >
                {{ cert.label }}
              </el-checkbox>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <!-- 内容类型 -->
      <el-dropdown trigger="click">
        <el-button 
          size="default"
          :type="contentTypes.length > 0 ? 'primary' : ''"
        >
          内容类型
          <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item 
              v-for="type in contentTypeOptions"
              :key="type.value"
              @click.stop
            >
              <el-checkbox 
                :model-value="contentTypes.includes(type.value)"
                @change="handleContentTypeChange(type.value)"
              >
                {{ type.label }}
              </el-checkbox>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <!-- 性别 -->
      <el-dropdown trigger="click">
        <el-button 
          size="default"
          :type="gender !== undefined ? 'primary' : ''"
        >
          {{ getGenderLabel() }}
          <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleGenderChange(undefined)">不限</el-dropdown-item>
            <el-dropdown-item @click="handleGenderChange(1)">男性达人</el-dropdown-item>
            <el-dropdown-item @click="handleGenderChange(2)">女性达人</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <!-- 电商能力 -->
      <el-dropdown trigger="click">
        <el-button 
          size="default"
          :type="ecommerce !== '' ? 'primary' : ''"
        >
          {{ getEcommerceLabel() }}
          <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleEcommerceChange('')">不限</el-dropdown-item>
            <el-dropdown-item @click="handleEcommerceChange('enabled')">已开通</el-dropdown-item>
            <el-dropdown-item @click="handleEcommerceChange('with_videos')">有带货视频</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <!-- 价格区间 -->
      <el-dropdown trigger="click">
        <el-button 
          size="default"
          :type="priceRange !== '' ? 'primary' : ''"
        >
          {{ getPriceRangeLabel() }}
          <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item 
              v-for="option in priceRangeOptions"
              :key="option.value"
              @click="handlePriceRangeChange(option.value)"
            >
              {{ option.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <!-- 所在地域 -->
      <el-dropdown trigger="click">
        <el-button 
          size="default"
          :type="province !== '' ? 'primary' : ''"
        >
          {{ getProvinceLabel() }}
          <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item 
              v-for="option in provinceOptions"
              :key="option.value"
              @click="handleProvinceChange(option.value)"
            >
              {{ option.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'

const props = defineProps<{
  certifications: string[]
  contentTypes: string[]
  gender?: number
  ecommerce: string
  priceRange: string
  province: string
}>()

const emit = defineEmits<{
  (e: 'update:certifications', value: string[]): void
  (e: 'update:contentTypes', value: string[]): void
  (e: 'update:gender', value: number | undefined): void
  (e: 'update:ecommerce', value: string): void
  (e: 'update:priceRange', value: string): void
  (e: 'update:province', value: string): void
}>()

// 配置选项
const certificationOptions = [
  { label: '优质作者', value: 'excellent' },
  { label: '黑马作者', value: 'black_horse' },
  { label: '高潜达人', value: 'high_potential' },
]

const contentTypeOptions = [
  { label: '短剧达人', value: 'short_drama' },
  { label: '共创达人', value: 'cocreate' },
  { label: 'CPM项目', value: 'cpm_project' },
]

const priceRangeOptions = [
  { label: '不限', value: '' },
  { label: '5千以下', value: '0-5000' },
  { label: '5千-1万', value: '5000-10000' },
  { label: '1-3万', value: '10000-30000' },
  { label: '3-10万', value: '30000-100000' },
  { label: '10万+', value: '100000-1000000' },
]

const provinceOptions = [
  { label: '不限', value: '' },
  { label: '广东', value: '广东省' },
  { label: '浙江', value: '浙江省' },
  { label: '北京', value: '北京市' },
  { label: '上海', value: '上海市' },
  { label: '江苏', value: '江苏省' },
  { label: '四川', value: '四川省' },
  { label: '山东', value: '山东省' },
  { label: '湖南', value: '湖南省' },
  { label: '河南', value: '河南省' },
]

// 标签显示逻辑
const getGenderLabel = () => {
  if (props.gender === 1) return '男性达人'
  if (props.gender === 2) return '女性达人'
  return '性别'
}

const getEcommerceLabel = () => {
  if (props.ecommerce === 'enabled') return '电商:已开通'
  if (props.ecommerce === 'with_videos') return '电商:有视频'
  return '电商能力'
}

const getPriceRangeLabel = () => {
  const option = priceRangeOptions.find(opt => opt.value === props.priceRange)
  return option?.label || '价格区间'
}

const getProvinceLabel = () => {
  const option = provinceOptions.find(opt => opt.value === props.province)
  return option?.label || '所在地域'
}

// 事件处理
const handleCertificationChange = (value: string) => {
  const newValue = [...props.certifications]
  const index = newValue.indexOf(value)
  if (index > -1) {
    newValue.splice(index, 1)
  } else {
    newValue.push(value)
  }
  emit('update:certifications', newValue)
}

const handleContentTypeChange = (value: string) => {
  const newValue = [...props.contentTypes]
  const index = newValue.indexOf(value)
  if (index > -1) {
    newValue.splice(index, 1)
  } else {
    newValue.push(value)
  }
  emit('update:contentTypes', newValue)
}

const handleGenderChange = (value: number | undefined) => {
  emit('update:gender', value)
}

const handleEcommerceChange = (value: string) => {
  emit('update:ecommerce', value)
}

const handlePriceRangeChange = (value: string) => {
  emit('update:priceRange', value)
}

const handleProvinceChange = (value: string) => {
  emit('update:province', value)
}
</script>

<style scoped>
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
}

.filter-label {
  min-width: 80px;
  font-weight: 500;
  line-height: 32px;
  color: #606266;
}

.filter-buttons {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
