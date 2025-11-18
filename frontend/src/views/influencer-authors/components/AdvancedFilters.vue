<template>
  <div class="advanced-filters">
    <el-form label-width="120px">
      <!-- 粉丝范围 -->
      <el-collapse v-model="activeNames" accordion>
          <el-collapse-item title="粉丝信息" name="fans">
            <el-form-item label="粉丝数">
              <div class="range-input">
                <el-input-number v-model="filters.followerMin" placeholder="最小值" :min="0" :step="10000" />
                <span class="range-separator">-</span>
                <el-input-number v-model="filters.followerMax" placeholder="最大值" :min="0" :step="10000" />
              </div>
              <div class="preset-buttons">
                <el-button size="small" @click="setFollowerRange(0, 100000)">10万以下</el-button>
                <el-button size="small" @click="setFollowerRange(100000, 1000000)">10-100万</el-button>
                <el-button size="small" @click="setFollowerRange(1000000, 10000000)">100-1000万</el-button>
                <el-button size="small" @click="setFollowerRange(10000000, 50000000)">1000万+</el-button>
              </div>
            </el-form-item>
            
            <el-form-item label="30日增长率">
              <div class="range-input">
                <el-input-number 
                  v-model="filters.fansIncrementRateMin" 
                  placeholder="最小值" 
                  :min="-1" 
                  :max="5"
                  :step="0.1" 
                  :precision="2"
                />
                <span class="range-separator">-</span>
                <el-input-number 
                  v-model="filters.fansIncrementRateMax" 
                  placeholder="最大值" 
                  :min="-1"
                  :max="5" 
                  :step="0.1"
                  :precision="2"
                />
              </div>
              <div class="preset-buttons">
                <el-button size="small" @click="setGrowthRange(0.2, 5)">高增长(≥20%)</el-button>
                <el-button size="small" @click="setGrowthRange(0.1, 0.2)">中增长(10-20%)</el-button>
                <el-button size="small" @click="setGrowthRange(0, 0.1)">稳定(0-10%)</el-button>
              </div>
            </el-form-item>
          </el-collapse-item>

          <!-- 数据指标 -->
          <el-collapse-item title="数据指标" name="metrics">
            <el-form-item label="互动率">
              <div class="range-input">
                <el-input-number 
                  v-model="filters.interactRateMin" 
                  placeholder="最小值" 
                  :min="0" 
                  :max="1" 
                  :step="0.01"
                  :precision="3"
                />
                <span class="range-separator">-</span>
                <el-input-number 
                  v-model="filters.interactRateMax" 
                  placeholder="最大值" 
                  :min="0" 
                  :max="1" 
                  :step="0.01"
                  :precision="3"
                />
              </div>
              <div class="preset-buttons">
                <el-button size="small" @click="setInteractRange(0.1, 1)">高互动(≥10%)</el-button>
                <el-button size="small" @click="setInteractRange(0.05, 0.1)">中互动(5-10%)</el-button>
                <el-button size="small" @click="setInteractRange(0, 0.05)">一般(<5%)</el-button>
              </div>
            </el-form-item>

            <el-form-item label="完播率">
              <div class="range-input">
                <el-input-number 
                  v-model="filters.playOverRateMin" 
                  placeholder="最小值" 
                  :min="0" 
                  :max="1" 
                  :step="0.05"
                  :precision="2"
                />
                <span class="range-separator">-</span>
                <el-input-number 
                  v-model="filters.playOverRateMax" 
                  placeholder="最大值" 
                  :min="0" 
                  :max="1" 
                  :step="0.05"
                  :precision="2"
                />
              </div>
            </el-form-item>

            <el-form-item label="星图指数">
              <div class="range-input">
                <el-input-number v-model="filters.starIndexMin" placeholder="最小值" :min="0" :max="100" />
                <span class="range-separator">-</span>
                <el-input-number v-model="filters.starIndexMax" placeholder="最大值" :min="0" :max="100" />
              </div>
            </el-form-item>
          </el-collapse-item>

          <!-- 价格信息 -->
          <el-collapse-item title="价格信息" name="pricing">
            <el-form-item label="报价类型">
              <el-select v-model="filters.priceType" placeholder="选择报价类型">
                <el-option label="1-20秒视频" value="price_1_20" />
                <el-option label="21-60秒视频" value="price_20_60" />
                <el-option label="60秒以上视频" value="price_60" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="价格区间">
              <div class="range-input">
                <el-input-number 
                  v-model="filters.priceMin" 
                  placeholder="最小值" 
                  :min="0" 
                  :step="1000"
                />
                <span class="range-separator">-</span>
                <el-input-number 
                  v-model="filters.priceMax" 
                  placeholder="最大值" 
                  :min="0" 
                  :step="1000"
                />
              </div>
              <div class="preset-buttons">
                <el-button size="small" @click="setPriceRange(0, 5000)">5千以下</el-button>
                <el-button size="small" @click="setPriceRange(5000, 10000)">5千-1万</el-button>
                <el-button size="small" @click="setPriceRange(10000, 30000)">1-3万</el-button>
                <el-button size="small" @click="setPriceRange(30000, 100000)">3-10万</el-button>
                <el-button size="small" @click="setPriceRange(100000, 1000000)">10万+</el-button>
              </div>
            </el-form-item>
          </el-collapse-item>

          <!-- 基础属性 -->
          <el-collapse-item title="基础属性" name="basic">
            <el-form-item label="性别">
              <el-radio-group v-model="filters.gender">
                <el-radio :label="undefined">不限</el-radio>
                <el-radio :label="1">男</el-radio>
                <el-radio :label="2">女</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="达人类型">
              <el-radio-group v-model="filters.authorType">
                <el-radio :label="undefined">不限</el-radio>
                <el-radio :label="1">个人</el-radio>
                <el-radio :label="3">机构</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <el-form-item label="所在地域">
              <el-cascader
                v-model="filters.location"
                :options="provinceOptions"
                placeholder="选择省份/城市"
                clearable
                style="width: 100%"
              />
            </el-form-item>
          </el-collapse-item>

          <!-- 特殊标签 -->
          <el-collapse-item title="特殊标签" name="tags">
            <el-form-item label="认证标签">
              <el-checkbox-group v-model="filters.specialTags">
                <el-checkbox label="star_excellent_author">⭐ 优质作者</el-checkbox>
                <el-checkbox label="is_black_horse_author">🐴 黑马作者</el-checkbox>
                <el-checkbox label="star_qianchuan_high_potential">🚀 高潜达人</el-checkbox>
                <el-checkbox label="is_short_drama">🎬 短剧达人</el-checkbox>
                <el-checkbox label="is_cocreate_author">🤝 共创达人</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-collapse-item>

          <!-- 电商能力 -->
          <el-collapse-item title="电商能力" name="ecommerce">
            <el-form-item label="电商状态">
              <el-switch 
                v-model="filters.ecommerceEnable" 
                active-text="已开通" 
                inactive-text="未开通"
              />
            </el-form-item>
            
            <el-form-item label="电商等级">
              <el-checkbox-group v-model="filters.ecomLevels">
                <el-checkbox label="A">A级</el-checkbox>
                <el-checkbox label="B">B级</el-checkbox>
                <el-checkbox label="C">C级</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            
            <el-form-item label="电商视频数">
              <div class="range-input">
                <el-input-number 
                  v-model="filters.ecomVideoMin" 
                  placeholder="最小值" 
                  :min="0"
                />
                <span class="range-separator">-</span>
                <el-input-number 
                  v-model="filters.ecomVideoMax" 
                  placeholder="最大值" 
                  :min="0"
                />
              </div>
            </el-form-item>
          </el-collapse-item>

          <!-- 营销指数 -->
          <el-collapse-item title="营销指数" name="marketing">
            <el-form-item label="转化指数">
              <el-slider 
                v-model="filters.linkConvertIndex" 
                :min="0" 
                :max="100" 
                :step="5"
                range
                show-stops
              />
            </el-form-item>
            
            <el-form-item label="购物指数">
              <el-slider 
                v-model="filters.linkShoppingIndex" 
                :min="0" 
                :max="100" 
                :step="5"
                range
                show-stops
              />
            </el-form-item>
          </el-collapse-item>
      </el-collapse>
    </el-form>

    <div class="filters-footer">
      <el-button @click="handleReset">重置</el-button>
      <el-button type="primary" @click="handleApply">应用筛选</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useInfluencerSquareStore } from '#/store/influencer-square'

