<template>
    <div class="space-content">
        <div class="mudule-one">
            <div class="title-wrapper">
                <div class="title">连接用户分布</div>
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
            <!-- <a-divider /> -->
            <div class="tab-card-group link-card">
                <a-card
                    class="tab-card-item link-card-item"
                    :class="{ 'is-active': activeCardIndex === 0 }"
                    hoverable
                    @click="handleCardClick(0)"
                >
                    <div class="relative-ratio">
                        <span class="ratio-label">30天环比</span>
                        <span class="ratio-value decline">-25.6%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">连接用户数</span>
                            <a-tooltip title="连接用户数说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">192,541,428</div>
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
                        <span class="ratio-value decline">-23.7%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">了解</span>
                            <a-tooltip title="了解说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">87,077,854</div>
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
                        <span class="ratio-value decline">-26%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">兴趣</span>
                            <a-tooltip title="兴趣说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">80,810,382</div>
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
                        <span class="ratio-value decline">-30.6%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">喜欢</span>
                            <a-tooltip title="喜欢说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">24,430,334</div>
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
                        <span class="ratio-value decline">-19.5%</span>
                    </div>
                    <div class="link-info">
                        <span class="icon-tooltip-label link-label">
                            <span class="text">追随</span>
                            <a-tooltip title="追随说明" placement="top">
                                <QuestionCircleOutlined class="icon right" />
                            </a-tooltip>
                        </span>
                        <div class="link-value">222,858</div>
                    </div>
                </a-card>
            </div>
        </div>
        <div class="mudule-two">
            <div class="title-wrapper">
                <div class="title">用户连接趋势</div>
            </div>
            <div class="chart-container" ref="trendChart" style="width: 100%; height: 300px;"></div>
        </div>
        <div class="mudule-three">
            <div class="card-panel module-card data-overview">
                <div class="title-wrapper">
                    <div class="title">
                        <div class="title-content" style="display: flex; align-items: center; gap: 8px;">
                            <h2 class="main-title">连接用户漏斗</h2>
                            <div class="divider-vertical"></div>
                            <span class="sub-title-text">洞察"达人"和"已观看视频的去重用户"之间的远近关系</span>
                        </div>
                    </div>
                    <div class="operation">
                        <div class="operation-item">
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
                        </div>
                        <button type="button" class="more-btn operation-item" @click="handleMore">
                            <span>查看更多 <i class="right-arrow"></i></span>
                        </button>
                    </div>
                </div>
                <el-divider />
                <div class="card-panel-body">
                    <!-- 左右布局容器 -->
                    <div class="content-container">
                        <!-- 左侧：漏斗图 -->
                        <div class="left-chart">
                            <div class="funnel-chart" ref="funnelChartRef"></div>
                        </div>

                        <!-- 右侧：文字信息 -->
                        <div class="right-content">
                            <div class="header-section">
                                <h2 class="talent-type-title">传播型达人</h2>
                                <a-tooltip placement="top">
                                    <template #title>
                                        <span>该类达人，近30天的所有受众中，观看互动受众占比较高，传播效率高。</span>
                                    </template>
                                    <QuestionCircleOutlined class="question-icon" />
                                </a-tooltip>
                            </div>

                            <section class="info-section">
                                <div class="section-title">总结</div>
                                <p class="section-content">
                                    月度连接总用户数
                                    <span>19,480.8w，环比 -24.5%</span>
                                </p>
                                <p class="section-content">
                                    位于行业内
                                    <span>TOP 5‰</span>
                                </p>
                            </section>

                            <section class="info-section">
                                <div class="section-title">连接用户类型</div>
                                <p class="section-content">
                                    触达用户
                                    <span>31-40岁居多，男性居多</span>
                                </p>
                                <p class="section-content">
                                    集中
                                    <span>分布在一线城市</span>
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="mudule-four">
             <div class="title-wrapper">
                <div class="title">连接用户来源</div>
            </div>
            <div class="users-source">
                <!-- 左侧：流量来源圆环图 -->
                <div class="char-card">
                    <span class="title">流量来源</span>
                    <div class="base-chart" ref="pieChartRef"></div>
                </div>

                <!-- 中间：内容一级标签柱状图 -->
                <div class="char-card">
                    <div class="chart-header">
                        <span class="title">内容一级标签</span>
                        <div class="divider"></div>
                        <a-dropdown>
                            <a-button type="text" class="tag-select">
                                <span class="dropdown-content">
                                    <span class="dropdown-text">{{ selectedFirstTag }}</span>
                                    <DownOutlined />
                                </span>
                            </a-button>
                            <template #overlay>
                                <a-menu @click="handleFirstTagChange">
                                    <a-menu-item key="个人视频">个人视频</a-menu-item>
                                    <a-menu-item key="星图视频">星图视频</a-menu-item>
                                </a-menu>
                            </template>
                        </a-dropdown>
                    </div>
                    <div class="base-chart age-chart" ref="barChart1Ref"></div>
                </div>

                <!-- 右侧：内容二级标签柱状图 -->
                <div class="char-card">
                    <div class="chart-header">
                        <span class="title">内容二级标签</span>
                        <div class="divider"></div>
                        <a-dropdown>
                            <a-button type="text" class="tag-select">
                                <span class="dropdown-content">
                                    <span class="dropdown-text">{{ selectedSecondTag }}</span>
                                    <DownOutlined />
                                </span>
                            </a-button>
                            <template #overlay>
                                <a-menu @click="handleSecondTagChange">
                                    <a-menu-item key="生活家居">生活家居</a-menu-item>
                                    <a-menu-item key="其他">其他</a-menu-item>
                                </a-menu>
                            </template>
                        </a-dropdown>
                    </div>
                    <div class="base-chart age-chart" ref="barChart2Ref"></div>
                </div>
            </div>
        </div>
         <div class="mudule-five">
             <!-- 标题栏 -->
            <div class="echart-trend-panel--header">
                <h3 class="panel-title">连接用户画像</h3>
                <div class="data-filter">
                    <a-radio-group v-model:value="activeFilter" class="radio-button-group" button-style="solid">
                        <a-radio-button value="-1">观众画像</a-radio-button>
                        <a-radio-button value="0">粉丝画像</a-radio-button>
                        <a-radio-button value="1">铁粉画像</a-radio-button>
                    </a-radio-group>
                </div>
            </div>
            <!-- 图表内容 -->
            <div class="charts-content">
                <!-- 性别分布 -->
                <div class="chart-container gender-container">
                    <p class="title">性别分布</p>
                    <div class="base-chart gender-chart" ref="genderChartRef"></div>
                    <div class="gender-legend">
                        <div class="legend-wrapper">
                            <ManOutlined class="svg-icon male-icon" />
                            <div class="legend-content male">
                                <div class="legend-label">男性占比</div>
                                <div class="value">69.6%</div>
                            </div>
                        </div>
                        <div class="legend-wrapper">
                            <WomanOutlined class="svg-icon female-icon" />
                            <div class="legend-content female">
                                <div class="legend-label">女性占比</div>
                                <div class="value">30.4%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 年龄分布 -->
                <div class="chart-container">
                    <p class="title">年龄分布</p>
                    <div class="base-chart age-chart" ref="ageChartRef"></div>
                </div>
                 <!-- 省份分布 -->
                <div class="chart-container">
                    <p class="title">省份分布</p>
                    <div class="base-chart map-chart" ref="provinceChartRef"></div>
                </div>

                <!-- 设备分布 -->
                <div class="chart-container">
                    <p class="title">设备分布</p>
                    <div class="base-chart device-pie-chart" ref="devicePieChartRef"></div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { QuestionCircleOutlined, DownOutlined, ManOutlined, WomanOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'

const selectedIndustry = ref('')
const trendChart = ref()
const activeCardIndex = ref(0) // 当前选中的卡片索引
const funnelChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
const barChart1Ref = ref<HTMLElement>()
const barChart2Ref = ref<HTMLElement>()
const genderChartRef = ref<HTMLElement>()
const ageChartRef = ref<HTMLElement>()
const selectedFirstTag = ref('个人视频')
const selectedSecondTag = ref('生活家居')
const activeFilter = ref('-1')
const provinceChartRef = ref<HTMLElement>()
const devicePieChartRef = ref<HTMLElement>()

// 切换卡片选中状态
const handleCardClick = (index: number) => {
    activeCardIndex.value = index
}

const handleMore = () => {
    console.log('查看更多')
}

const handleFirstTagChange = ({ key }: { key: string }) => {
    selectedFirstTag.value = key
    // TODO: 根据选择的标签更新中间图表数据
    initBarChart1()
}

const handleSecondTagChange = ({ key }: { key: string }) => {
    selectedSecondTag.value = key
    // TODO: 根据选择的标签更新右侧图表数据
    initBarChart2()
}

// 初始化漏斗图
const initFunnelChart = () => {
    if (!funnelChartRef.value) return

    // Clear any existing chart
    echarts.dispose(funnelChartRef.value)
    const myChart = echarts.init(funnelChartRef.value)

    const funnelData = [
        { name: '了解', percent: '45.1%', value: '8,784.1w', dataValue: 45.1 },
        { name: '兴趣', percent: '42%', value: '8,181.9w', dataValue: 42 },
        { name: '喜欢', percent: '12.8%', value: '2,491.7w', dataValue: 12.8 },
        { name: '追随', percent: '0.1%', value: '23.1w', dataValue: 0.1 }
    ]

    const option = {
        color: ['#1890ff'],
        legend: {
            data: ['达人结构'],
            top: 10,
            left: 10,
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
            textStyle: {
                fontSize: 12,
                color: '#666'
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}%'
        },
        series: [
            {
                name: '达人结构',
                type: 'funnel',
                left: '5%',
                top: '0%',
                bottom: '10%',
                width: '90%',
                min: 0,
                max: 100,
                minSize: '0%',
                maxSize: '100%',
                sort: 'descending',
                orient: 'horizontal',
                gap: 2,
                label: {
                    show: true,
                    position: 'bottom',
                    formatter: (params: any) => {
                        const item = funnelData[params.dataIndex]
                        return `\n\n{dot|●} {name|${item.name}}\n{percent|${item.percent}}\n{value|${item.value}}`
                    },
                    rich: {
                        dot: {
                            color: '#1890ff',
                            fontSize: 12,
                            padding: [0, 4, 0, 0]
                        },
                        name: {
                            color: '#6e748e',
                            fontSize: 12,
                            lineHeight: 20
                        },
                        percent: {
                            color: '#6e748e',
                            fontSize: 12,
                            lineHeight: 20
                        },
                        value: {
                            color: '#6e748e',
                            fontSize: 12,
                            lineHeight: 20
                        }
                    }
                },
                labelLine: {
                    show: false
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1
                },
                emphasis: {
                    label: {
                        fontSize: 14
                    }
                },
                data: funnelData.map(item => ({ value: item.dataValue, name: item.name }))
            }
        ]
    }

    myChart.setOption(option, true)

    // Make chart responsive
    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// 生成最近30天的日期，间隔2天
const generateDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 29; i >= 0; i -= 2) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        dates.push(date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }))
    }
    return dates
}

