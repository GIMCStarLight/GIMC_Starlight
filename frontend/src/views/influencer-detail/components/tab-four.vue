<template>
    <div class="space-content">
        <div class="mudule-one">
             <div class="title-wrapper">
                <div class="title">商业能力分析</div>
                <div class="operation">
                    <span class="operation-item">
                        <el-select
                            v-model="selectedIndustry"
                            placeholder="行业"
                            class="industry-select"
                        >
                            <el-option label="不限" value="" />
                            <el-option label="美妆" value="美妆" />
                            <el-option label="3C及电器" value="3C及电器" />
                            <el-option label="食品饮料" value="食品饮料" />
                            <el-option label="汽车" value="汽车" />
                            <el-option label="游戏" value="游戏" />
                            <el-option label="工具类软件" value="工具类软件" />
                            <el-option label="日化" value="日化" />
                            <el-option label="通信" value="通信" />
                            <el-option label="母婴宠物" value="母婴宠物" />
                            <el-option label="服装配饰" value="服装配饰" />
                            <el-option label="传媒资讯" value="传媒资讯" />
                            <el-option label="家居建材" value="家居建材" />
                            <el-option label="医药健康" value="医药健康" />
                            <el-option label="商务服务" value="商务服务" />
                            <el-option label="本地服务" value="本地服务" />
                            <el-option label="房地产" value="房地产" />
                            <el-option label="教育培训" value="教育培训" />
                            <el-option label="出行旅游" value="出行旅游" />
                            <el-option label="社会公共" value="社会公共" />
                            <el-option label="零售" value="零售" />
                            <el-option label="交通工具" value="交通工具" />
                            <el-option label="农林牧畜渔" value="农林牧畜渔" />
                            <el-option label="化工及能源" value="化工及能源" />
                            <el-option label="电子电工" value="电子电工" />
                            <el-option label="机械设备" value="机械设备" />
                            <el-option label="文体娱乐" value="文体娱乐" />
                            <el-option label="物流业" value="物流业" />
                            <el-option label="金融业" value="金融业" />
                            <el-option label="餐饮服务" value="餐饮服务" />
                            <el-option label="招商加盟" value="招商加盟" />
                            <el-option label="实体书籍" value="实体书籍" />
                            <el-option label="社交通讯" value="社交通讯" />
                            <el-option label="医疗机构" value="医疗机构" />
                        </el-select>
                    </span>
                </div>
            </div>
            <!-- 商业能力卡片组 -->
            <div class="tab-card-group link-card">
                <a-card
                    class="tab-card-item link-card-item"
                    :class="{ 'is-active': activeCardIndex === 0 }"
                    hoverable
                    @click="handleCardClick(0)"
                >
                    <div class="relative-ratio">
                        <span class="ratio-label">30天环比</span>
                        <span class="ratio-value decline">-0.4%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">星图指数</span>
                        </span>
                        <div class="link-value">89</div>
                    </div>
                    <div class="rank">
                        <span class="rank-label">行业排名</span>
                        <span class="rank-value">47</span>
                    </div>
                </a-card>

                <a-card
                    class="tab-card-item link-card-item"
                    :class="{ 'is-active': activeCardIndex === 1 }"
                    hoverable
                    @click="handleCardClick(1)"
                >
                    <div class="relative-ratio">
                        <span class="ratio-label">30天环比</span>
                        <span class="ratio-value grow">+0.1%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">传播指数</span>
                            <a-tooltip title="传播指数说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">97</div>
                    </div>
                    <div class="rank">
                        <span class="rank-label">行业排名</span>
                        <span class="rank-value">前0.5%</span>
                    </div>
                </a-card>

                <a-card
                    class="tab-card-item link-card-item"
                    :class="{ 'is-active': activeCardIndex === 2 }"
                    hoverable
                    @click="handleCardClick(2)"
                >
                    <div class="relative-ratio">
                        <span class="ratio-label">30天环比</span>
                        <span class="ratio-value grow">+0.4%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">种草指数</span>
                            <a-tooltip title="种草指数说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">98</div>
                    </div>
                    <div class="rank">
                        <span class="rank-label">行业排名</span>
                        <span class="rank-value">前0.5%</span>
                    </div>
                </a-card>

                <a-card
                    class="tab-card-item link-card-item"
                    :class="{ 'is-active': activeCardIndex === 3 }"
                    hoverable
                    @click="handleCardClick(3)"
                >
                    <div class="relative-ratio">
                        <span class="ratio-label">30天环比</span>
                        <span class="ratio-value decline">-0.1%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">转化指数</span>
                            <a-tooltip title="转化指数说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">98</div>
                    </div>
                    <div class="rank">
                        <span class="rank-label">行业排名</span>
                        <span class="rank-value">-</span>
                    </div>
                </a-card>

                <a-card
                    class="tab-card-item link-card-item"
                    :class="{ 'is-active': activeCardIndex === 4 }"
                    hoverable
                    @click="handleCardClick(4)"
                >
                    <div class="relative-ratio">
                        <span class="ratio-label">30天环比</span>
                        <span class="ratio-value decline">-2.8%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">性价比指数</span>
                            <a-tooltip title="性价比指数说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">72</div>
                    </div>
                    <div class="rank">
                        <span class="rank-label">行业排名</span>
                        <span class="rank-value">前0.5%</span>
                    </div>
                </a-card>

                <a-card
                    class="tab-card-item link-card-item"
                    :class="{ 'is-active': activeCardIndex === 5 }"
                    hoverable
                    @click="handleCardClick(5)"
                >
                    <div class="relative-ratio">
                        <span class="ratio-label">30天环比</span>
                        <span class="ratio-value decline">-0.3%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">合作指数</span>
                            <a-tooltip title="合作指数说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">82</div>
                    </div>
                    <div class="rank">
                        <span class="rank-label">行业排名</span>
                        <span class="rank-value">前0.5%</span>
                    </div>
                </a-card>
            </div>
        </div>
        <div class="mudule-two">
             <div class="title-wrapper">
                <div class="title">星图指数趋势</div>
            </div>
            <div class="chart-container">
                <div class="trend-chart" ref="trendChartRef"></div>
            </div>
        </div>
        <div class="mudule-three">
            <div class="title-wrapper">
                    <div class="title">
                        <div class="title-content">
                            <h2 class="main-title">转化能力分析</h2>
                            <span class="sub-title-text">仅展示星图视频数据</span>
                        </div>
                    </div>
                    <div class="operation">
                    <div class="time-range-selector">
                        <span class="prepend">时间：</span>
                        <el-select
                            v-model="selectedTimeRange"
                            placeholder="请选择"
                            class="time-select"
                        >
                            <el-option label="最近7天" value="7days" />
                            <el-option label="最近30天" value="30days" />
                            <el-option label="最近90天" value="90days" />
                            <el-option label="自定义" value="custom" />
                        </el-select>
                    </div>
                </div>
                </div>
                <el-divider />
                <div class="colum-information-template">
                    <div class="data-row">
                        <div class="main-data">
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">相关视频数</span>
                                </span>
                                <div class="value">1</div>
                            </div>
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">播放中位数</span>
                                </span>
                                <div class="value">1,647.5w</div>
                            </div>
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">组件点击量</span>
                                </span>
                                <div class="value">-</div>
                            </div>
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">组件点击率</span>
                                </span>
                                <div class="value">-</div>
                            </div>
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">相关CPC</span>
                                </span>
                                <div class="value">-</div>
                            </div>
                        </div>
                        <el-divider class="horizontal-divider" />
                    </div>
                    <div class="data-row">
                        <div class="main-data">
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">带货商品数</span>
                                </span>
                                <div class="value">-</div>
                            </div>
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">平均销售额区间</span>
                                </span>
                                <div class="value">-</div>
                            </div>
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">带货商品价格</span>
                                </span>
                                <div class="value">-</div>
                            </div>
                            <div class="data-item">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">GPM</span>
                                </span>
                                <div class="value">-</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="daihuo-information-analysis">
                    <span class="sub-title">带货榜单</span>
                    <!-- <div class="data-table__header">
                        <div>
                            <span class="title">带货榜单</span>
                        </div>
                    </div> -->
                    <div class="ecommerce-live-table">
                        <StandTable
                            :columns="tableColumns"
                            :data-source="tableData"
                            :loading="loading"
                            :pagination="false"
                            :size="'middle'"
                            :bordered="false"
                            row-key="id"
                            @sortChange="handleSortChange"
                        >
                            <template #rank="{ record }">
                                <span class="rank-icon">{{ record.rank }}</span>
                            </template>
                            <template #name="{ record }">
                                <div class="product-info">
                                    <div class="product-name">{{ record.name }}</div>
                                </div>
                            </template>
                        </StandTable>
                    </div>
                </div>
        </div>
        <div class="mudule-four"></div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import StandTable from '../../../components/standTable/index.vue'

