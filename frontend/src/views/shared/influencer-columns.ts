import { h } from 'vue'

// 达人数据类型定义
export interface InfluencerRecord {
  avatarUri?: string
  nickName: string
  follower?: number
  vvMedian30d?: number
  interactRateWithin30d?: number
  province?: string
  gender?: string
  starIndex?: number
  starVideoCnt90d?: number
  eCommerceEnable?: boolean
  taskPrice?: {
    price20To60?: number
  }
  extraData?: {
    tags?: string[]
  }
}

// 表格列配置类型
export interface ColumnConfig {
  prop: string
  label: string
  width?: number
  minWidth?: number
  sortable?: boolean
  formatter?: (row: InfluencerRecord, column: any, cellValue: any, index: number) => string
  render?: (row: InfluencerRecord) => any
}

// 格式化函数
export const formatters = {
  // 格式化粉丝数
  formatFollower: (count: number | undefined) => {
    // 明确检查undefined和null，0是有效值
    if (count === undefined || count === null) return '-'
    if (count === 0) return '0'
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`
    }
    return count.toString()
  },

  // 格式化播放量中位数
  formatVvMedian: (vv: number | undefined) => {
    if (vv === undefined || vv === null) return '-'
    if (vv === 0) return '0'
    if (vv >= 10000) {
      return `${(vv / 10000).toFixed(1)}万`
    }
    return vv.toString()
  },

  // 格式化互动率
  formatInteractRate: (rate: number | undefined) => {
    if (rate === undefined || rate === null) return '-'
    if (rate === 0) return '0%'
    return `${(rate * 100).toFixed(2)}%`
  },

  // 格式化价格
  formatPrice: (price: number | undefined) => {
    if (price === undefined || price === null) return '-'
    if (price === 0) return '¥0'
    return `¥${price.toLocaleString()}`
  },

  // 格式化星级指数
  formatStarIndex: (index: number | undefined) => {
    if (index === undefined || index === null) return '-'
    if (index === 0) return '0'
    return index.toFixed(1)
  },

  // 格式化内容主题标签
  formatContentTheme: (labels: string[] | undefined) => {
    if (!labels || labels.length === 0) return '-'
    return labels.join(', ')
  },

  // 格式化性别
  formatGender: (gender: string | undefined) => {
    if (!gender) return '-'
    const genderMap: Record<string, string> = {
      'male': '男',
      'female': '女',
      '1': '男',
      '2': '女'
    }
    return genderMap[gender] || gender
  },

  // 格式化电商能力
  formatEcommerce: (enable: boolean | undefined) => {
    if (enable === undefined) return '-'
    return enable ? '是' : '否'
  }
}

// 基础列配置
export const baseColumns: ColumnConfig[] = [
  {
    prop: 'avatarUri',
    label: '头像',
    width: 80,
    render: (row: InfluencerRecord) => {
      return h('img', {
        src: row.avatarUri || '/default-avatar.png',
        alt: row.nickName,
        style: {
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          objectFit: 'cover'
        }
      })
    }
  },
  {
    prop: 'nickName',
    label: '昵称',
    width: 150
  },
  {
    prop: 'follower',
    label: '粉丝数',
    width: 100,
    sortable: true,
    formatter: (row: InfluencerRecord) => formatters.formatFollower(row.follower || 0)
  },
  {
    prop: 'vvMedian30d',
    label: '30日播放量中位数',
    width: 140,
    formatter: (row: InfluencerRecord) => formatters.formatVvMedian(row.vvMedian30d || 0)
  },
  {
    prop: 'interactRateWithin30d',
    label: '30日互动率',
    width: 120,
    formatter: (row: InfluencerRecord) => formatters.formatInteractRate(row.interactRateWithin30d || 0)
  },
  {
    prop: 'province',
    label: '省份',
    width: 100
  },
  {
    prop: 'gender',
    label: '性别',
    width: 80,
    formatter: (row: InfluencerRecord) => formatters.formatGender(row.gender || '')
  },
  {
    prop: 'starIndex',
    label: '星级指数',
    width: 100,
    sortable: true,
    formatter: (row: InfluencerRecord) => formatters.formatStarIndex(row.starIndex || 0)
  },
  {
    prop: 'price2060',
    label: '20-60s价格',
    width: 120,
    sortable: true,
    formatter: (row: InfluencerRecord) => {
      const price = row.taskPrice?.price20To60
      return price ? formatters.formatPrice(price) : '-'
    }
  },
  {
    prop: 'starVideoCnt90d',
    label: '90日星图视频数',
    width: 130,
    formatter: (row: InfluencerRecord) => (row.starVideoCnt90d || 0).toString()
  },
  {
    prop: 'eCommerceEnable',
    label: '电商能力',
    width: 100,
    formatter: (row: InfluencerRecord) => formatters.formatEcommerce(row.eCommerceEnable || false)
  },
  {
    prop: 'contentThemeLabels180d',
    label: '内容主题标签',
    width: 200,
    formatter: (row: InfluencerRecord) => {
      const labels = row.extraData?.tags || []
      return formatters.formatContentTheme(labels)
    }
  }
]

// 操作列配置
export const actionColumn: ColumnConfig = {
  prop: 'actions',
  label: '操作',
  width: 120,
  render: (row: InfluencerRecord) => {
    return h('div', { class: 'flex gap-2' }, [
      h('el-button', {
        type: 'text',
        size: 'small',
        onClick: () => {
          // 查看详情逻辑
          log.debug('查看详情', row)
        }
      }, { default: () => '详情' }),
      h('el-button', {
        type: 'text',
        size: 'small',
        onClick: () => {
          // 编辑逻辑
          log.debug('编辑', row)
        }
      }, { default: () => '编辑' })
    ])
  }
}

// 完整列配置（包含操作列）
export const fullColumns: ColumnConfig[] = [
  ...baseColumns,
  actionColumn
]

// 可选择的列配置（用于列显示控制）
export const selectableColumns = baseColumns.map(col => ({
  key: col.prop,
  title: col.label,
  visible: true
}))

// 默认显示的列（可以根据页面需求调整）
export const defaultVisibleColumns = [
  'avatarUri',
  'nickName', 
  'follower',
  'vvMedian30d',
  'interactRateWithin30d',
  'province',
  'gender',
  'starIndex',
  'price2060'
]