// 生成模拟数据
const generateData = () => {
    const baseConnected = 150000000
    const baseFans = 80000000

    const connectedData = []
    const fansData = []

    for (let i = 0; i < 15; i++) {
        connectedData.push(baseConnected + Math.random() * 50000000 - 25000000)
        fansData.push(baseFans + Math.random() * 30000000 - 15000000)
    }

    return { connectedData, fansData }
}

// 初始化图表
const initTrendChart = () => {
    const chartDom = trendChart.value
    if (!chartDom) return

    const myChart = echarts.init(chartDom)

    const { dates, connectedData, fansData } = {
        dates: generateDates(),
        ...generateData()
    }

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                crossStyle: {
                    color: '#999'
                }
            }
        },
        legend: {
            data: ['连接用户数', '粉丝数'],
            top: 0
        },
        grid: {
            left: '3%',
            right: '0%',
            bottom: '0%',
            containLabel: true
        },
        xAxis: [
            {
                type: 'category',
                data: dates,
                axisPointer: {
                    type: 'shadow'
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                name: '连接用户数',
                position: 'left',
                alignTicks: true,
                axisLabel: {
                    formatter: (value: number) => {
                        if (value >= 100000000) {
                            return (value / 100000000).toFixed(1) + '亿'
                        } else if (value >= 10000) {
                            return (value / 10000).toFixed(1) + '万'
                        }
                        return value.toString()
                    }
                }
            },
            {
                type: 'value',
                name: '粉丝数',
                position: 'right',
                alignTicks: true,
                axisLabel: {
                    formatter: (value: number) => {
                        if (value >= 100000000) {
                            return (value / 100000000).toFixed(1) + '亿'
                        } else if (value >= 10000) {
                            return (value / 10000).toFixed(1) + '万'
                        }
                        return value.toString()
                    }
                }
            }
        ],
        series: [
            {
                name: '连接用户数',
                type: 'line',
                yAxisIndex: 0,
                smooth: true,
                lineStyle: {
                    color: '#1890ff',
                    width: 1
                },
                itemStyle: {
                    color: '#1890ff'
                },
                data: connectedData
            },
            {
                name: '粉丝数',
                type: 'line',
                yAxisIndex: 1,
                smooth: true,
                lineStyle: {
                    color: '#ff6b9d',
                    width: 1
                },
                itemStyle: {
                    color: '#ff6b9d'
                },
                data: fansData
            }
        ]
    }

    myChart.setOption(option)

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// 初始化圆环图
const initPieChart = () => {
    if (!pieChartRef.value) return

    const myChart = echarts.init(pieChartRef.value)

    const pieData = [
        { name: '个人视频', value: 33.71, selected: true },
        { name: '星图视频', value: 66.29, selected: false }
    ]

    const option = {
        color: ['#DCf3FF', '#1890ff'],
        series: [
            {
                type: 'pie',
                radius: ['50%', '70%'],
                center: ['50%', '50%'],
                selectedMode: 'single',
                data: pieData,
                label: {
                    show: true
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold',
                        formatter: '{b}\n{c}%'
                    }
                },
                labelLine: {
                    show: true,
                    lineStyle: {
                        color: '#409eff'    // 颜色（这里是蓝色）
                    }
                }
            }
        ],
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c}%'
        }
    }

    myChart.setOption(option)

    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// 初始化柱状图1
