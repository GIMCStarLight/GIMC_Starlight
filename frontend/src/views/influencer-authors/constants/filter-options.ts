/**
 * 筛选组件的离散档位配置
 * 用于 DiscreteRangePicker 组件
 */

export interface RangeOption {
  label: string
  value: number
}

// 粉丝规模档位
export const FOLLOWER_OPTIONS: RangeOption[] = [
  { label: '1千', value: 1000 },
  { label: '5千', value: 5000 },
  { label: '1万', value: 10000 },
  { label: '5万', value: 50000 },
  { label: '10万', value: 100000 },
  { label: '20万', value: 200000 },
  { label: '50万', value: 500000 },
  { label: '100万', value: 1000000 },
  { label: '200万', value: 2000000 },
  { label: '500万', value: 5000000 },
  { label: '1000万', value: 10000000 }
]

// 报价档位（20-60秒）
export const PRICE_OPTIONS: RangeOption[] = [
  { label: '500元', value: 500 },
  { label: '1000元', value: 1000 },
  { label: '2000元', value: 2000 },
  { label: '5000元', value: 5000 },
  { label: '1万', value: 10000 },
  { label: '2万', value: 20000 },
  { label: '5万', value: 50000 },
  { label: '10万', value: 100000 }
]

// 互动率档位（百分比）
export const INTERACT_RATE_OPTIONS: RangeOption[] = [
  { label: '1%', value: 0.01 },
  { label: '2%', value: 0.02 },
  { label: '5%', value: 0.05 },
  { label: '8%', value: 0.08 },
  { label: '10%', value: 0.10 },
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.20 },
  { label: '30%', value: 0.30 },
  { label: '50%', value: 0.50 }
]

// 完播率档位（百分比）
export const PLAY_OVER_RATE_OPTIONS: RangeOption[] = [
  { label: '10%', value: 0.10 },
  { label: '20%', value: 0.20 },
  { label: '30%', value: 0.30 },
  { label: '40%', value: 0.40 },
  { label: '50%', value: 0.50 },
  { label: '60%', value: 0.60 },
  { label: '70%', value: 0.70 },
  { label: '80%', value: 0.80 },
  { label: '90%', value: 0.90 }
]

// 30日增长率档位（百分比，可以为负）
export const GROWTH_RATE_OPTIONS: RangeOption[] = [
  { label: '-50%', value: -0.50 },
  { label: '-20%', value: -0.20 },
  { label: '0%', value: 0 },
  { label: '10%', value: 0.10 },
  { label: '20%', value: 0.20 },
  { label: '30%', value: 0.30 },
  { label: '50%', value: 0.50 },
  { label: '100%', value: 1.00 },
  { label: '200%', value: 2.00 },
  { label: '500%', value: 5.00 }
]

// GMV档位
export const GMV_OPTIONS: RangeOption[] = [
  { label: '1万', value: 10000 },
  { label: '5万', value: 50000 },
  { label: '10万', value: 100000 },
  { label: '20万', value: 200000 },
  { label: '50万', value: 500000 },
  { label: '100万', value: 1000000 },
  { label: '500万', value: 5000000 },
  { label: '1000万', value: 10000000 }
]

// 营销指数档位（0-100分，以5为步长）
export const MARKETING_INDEX_OPTIONS: RangeOption[] = [
  { label: '0', value: 0 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '20', value: 20 },
  { label: '25', value: 25 },
  { label: '30', value: 30 },
  { label: '35', value: 35 },
  { label: '40', value: 40 },
  { label: '45', value: 45 },
  { label: '50', value: 50 },
  { label: '55', value: 55 },
  { label: '60', value: 60 },
  { label: '65', value: 65 },
  { label: '70', value: 70 },
  { label: '75', value: 75 },
  { label: '80', value: 80 },
  { label: '85', value: 85 },
  { label: '90', value: 90 },
  { label: '95', value: 95 },
  { label: '100', value: 100 }
]

// 预期播放量档位
export const EXPECTED_PLAY_OPTIONS: RangeOption[] = [
  { label: '1千', value: 1000 },
  { label: '5千', value: 5000 },
  { label: '1万', value: 10000 },
  { label: '5万', value: 50000 },
  { label: '10万', value: 100000 },
  { label: '50万', value: 500000 },
  { label: '100万', value: 1000000 },
  { label: '500万', value: 5000000 },
  { label: '1000万', value: 10000000 }
]

// 预期CPM档位（元）
export const EXPECTED_CPM_OPTIONS: RangeOption[] = [
  { label: '1元', value: 1 },
  { label: '5元', value: 5 },
  { label: '10元', value: 10 },
  { label: '20元', value: 20 },
  { label: '50元', value: 50 },
  { label: '100元', value: 100 },
  { label: '200元', value: 200 },
  { label: '500元', value: 500 }
]

// 预期CPE档位（元）
export const EXPECTED_CPE_OPTIONS: RangeOption[] = [
  { label: '0.1元', value: 0.1 },
  { label: '0.5元', value: 0.5 },
  { label: '1元', value: 1 },
  { label: '2元', value: 2 },
  { label: '5元', value: 5 },
  { label: '10元', value: 10 },
  { label: '20元', value: 20 },
  { label: '50元', value: 50 }
]

// 爆文率档位（百分比）
export const BURST_RATE_OPTIONS: RangeOption[] = [
  { label: '5%', value: 0.05 },
  { label: '10%', value: 0.10 },
  { label: '20%', value: 0.20 },
  { label: '30%', value: 0.30 },
  { label: '40%', value: 0.40 },
  { label: '50%', value: 0.50 },
  { label: '60%', value: 0.60 },
  { label: '70%', value: 0.70 },
  { label: '80%', value: 0.80 },
  { label: '90%', value: 0.90 },
  { label: '100%', value: 1.00 }
]