const selectedIndustry = ref('')
const activeCardIndex = ref(0) // 默认选中转化指数（第4个，索引为3）
const trendChartRef = ref<HTMLElement>()
const selectedTimeRange = ref('30days') // 默认选择最近30天

// 带货榜单表格数据
const loading = ref(false)

const tableColumns = ref([
  {
    prop: 'rank',
    label: '排名',
    width: '80px',
    align: 'center'
  },
  {
    prop: 'name',
    label: '商品信息',
    width: '280px',
    align: 'left'
  },
  {
    prop: 'amount',
    label: '成交额(元)',
    width: '120px',
    align: 'right',
    sortable: true
  },
  {
    prop: 'userCount',
    label: '成交用户数',
    width: '120px',
    align: 'right',
    sortable: true
  }
])

const tableData = ref([
  {
    id: 1,
    rank: 1,
    name: '纯棉休闲T恤 简约百搭 圆领短袖 上衣',
    amount: '8,765',
    userCount: '523'
  },
  {
    id: 2,
    rank: 2,
    name: '冰丝休闲裤 薄款 2024夏季新款 男士',
    amount: '7,234',
    userCount: '445'
  },
  {
    id: 3,
    rank: 3,
    name: '竹炭净味除臭喷雾鞋子防臭杀菌',
    amount: '6,123',
    userCount: '892'
  },
  {
    id: 4,
    rank: 4,
    name: '轻便简约双肩包 大容量 电脑包',
    amount: '5,456',
    userCount: '234'
  },
  {
    id: 5,
    rank: 5,
    name: '防晒喷雾 隔离紫外线 清爽不油腻',
    amount: '4,789',
    userCount: '367'
  }
])