const initBarChart1 = () => {
    if (!barChart1Ref.value) return

    const myChart = echarts.init(barChart1Ref.value)

    const barData = [
        { name: '电视剧', value: 3.09 },
        { name: '电影', value: 25.6 },
        { name: '综艺', value: 18.3 },
        { name: '动漫', value: 12.5 },
        { name: '其他', value: 40.51 }
    ]

    const option = {
        color: ['#38A1FF'],
        grid: {
            left: '3%',
            right: '3%',
            bottom: '3%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: barData.map(item => item.name),
            axisLabel: {
                interval: 0,
                rotate: 45,
                fontSize: 11
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: '{value}%'
            }
        },
        series: [
            {
                type: 'bar',
                data: barData.map(item => item.value),
                barWidth: '40%',
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%'
                }
            }
        ],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params: any) => {
                const data = params[0]
                return `${data.name}<br/>标签占比: ${data.value}%`
            }
        }
    }

    myChart.setOption(option)

    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// 初始化柱状图2
const initBarChart2 = () => {
    if (!barChart2Ref.value) return

    const myChart = echarts.init(barChart2Ref.value)

    const barData = [
        { name: '生活技巧', value: 93.4 },
        { name: '美食', value: 85.2 },
        { name: '家居', value: 76.8 },
        { name: '穿搭', value: 68.5 },
        { name: '其他', value: 45.3 }
    ]

    const option = {
        color: ['#38A1FF'],
        grid: {
            left: '3%',
            right: '3%',
            bottom: '3%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: barData.map(item => item.name),
            axisLabel: {
                interval: 0,
                rotate: 45,
                fontSize: 11
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: '{value}%'
            }
        },
        series: [
            {
                type: 'bar',
                data: barData.map(item => item.value),
                barWidth: '40%',
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%'
                }
            }
        ],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params: any) => {
                const data = params[0]
                return `${data.name}<br/>标签占比: ${data.value}%`
            }
        }
    }

    myChart.setOption(option)

    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// 初始化性别分布图