const store = useInfluencerSquareStore()

const activeNames = ref(['fans'])

const filters = ref({
  // 粉丝信息
  followerMin: undefined as number | undefined,
  followerMax: undefined as number | undefined,
  fansIncrementRateMin: undefined as number | undefined,
  fansIncrementRateMax: undefined as number | undefined,
  
  // 数据指标
  interactRateMin: undefined as number | undefined,
  interactRateMax: undefined as number | undefined,
  playOverRateMin: undefined as number | undefined,
  playOverRateMax: undefined as number | undefined,
  starIndexMin: undefined as number | undefined,
  starIndexMax: undefined as number | undefined,
  
  // 价格信息
  priceType: 'price_20_60' as string,
  priceMin: undefined as number | undefined,
  priceMax: undefined as number | undefined,
  
  // 基础属性
  gender: undefined as number | undefined,
  authorType: undefined as number | undefined,
  location: [] as string[],
  
  // 特殊标签
  specialTags: [] as string[],
  
  // 电商能力
  ecommerceEnable: undefined as boolean | undefined,
  ecomLevels: [] as string[],
  ecomVideoMin: undefined as number | undefined,
  ecomVideoMax: undefined as number | undefined,
  
  // 营销指数
  linkConvertIndex: [0, 100] as number[],
  linkShoppingIndex: [0, 100] as number[],
})