const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  console.log('排序变化:', prop, order)
  // 这里可以添加排序逻辑
}

// 切换卡片选中状态
const handleCardClick = (index: number) => {
    activeCardIndex.value = index
}

// 生成最近6个月的日期，间隔10天
const generateTrendDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 180; i >= 0; i -= 10) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        dates.push(date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }))
    }
    return dates
}

// 生成星图指数模拟数据
const generateTrendData = () => {
    const data = []
    let baseValue = 85
    for (let i = 0; i < 19; i++) { // 6个月，每10天一个数据点，大约18个点
        // 生成有波动但整体趋势稳定的数据
        const change = (Math.random() - 0.5) * 6
        baseValue += change
        baseValue = Math.max(75, Math.min(100, baseValue)) // 限制在75-100之间
        data.push(Math.round(baseValue * 10) / 10)
    }
    return data
}

// 初始化星图指数趋势图
const initTrendChart = () => {
    if (!trendChartRef.value) return

    const myChart = echarts.init(trendChartRef.value)

    const dates = generateTrendDates()
    const trendData = generateTrendData()

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                crossStyle: {
                    color: '#999'
                }
            },
            formatter: (params: any) => {
                const data = params[0]
                return `${data.axisValue}<br/>星图指数: ${data.value}`
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: dates,
            axisPointer: {
                type: 'shadow'
            },
            axisLabel: {
                interval: 0, // 显示所有标签，因为我们已经按10天间隔生成
                rotate: 45, // 旋转45度以避免重叠
                fontSize: 12
            }
        },
        yAxis: {
            type: 'value',
            name: '星图指数',
            min: 70,
            max: 90,
            axisLabel: {
                formatter: '{value}'
            }
        },
        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: 0,
                start: 0,
                end: 100
            },
            {
                type: 'slider',
                xAxisIndex: 0,
                start: 0,
                end: 100,
                height: 20,
                bottom: 10
            }
        ],
        series: [
            {
                name: '星图指数',
                type: 'line',
                smooth: true,
                lineStyle: {
                    color: '#1890ff',
                    width: 2
                },
                itemStyle: {
                    color: '#1890ff'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: 'rgba(218, 237, 253, 0.8)'
                            },
                            {
                                offset: 1,
                                color: 'rgba(253, 254, 255, 1)'
                            }
                        ]
                    }
                },
                data: trendData,
                markPoint: {
                    data: [
                        {
                            type: 'max',
                            name: '最大值'
                        },
                        {
                            type: 'min',
                            name: '最小值'
                        }
                    ]
                },
                markLine: {
                    data: [
                        {
                            type: 'average',
                            name: '平均值'
                        }
                    ]
                }
            }
        ]
    }

    myChart.setOption(option)

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