const initGenderChart = () => {
    if (!genderChartRef.value) return

    const myChart = echarts.init(genderChartRef.value)

    const genderData = [
        { name: '男性', value: 69.6 },
        { name: '女性', value: 30.4 }
    ]

    const option = {
        color: ['#38A1FF', '#FF6B9D'],
        series: [
            {
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '50%'],
                data: genderData,
                label: {
                    show: false
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                }
            }
        ],
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}%'
        }
    }

    myChart.setOption(option)

    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// 初始化年龄分布图
const initAgeChart = () => {
    if (!ageChartRef.value) return

    const myChart = echarts.init(ageChartRef.value)

    const ageData = [
        { name: '18-23', value: 16.2 },
        { name: '24-30', value: 28.5 },
        { name: '31-40', value: 35.8 },
        { name: '41-50', value: 14.3 },
        { name: '50+', value: 5.2 }
    ]

    const option = {
        color: ['#38A1FF'],
        grid: {
            left: '3%',
            right: '3%',
            bottom: '3%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ageData.map(item => item.name),
            axisLabel: {
                interval: 0,
                fontSize: 12
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: '{value}%'
            }
        },
        series: [
            {
                type: 'bar',
                data: ageData.map(item => item.value),
                barWidth: '50%',
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%'
                },
                itemStyle: {
                    borderRadius: [4, 4, 0, 0]
                }
            }
        ],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params: any) => {
                const data = params[0]
                return `${data.name}<br/>年龄占比: ${data.value}%`
            }
        }
    }

    myChart.setOption(option)

    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// 初始化省份地图