// 省份选项（基于实际数据分布）
const provinceOptions = [
  { value: '广东省', label: '广东省 (2,598)' },
  { value: '浙江省', label: '浙江省 (1,931)' },
  { value: '北京市', label: '北京市 (1,397)' },
  { value: '上海市', label: '上海市 (1,117)' },
  { value: '江苏省', label: '江苏省 (1,012)' },
  { value: '四川省', label: '四川省 (1,005)' },
  { value: '山东省', label: '山东省 (888)' },
  { value: '湖南省', label: '湖南省 (782)' },
  { value: '河南省', label: '河南省 (708)' },
  { value: '福建省', label: '福建省' },
  { value: '湖北省', label: '湖北省' },
  { value: '安徽省', label: '安徽省' },
  { value: '陕西省', label: '陕西省' },
  { value: '重庆市', label: '重庆市' },
  { value: '辽宁省', label: '辽宁省' },
]

// 快捷设置方法
const setFollowerRange = (min: number, max: number) => {
  filters.value.followerMin = min
  filters.value.followerMax = max
}

const setGrowthRange = (min: number, max: number) => {
  filters.value.fansIncrementRateMin = min
  filters.value.fansIncrementRateMax = max
}

const setInteractRange = (min: number, max: number) => {
  filters.value.interactRateMin = min
  filters.value.interactRateMax = max
}

const setPriceRange = (min: number, max: number) => {
  filters.value.priceMin = min
  filters.value.priceMax = max
}

const handleApply = () => {
  // 应用筛选条件
  Object.entries(filters.value).forEach(([key, value]) => {
    if (key === 'location' && Array.isArray(value) && value.length > 0) {
      store.setFilter('province', value[0])
    } else if (key === 'specialTags' && Array.isArray(value)) {
      // 特殊标签需要特殊处理
      value.forEach(tag => {
        store.setFilter(tag, true)
      })
    } else {
      store.setFilter(key, value)
    }
  })
  
  store.loadInfluencersDebounced()
}

const handleReset = () => {
  filters.value = {
    followerMin: undefined,
    followerMax: undefined,
    fansIncrementRateMin: undefined,
    fansIncrementRateMax: undefined,
    interactRateMin: undefined,
    interactRateMax: undefined,
    playOverRateMin: undefined,
    playOverRateMax: undefined,
    starIndexMin: undefined,
    starIndexMax: undefined,
    priceType: 'price_20_60',
    priceMin: undefined,
    priceMax: undefined,
    gender: undefined,
    authorType: undefined,
    location: [],
    specialTags: [],
    ecommerceEnable: undefined,
    ecomLevels: [],
    ecomVideoMin: undefined,
    ecomVideoMax: undefined,
    linkConvertIndex: [0, 100],
    linkShoppingIndex: [0, 100],
  }
}
</script>

<style scoped lang="scss">
.advanced-filters {
  padding: 20px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  
  :deep(.el-collapse) {
    border: none;
    
    .el-collapse-item__header {
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      background: var(--el-fill-color-light);
      padding: 0 16px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    
    .el-collapse-item__wrap {
      border: none;
    }
    
    .el-collapse-item__content {
      padding: 16px 16px 24px;
    }
  }

  .range-input {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin-bottom: 12px;

    .el-input-number {
      flex: 1;
    }

    .range-separator {
      color: var(--el-text-color-secondary);
    }
  }
  
  .preset-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
    
    .el-button {
      flex: 1;
      min-width: 80px;
    }
  }
  
  :deep(.el-checkbox-group) {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  :deep(.el-slider) {
    margin: 12px 0;
  }

  .filters-footer {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>