onMounted(() => {
    nextTick(() => {
        initTrendChart()
    })
})
</script>
<style lang="scss" scoped>
.space-content {
display: flex;
flex-direction: column;
gap: 16px;

    .mudule-one {
        background: #fff;
        padding: 20px;
        border-radius: 8px;

        .tab-card-group {
            display: flex;
            gap: 16px;

            .tab-card-item {
                flex: 1;
                cursor: pointer;
                transition: all 0.3s;

                &.is-active {
                    border-color: #1890ff;
                    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
                }

                &:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }

                .relative-ratio {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    .ratio-label {
                        font-size: 12px;
                        color: #999;
                    }

                    .ratio-value {
                        font-size: 14px;
                        font-weight: 500;

                        &.decline {
                            color: #52c41a;
                        }

                        &.grow {
                            color: #ff4d4f;
                        }
                    }
                }

                .link-info {
                    .icon-tooltip-label {
                        display: flex;
                        align-items: center;
                        gap: 4px;

                        .text {
                            font-size: 14px;
                            color: #333;
                        }

                        .icon {
                            font-size: 14px;
                            color: #999;
                            cursor: pointer;

                            &:hover {
                                color: #1890ff;
                            }
                        }
                    }

                    .link-value {
                        font-size: 24px;
                        font-weight: 400;
                        color: #333;
                    }
                }

                .rank {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    .rank-label {
                        font-size: 12px;
                        color: #999;
                    }

                    .rank-value {
                        font-size: 14px;
                        font-weight: 500;
                        color: #333;
                    }
                }
            }
        }
    }
    .mudule-two {
        background: #fff;
        padding: 20px;
        border-radius: 8px;

        .chart-container {
            margin-top: 20px;

            .trend-chart {
                width: 100%;
                height: 400px;
            }
        }
    }
    .mudule-three {
        background: #fff;
        padding: 20px;
        border-radius: 8px;

        .title-wrapper {
            .title {
                .title-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;

                    .main-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #333;
                        margin: 0;
                    }

                    .sub-title-text {
                        color: #999;
                        font-size: 14px;
                        font-weight: 400;
                    }
                }
            }
        }
        .time-range-selector {
                display: flex;
                align-items: center;
                gap: 8px;

                .prepend {
                    font-size: 14px;
                    color: #666;
                }

                .time-select {
                    width: 120px;

                    :deep(.el-input) {
                        .el-input__inner {
                            font-size: 14px;
                        }
                    }
                }
            }

        .colum-information-template {
            margin-top: 20px;

            .data-row {
                .main-data {
                    display: flex;
                    gap: 80px;
                    justify-content: center;

                    .data-item {
                        text-align: center;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;

                        .icon-tooltip-label {
                            .text {
                                font-size: 14px;
                                color: #666;
                                font-weight: 400;
                            }

                            &::after {
                                content: '';
                                position: absolute;
                                right: -20px;
                                top: 50%;
                                transform: translateY(-50%);
                                width: 1px;
                                height: 16px;
                                background-color: #e8e8e8;
                            }

                            &:last-child::after {
                                display: none;
                            }
                        }

                        .value {
                            font-size: 20px;
                            font-weight: 400;
                            color: #333;
                        }
                    }
                }

                .horizontal-divider {
                    margin: 20px 0;
                    border-color: #e8e8e8;
                }
            }
        }

        .daihuo-information-analysis {
            .sub-title {
                display: block;
                margin-bottom: 20px;
            }
        }
    }
    .mudule-four {
        background: #fff;
        padding: 20px;
        border-radius: 8px;
    }
}
 .title-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    .title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
    }

    .operation {
        display: flex;
        align-items: center;
        gap: 16px;

        .operation-item {
            &:not(.el-button) {
                .industry-select {
                    width: 140px;

                    :deep(.el-input) {
                        .el-input__prefix {
                            color: #666;
                            font-size: 14px;
                        }
                    }
                }
            }
        }
    }
}
</style>