const initProvinceMap = () => {
    if (!provinceChartRef.value) return

    const myChart = echarts.init(provinceChartRef.value)

    // 显示加载动画
    myChart.showLoading()

    // 省份数据 - 使用完整的行政区划名称以匹配GeoJSON
    const provinceData = [
        { name: '广东省', value: 11.8 },
        { name: '山东省', value: 8.9 },
        { name: '河南省', value: 7.6 },
        { name: '江苏省', value: 7.2 },
        { name: '四川省', value: 6.8 },
        { name: '河北省', value: 5.9 },
        { name: '湖南省', value: 5.4 },
        { name: '安徽省', value: 5.1 },
        { name: '湖北省', value: 4.8 },
        { name: '浙江省', value: 4.5 },
        { name: '广西壮族自治区', value: 4.2 },
        { name: '云南省', value: 3.8 },
        { name: '江西省', value: 3.5 },
        { name: '辽宁省', value: 3.2 },
        { name: '黑龙江省', value: 2.9 },
        { name: '陕西省', value: 2.6 },
        { name: '山西省', value: 2.3 },
        { name: '福建省', value: 2.1 },
        { name: '贵州省', value: 1.8 },
        { name: '重庆市', value: 1.5 },
        { name: '吉林省', value: 1.2 },
        { name: '甘肃省', value: 1.0 },
        { name: '内蒙古自治区', value: 0.8 },
        { name: '新疆维吾尔自治区', value: 0.6 },
        { name: '上海市', value: 0.5 },
        { name: '北京市', value: 0.4 },
        { name: '天津市', value: 0.3 },
        { name: '海南省', value: 0.2 },
        { name: '宁夏回族自治区', value: 0.1 },
        { name: '青海省', value: 0.1 },
        { name: '西藏自治区', value: 0.1 },
        { name: '台湾省', value: 0.05 },
        { name: '香港特别行政区', value: 0.03 },
        { name: '澳门特别行政区', value: 0.02 }
    ]

    const option = {
        title: {
            // text: '全国省份用户分布',
            // left: 'center',
            // textStyle: {
            //     fontSize: 18,
            //     fontWeight: 'bold',
            //     color: '#333'
            // },
            // subtext: '颜色越深，用户占比越高',
            // subtextStyle: {
            //     fontSize: 12,
            //     color: '#666'
            // }
        },
        tooltip: {
            trigger: 'item',
            showDelay: 0,
            transitionDuration: 0.2,
            formatter: (params: any) => {
                const item = provinceData.find(p => p.name === params.name)
                if (item) {
                    return `${params.name}<br/>用户占比: ${item.value}%`
                }
                return `${params.name}<br/>暂无数据`
            }
        },
        visualMap: {
            type: 'continuous',
            min: 0.1,
            max: 11.8,
            left: 10,
            top: 'middle',
            orient: 'vertical',
            text: ['11.8%', '0.1%'],
            itemWidth: 15,
            itemHeight: 120,
            calculable: false,
            seriesIndex: 0,
            inRange: {
                color: ['#e6f7ff', '#91d5ff', '#69c0ff', '#40a9ff', '#1890ff']
            },
            textStyle: {
                color: '#666',
                fontSize: 12
            }
        },
        series: [
            {
                name: '省份分布',
                type: 'map',
                map: 'china',
                roam: true,
                center: [105, 35], // 地图中心点（经度, 纬度）
                zoom: 1.5,
                emphasis: {
                    label: {
                        show: true,
                        color: '#333',
                        fontSize: 14
                    },
                    itemStyle: {
                        areaColor: 'yellow',
                        borderColor: '#fff',
                        borderWidth: 2
                    }
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1,
                    areaColor: '#f0f8ff'
                },
                data: provinceData
            }
        ]
    }

    // 创建加载地图数据的函数
    const loadMapData = async () => {
        try {
            // 使用本地地图 JSON 文件
            const response = await fetch('/china.json')
            if (!response.ok) {
                throw new Error('网络请求失败')
            }
            const chinaJson = await response.json()
            myChart.hideLoading()
            echarts.registerMap('china', chinaJson)
            myChart.setOption(option)
        } catch (error) {
            console.error('加载中国地图数据失败:', error)
            myChart.hideLoading()
            // 显示错误提示
            myChart.setOption({
                title: {
                    text: '地图数据加载失败',
                    subtext: '请检查网络连接',
                    left: 'center',
                    top: 'center',
                    textStyle: {
                        color: '#999'
                    },
                    subtextStyle: {
                        color: '#666'
                    }
                }
            })
        }
    }

    // 加载地图数据
    loadMapData()

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// 初始化设备分布图
const initDevicePieChart = () => {
    if (!devicePieChartRef.value) return

    const myChart = echarts.init(devicePieChartRef.value)

    const deviceData = [
        { name: '安卓', value: 68.9 },
        { name: '苹果', value: 24.3 },
        { name: '其他', value: 6.8 }
    ]

    const option = {
        color: ['#1890ff', '#ff6b9d', '#ffc069'],
        series: [
            {
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '50%'],
                data: deviceData,
                label: {
                    show: true,
                    position: 'outside',
                    formatter: '{b}: {c}%',
                    fontSize: 12
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: true,
                    length: 20,
                    length2: 15,
                    lineStyle: {
                        width: 1
                    }
                }
            }
        ],
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}%'
        }
    }

    myChart.setOption(option)

    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

onMounted(() => {
    nextTick(() => {
        initTrendChart()
        initFunnelChart()
        initPieChart()
        initBarChart1()
        initBarChart2()
        initGenderChart()
        initAgeChart()
        initProvinceMap()
        initDevicePieChart()
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
                    margin-bottom: 12px;

                    .ratio-label {
                        font-size: 12px;
                        color: #666;
                    }

                    .ratio-value {
                        font-size: 14px;
                        font-weight: 500;

                        &.decline {
                             color: #52c41a;
                        }

                        &.rise {
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
            }
        }
    }
    .mudule-two {
        background: #fff;
        padding: 20px;
        border-radius: 8px;
    }
    .mudule-three {
        background: #fff;
        padding: 20px;
        border-radius: 8px;

        .card-panel {
            .divider-vertical {
                height: 20px;
                width: 1px;
                background-color: #e8e8e8;
                margin: 0 8px;
            }

            .sub-title-text {
                color: #999;
                font-size: 14px;
                font-weight: 400;
            }
            .more-btn {
                font-weight: 400;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #666666;
                background: #fff;
                font-size: 14px;

                &:hover {
                    color: #409eff;
                }

                .right-arrow {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    margin-left: 4px;
                    border-top: 1px solid currentColor;
                    border-right: 1px solid currentColor;
                    transform: rotate(45deg);
                }
            }

            .card-panel-body {
                padding: 20px 0;

                .content-container {
                    display: flex;
                    gap: 40px;
                    align-items: flex-start;

                    .left-chart {
                        flex: 1;

                        .funnel-chart {
                            width: 100%;
                            height: 300px;
                        }
                    }

                    .right-content {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 20px;

                        .header-section {
                            display: flex;
                            align-items: center;
                            gap: 8px;

                            .talent-type-title {
                                font-size: 20px;
                                font-weight: 600;
                                color: #333;
                                margin: 0;
                            }

                            .question-icon {
                                color: #999;
                                font-size: 16px;
                                cursor: pointer;

                                &:hover {
                                    color: #666;
                                }
                            }
                        }

                        .info-section {
                            .section-title {
                                font-size: 14px;
                                font-weight: 600;
                                color: #333;
                                margin-bottom: 8px;
                            }

                            .section-content {
                                font-size: 14px;
                                color: #666;
                                line-height: 22px;
                                margin: 4px 0;
                            }
                        }
                    }
                }
            }
        }
    }
    .mudule-four {
        background: #fff;
        padding: 20px;
        border-radius: 8px;

        .users-source {
            display: flex;
            gap: 20px;
            margin-top: 20px;

            .char-card {
                flex: 1;
                background: #fafafa;
                border-radius: 8px;
                padding: 16px;

                

                .title {
                    font-size: 14px;
                    font-weight: 500;
                    color: #333;
                    display: block;
                    margin-bottom: 12px;
                }

                .chart-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;

                    .title {
                        margin-bottom: 0;
                    }

                    .divider {
                        width: 1px;
                        height: 14px;
                        background-color: #e8e8e8;
                    }

                    .tag-select {
                        padding: 0;
                        font-size: 14px;
                        color: #666;
                        height: auto;

                        .dropdown-content {
                            display: flex;
                            align-items: center;
                            gap: 4px;

                            .dropdown-text {
                                color: #333;
                            }
                        }

                        &:hover {
                            color: #1890ff;
                        }
                    }
                }

                .base-chart {
                    width: 100%;
                    height: 280px;
                }
            }
        }
    }
    .mudule-five{
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        // 标题栏
        .echart-trend-panel--header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;

            .panel-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin: 0;
            }

            .data-filter {
                .radio-button-group {
                    display: flex;
                    gap: 0;

                    :deep(.ant-radio-button-wrapper) {
                        background-color: transparent;
                    }

                    :deep(.ant-radio-button-wrapper-checked) {
                        color: #1890ff;
                    }
                }
            }
        }

        .charts-content {
            padding: 0 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;

            .chart-container {
                padding: 20px;
                border: 1px solid #e6e4e4;
                border-radius: 10px;

                &.gender-container {
                    .gender-chart {
                        height: 235px;
                    }

                    .gender-legend {
                        display: flex;
                        justify-content: center;
                        gap: 60px;
                        margin-top: 20px;

                        .legend-wrapper {
                            display: flex;
                            align-items: center;
                            gap: 8px;

                            .svg-icon {
                                font-size: 24px;

                                &.male-icon {
                                    color: #38A1FF;
                                }

                                &.female-icon {
                                    color: #FF6B9D;
                                }
                            }

                            .legend-content {
                                .legend-label {
                                    font-size: 12px;
                                    color: #666;
                                    margin-bottom: 4px;
                                }

                                .value {
                                    font-size: 20px;
                                    font-weight: 600;
                                    color: #333;
                                }
                            }
                        }
                    }
                }

                .title {
                    font-size: 14px;
                    font-weight: 500;
                    color: #333;
                    margin: 0 0 16px 0;
                }

                .base-chart {
                    width: 100%;

                    &.age-chart {
                        height: 274px;
                    }

                    &.map-chart {
                        height: 274px;
                    }

                    &.device-pie-chart {
                        height: 274px;
                    }
                }
            }
        }
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