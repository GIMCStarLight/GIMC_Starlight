<template>
    <div class="space-content">
        <div class="mudule-one">
            <div class="title-wrapper">
                <div class="title">商业能力</div>
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
                    <button type="button" class="more-btn operation-item el-button el-button--text is-round" @click="handleMore">
                        <span>查看更多 <i class="right-arrow"></i></span>
                    </button>
                </div>
            </div>
            <el-divider />
            <div class="card-panel-body">
                <!-- Left side - Star score and radar chart -->
                <div class="star-score">
                    <div class="score-detail">
                        <span class="score-title">星图指数</span>
                        <span class="value">90.2</span>
                        <span class="rapid-highlight increase">
                            <i class="arrow-up"></i>
                            2.6%
                        </span>
                        <span class="rank-text">
                            行业内排名
                            <span class="highlight">26</span>
                        </span>
                    </div>
                    <div class="describe">
                        <div>
                            <span class="dot full"></span>
                            <span>达人指数</span>
                        </div>
                        <div class="median">
                            <span class="dot compare"></span>
                            <span>行业均值</span>
                        </div>
                    </div>
                    <div class="radar-chart-container" ref="radarChartRef"></div>
                </div>

                <!-- Right side - Analysis table -->
                <div class="star-analysis">
                    <a-table
                        :columns="tableColumns"
                        :data-source="tableData"
                        :pagination="false"
                        size="small"
                        :bordered="false"
                    >
                        <template #bodyCell="{ column, record }">
                            <template v-if="column.key === 'name'">
                                <span class="icon-tooltip-label">
                                    <span class="text">{{ record.name }}</span>
                                    <a-tooltip title="指标说明">
                                        <QuestionCircleOutlined />
                                    </a-tooltip>
                                </span>
                            </template>
                            <template v-else-if="column.key === 'change'">
                                <span :class="record.changeType === 'positive' ? 'positive' : 'negative'">
                                    {{ record.changeType === 'positive' ? '+' : '' }}{{ record.change }}%
                                </span>
                            </template>
                            <template v-else>
                                {{ record[column.key] }}
                            </template>
                        </template>
                    </a-table>
                </div>
            </div>
        </div>
        <div class="mudule-two">
            <div class="card-panel module-card data-overview">
                <div class="title-wrapper">
                    <div class="title">内容数据</div>
                    <div class="operation">
                        <div class="operation-item switch-container">
                            <el-switch
                                v-model="excludeAdTraffic"
                                disabled
                                active-text="排除广告流量"
                                class="exclude-ad-switch"
                            />
                        </div>
                        <a-radio-group v-model:value="videoType" class="operation-item" size="small">
                            <a-radio-button value="1">个人视频</a-radio-button>
                            <a-radio-button value="2">星图视频</a-radio-button>
                        </a-radio-group>
                        <div class="base-input__wrapper operation-item">
                            <div class="base-input__prepend">时间：</div>
                            <div class="base-input__content">
                                <a-select v-model:value="timeRange" placeholder="请选择" class="base-select" :bordered="false">
                                    <a-select-option value="7">最近7天</a-select-option>
                                    <a-select-option value="30">最近30天</a-select-option>
                                    <a-select-option value="90">最近90天</a-select-option>
                                </a-select>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="sub-title">
                    <a-divider />
                </div>
                <div class="card-panel-body">
                    <div class="colum-information-template">
                        <div class="main-data">
                            <div class="data">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">发布作品</span>
                                </span>
                                <div class="value">8</div>
                            </div>
                            <div class="data">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">平均时长</span>
                                </span>
                                <div class="value">230s</div>
                            </div>
                            <div class="data">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">平均点赞</span>
                                </span>
                                <div class="value">24.3w</div>
                            </div>
                            <div class="data">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">平均评论</span>
                                </span>
                                <div class="value">7,986</div>
                            </div>
                            <div class="data">
                                <span class="icon-tooltip-label label top-label">
                                    <span class="text">平均转发</span>
                                </span>
                                <div class="value">3.2w</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="mudule-three">
            <div class="card-panel module-card author-recommend-videos">
                <div class="title-wrapper">
                    <div class="title">
                        <span class="icon-tooltip-label">
                            <span class="text">内容表现</span>
                            <a-tooltip
                                :title="`个人爆文：近期个人视频中播放量最高的视频。
商单爆文：近期星图商单视频中播放量最高的视频（包括指派任务/投稿任务等多种任务类型）。
代表视频：上述视频以外的通过模型计算，在传播/种草/转化方向上综合表现较好的视频。
最新视频：达人发表的最新一篇对外可见的短视频（不包含图文/音乐等其他类型）。
“近期”指达人近30天数据，如果近30天无视频，则取近60天；如果近60天无视频，则取近90天数据。`"
                                class="icon right"
                            >
                                <QuestionCircleOutlined />
                            </a-tooltip>
                        </span>
                    </div>
                    <div class="operation">
                        <button type="button" class="more-btn el-button el-button--text is-round" @click="handleMoreVideos">
                            <span>查看更多 <i class="right-arrow"></i></span>
                        </button>
                    </div>
                </div>
                <div class="sub-title">
                    <el-divider />
                </div>
                <div class="card-panel-body">
                    <div class="author-video-list">
                        <div class="list-item">
                            <div class="video-player">
                                <div class="cover-top">
                                    <span class="tag">个人爆文</span>
                                </div>
                                <div
                                    class="video-player-cover cover-card md normal"
                                    @mouseenter="handleMouseEnter"
                                    @mouseleave="handleMouseLeave"
                                >
                                    <span class="play-icon" @click="playVideo($event, '/test.mp4')">
                                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                            <path d="M6 4v16l14-8L6 4Z" fill="currentColor" stroke="none"/>
                                        </svg>
                                    </span>
                                    <video
                                        src="/test.mp4"
                                        class="cover-image"
                                        muted
                                        loop
                                        ref="videoRefs"
                                    ></video>
                                </div>
                            </div>
                            <div class="video-info">
                                <span class="text-ellipsis">硬的怕横的，横的怕疯的 #陈翔六点半</span>
                                <div class="info-row">
                                    <span>播放量</span>
                                    <span class="value">17,621.1w</span>
                                </div>
                                <div class="info-row">
                                    <span>点赞量</span>
                                    <span class="value">201w</span>
                                </div>
                                <div class="info-row">
                                    <span>评论量</span>
                                    <span class="value">4.6w</span>
                                </div>
                            </div>
                        </div>
                        <div class="list-item">
                            <div class="video-player">
                                <div class="cover-top">
                                    <span class="tag">商单爆文</span>
                                </div>
                                <div
                                    class="video-player-cover cover-card md normal"
                                    @mouseenter="handleMouseEnter"
                                    @mouseleave="handleMouseLeave"
                                >
                                    <span class="play-icon" @click="playVideo($event, '/test.mp4')">
                                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                            <path d="M6 4v16l14-8L6 4Z" fill="currentColor" stroke="none"/>
                                        </svg>
                                    </span>
                                    <video
                                        src="/test.mp4"
                                        class="cover-image"
                                        muted
                                        loop
                                        ref="videoRefs"
                                    ></video>
                                </div>
                            </div>
                            <div class="video-info">
                                <span class="text-ellipsis">孔布"租房记</span>
                                <div class="info-row">
                                    <span>播放量</span>
                                    <span class="value">15,093.7w</span>
                                </div>
                                <div class="info-row">
                                    <span>点赞量</span>
                                    <span class="value">173.1w</span>
                                </div>
                                <div class="info-row">
                                    <span>评论量</span>
                                    <span class="value">3.8w</span>
                                </div>
                            </div>
                        </div>
                        <div class="list-item">
                            <div class="video-player">
                                <div class="cover-top">
                                    <span class="tag">代表视频</span>
                                </div>
                                <div
                                    class="video-player-cover cover-card md normal"
                                    @mouseenter="handleMouseEnter"
                                    @mouseleave="handleMouseLeave"
                                >
                                    <span class="play-icon" @click="playVideo($event, '/test.mp4')">
                                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                            <path d="M6 4v16l14-8L6 4Z" fill="currentColor" stroke="none"/>
                                        </svg>
                                    </span>
                                    <video
                                        src="/test.mp4"
                                        class="cover-image"
                                        muted
                                        loop
                                        ref="videoRefs"
                                    ></video>
                                </div>
                            </div>
                            <div class="video-info">
                                <span class="text-ellipsis">小偷严选之我的天命人 #陈翔六点半</span>
                                <div class="info-row">
                                    <span>播放量</span>
                                    <span class="value">13,071.4w</span>
                                </div>
                                <div class="info-row">
                                    <span>点赞量</span>
                                    <span class="value">164.2w</span>
                                </div>
                                <div class="info-row">
                                    <span>评论量</span>
                                    <span class="value">2.7w</span>
                                </div>
                            </div>
                        </div>
                        <div class="list-item">
                            <div class="video-player">
                                <div class="cover-top">
                                    <span class="tag">最新视频</span>
                                </div>
                                <div
                                    class="video-player-cover cover-card md normal"
                                    @mouseenter="handleMouseEnter"
                                    @mouseleave="handleMouseLeave"
                                >
                                    <span class="play-icon" @click="playVideo($event, '/test.mp4')">
                                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                            <path d="M6 4v16l14-8L6 4Z" fill="currentColor" stroke="none"/>
                                        </svg>
                                    </span>
                                    <video
                                        src="/test.mp4"
                                        class="cover-image"
                                        muted
                                        loop
                                        ref="videoRefs"
                                    ></video>
                                </div>
                            </div>
                            <div class="video-info">
                                <span class="text-ellipsis">爱情成了利弊题，你会怎么选？ #陈翔六点半</span>
                                <div class="info-row">
                                    <span>播放量</span>
                                    <span class="value">597.2w</span>
                                </div>
                                <div class="info-row">
                                    <span>点赞量</span>
                                    <span class="value">9.7w</span>
                                </div>
                                <div class="info-row">
                                    <span>评论量</span>
                                    <span class="value">3,017</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="mudule-four">
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
    </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'

const selectedIndustry = ref('')
const excludeAdTraffic = ref(true)
const videoType = ref('1')
const timeRange = ref('30')
const radarChartRef = ref<HTMLElement>()
const funnelChartRef = ref<HTMLElement>()

// Table columns configuration
const tableColumns = [
    {
        title: '指数名称',
        key: 'name',
        dataIndex: 'name',
        width: 115,
    },
    {
        title: '指数值',
        key: 'value',
        dataIndex: 'value',
        width: 80,
    },
    {
        title: '30天环比',
        key: 'change',
        dataIndex: 'change',
        width: 90,
    },
    {
        title: '行业均值',
        key: 'industryAvg',
        dataIndex: 'industryAvg',
        width: 80,
    },
    {
        title: '行业排名',
        key: 'ranking',
        dataIndex: 'ranking',
        width: 100,
    }
]

// Table data
const tableData = [
    {
        name: '传播指数',
        value: 98.3,
        change: 4.6,
        changeType: 'positive',
        industryAvg: 53,
        ranking: '前0.5%'
    },
    {
        name: '种草指数',
        value: 98.7,
        change: 10.1,
        changeType: 'positive',
        industryAvg: 54,
        ranking: '-'
    },
    {
        name: '转化指数',
        value: 98.7,
        change: 0.1,
        changeType: 'positive',
        industryAvg: 55,
        ranking: '-'
    },
    {
        name: '性价比指数',
        value: 72.1,
        change: -2.7,
        changeType: 'negative',
        industryAvg: 64,
        ranking: '前0.5%'
    },
    {
        name: '合作指数',
        value: 82.9,
        change: -0.1,
        changeType: 'negative',
        industryAvg: 76,
        ranking: '前0.5%'
    }
]

const handleMore = () => {
    console.log('查看更多')
}

const handleMoreVideos = () => {
    console.log('查看更多视频')
}

const playVideo = (event: MouseEvent, videoSrc: string) => {
    console.log('Play video:', videoSrc)
    // TODO: Implement video playback logic
    // Could open a modal or navigate to video page
}


const handleMouseEnter = (event: MouseEvent) => {
    const videoElement = event.currentTarget as HTMLElement
    const video = videoElement.querySelector('video') as HTMLVideoElement
    const playIcon = videoElement.querySelector('.play-icon') as HTMLElement

    if (video) {
        video.play()
    }
    if (playIcon) {
        playIcon.style.opacity = '0'
    }
}

const handleMouseLeave = (event: MouseEvent) => {
    const videoElement = event.currentTarget as HTMLElement
    const video = videoElement.querySelector('video') as HTMLVideoElement
    const playIcon = videoElement.querySelector('.play-icon') as HTMLElement

    if (video) {
        video.pause()
        video.currentTime = 0
    }
    if (playIcon) {
        playIcon.style.opacity = '1'
    }
}

// Initialize radar chart
const initRadarChart = () => {
    if (!radarChartRef.value) return

    // Clear any existing chart
    echarts.dispose(radarChartRef.value)
    const myChart = echarts.init(radarChartRef.value)

    const option = {
        // Set global color palette to avoid any default green colors
        color: ['#1890ff', '#fe346e'],
        radar: {
            indicator: [
                { name: '传播指数', max: 100 },
                { name: '种草指数', max: 100 },
                { name: '转化指数', max: 100 },
                { name: '性价比指数', max: 100 },
                { name: '合作指数', max: 100 }
            ],
            radius: '70%',
            axisName: {
                color: '#666',
                fontSize: 12
            },
            splitLine: {
                lineStyle: {
                    color: '#e6e6e6'
                }
            },
            splitArea: {
                areaStyle: {
                    color: ['#f5f5f5', '#fff']
                }
            }
        },
        tooltip: {
            trigger: 'item'
        },
        series: [{
            type: 'radar',
            data: [
                {
                    value: [98.3, 98.7, 98.7, 72.1, 82.9],
                    name: '达人指数',
                    areaStyle: {
                        color: 'rgba(24, 144, 255, 0.2)'
                    },
                    lineStyle: {
                        color: '#1890ff',
                        width: 1
                    },
                    symbol: 'circle',
                    symbolSize: 6
                },
                {
                    value: [53, 54, 55, 64, 76],
                    name: '行业均值',
                    areaStyle: {
                        color: 'rgba(254, 54, 112, 0.15)'
                    },
                    lineStyle: {
                        color: '#fe346e',
                        width: 1
                    },
                    symbol: 'circle',
                    symbolSize: 6
                }
            ]
        }],
        // legend: {
        //     data: ['达人指数', '行业均值'],
        //     bottom: 10,
        //     icon: 'circle',
        //     textStyle: {
        //         fontSize: 12
        //     }
        // }
    }

    myChart.setOption(option, true)

    // Make chart responsive
    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

// Initialize funnel chart
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
        ],
        graphic: [
            // 添加虚线
            // {
            //     type: 'line',
            //     z: 100,
            //     left: '29%',
            //     bottom: '15%',
            //     shape: {
            //         x1: 0,
            //         y1: 0,
            //         x2: 0,
            //         y2: 160
            //     },
            //     style: {
            //         stroke: '#666',
            //         lineWidth: 1,
            //         lineDash: [4, 4]
            //     }
            // },
            // {
            //     type: 'line',
            //     z: 100,
            //     left: '49.5%',
            //     bottom: '15%',
            //     shape: {
            //         x1: 0,
            //         y1: 0,
            //         x2: 0,
            //         y2: 160
            //     },
            //     style: {
            //         stroke: '#666',
            //         lineWidth: 1,
            //         lineDash: [4, 4]
            //     }
            // },
            // {
            //     type: 'line',
            //     z: 100,
            //     left: '68%',
            //     bottom: '15%',
            //     shape: {
            //         x1: 0,
            //         y1: 0,
            //         x2: 0,
            //         y2: 160
            //     },
            //     style: {
            //         stroke: '#666',
            //         lineWidth: 1,
            //         lineDash: [4, 4]
            //     }
            // }
            
        ]
    }

    myChart.setOption(option, true)

    // Make chart responsive
    window.addEventListener('resize', () => {
        myChart.resize()
    })
}

onMounted(() => {
    nextTick(() => {
        initRadarChart()
        initFunnelChart()
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

                        &.el-button {
                            padding: 8px 16px;
                            font-weight: 400;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            color: #666666;
                            background: #fff;
                            font-size: 14px;

                            &:hover {
                                color: #409eff;
                                border-color: #c6e2ff;
                                background-color: #ecf5ff;
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
                    }
                }
            }

            .card-panel-body {
                display: flex;
                gap: 24px;
                margin-top: 16px;

                .star-score {
                    flex: 0 0 400px;

                    .score-detail {
                        margin-bottom: 16px;

                        .score-title {
                            font-size: 14px;
                            color: #666;
                            margin-right: 12px;
                        }

                        .value {
                            font-size: 28px;
                            font-weight: 600;
                            color: #333;
                            margin-right: 8px;
                        }

                        .rapid-highlight {
                            display: inline-flex;
                            align-items: center;
                            font-size: 14px;
                            margin-right: 12px;

                            &.increase {
                                color: #f5222d;
                            }

                            &.decrease {
                                color: #52c41a;
                            }

                            .arrow-up {
                                display: inline-block;
                                width: 0;
                                height: 0;
                                border-left: 5px solid transparent;
                                border-right: 5px solid transparent;
                                border-bottom: 8px solid currentColor;
                                margin-right: 4px;
                            }
                        }

                        .rank-text {
                            font-size: 14px;
                            color: #666;

                            .highlight {
                                color: #333;
                                font-weight: 600;
                            }
                        }
                    }

                    .describe {
                        display: flex;
                        gap: 24px;
                        margin-bottom: 16px;
                        font-size: 14px;

                        div {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }

                        .dot {
                            display: inline-block;
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;

                            &.full {
                                background-color: #1890ff;
                            }

                            &.compare {
                                background-color: #fe346e;
                            }
                        }

                        .median {
                            color: #999;
                        }
                    }

                    .radar-chart-container {
                        width: 100%;
                        height: 240px;
                    }
                }

                .star-analysis {
                    flex: 1;

                    :deep(.ant-table) {
                        .ant-table-thead > tr > th {
                            background-color: #fafafa;
                            font-weight: 600;
                            font-size: 14px;
                            padding: 12px 16px;
                        }

                        .ant-table-tbody > tr > td {
                            padding: 12px 16px;
                            font-size: 14px;
                        }

                        .icon-tooltip-label {
                            display: flex;
                            align-items: center;
                            gap: 4px;

                            .anticon {
                                color: #999;
                                cursor: help;

                                &:hover {
                                    color: #1890ff;
                                }
                            }
                        }

                        .positive {
                            color: #f5222d;
                        }

                        .negative {
                            color: #52c41a;
                        }
                    }
                }
            }
        }

        .mudule-two {
            background: #fff;
            padding: 20px;
            border-radius: 8px;

            .card-panel {
                .title-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;

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
                            display: flex;
                            align-items: center;

                            &.switch-container {
                                .exclude-ad-switch {
                                    :deep(.el-switch__label) {
                                        font-size: 14px;
                                        color: #666;

                                        &.is-active {
                                            color: #409eff;
                                        }
                                    }

                                    :deep(.el-switch__core) {
                                        &::after {
                                            background-color: #fff;
                                        }
                                    }

                                    &.is-checked {
                                        :deep(.el-switch__core) {
                                            background-color: #409eff;
                                            border-color: #409eff;
                                        }
                                    }

                                    &.is-disabled {
                                        opacity: 0.6;
                                        cursor: not-allowed;

                                        :deep(.el-switch__core) {
                                            background-color: #dcdfe6 !important;
                                            border-color: #dcdfe6 !important;
                                        }

                                        :deep(.el-switch__label) {
                                            color: #666 !important;

                                            &.is-active {
                                                color: #666 !important;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        .base-input__wrapper {
                            display: flex;
                            align-items: center;
                            background: #f5f7fa;
                            border-radius: 4px;
                            padding: 0 12px;

                            .base-input__prepend {
                                color: #666;
                                font-size: 14px;
                                white-space: nowrap;
                            }

                            .base-input__content {
                                .base-select {
                                    width: 120px;

                                    :deep(.ant-select-selector) {
                                        border: none;
                                        background: transparent;
                                        padding: 0;
                                        color: #333;
                                    }

                                    :deep(.ant-select-arrow) {
                                        color: #666;
                                    }
                                }
                            }
                        }

                        :deep(.el-radio-group) {
                            .el-radio-button__inner {
                                padding: 8px 16px;
                                font-size: 14px;

                                &:hover {
                                    color: #409eff;
                                }
                            }

                            .el-radio-button.is-active {
                                .el-radio-button__inner {
                                    background-color: #409eff;
                                    border-color: #409eff;
                                    color: #fff;
                                }
                            }
                        }
                    }
                }

                .sub-title {
                    margin: 20px 0;
                }

                .card-panel-body {
                    .colum-information-template {
                        .main-data {
                            display: flex;
                            justify-content: space-between;
                            gap: 20px;

                            .data {
                                flex: 1;
                                text-align: center;
                                display: flex;
                                flex-direction: column;
                                align-items: center;

                                .label {
                                    margin-bottom: 8px;

                                    .text {
                                        font-size: 14px;
                                        color: #666;
                                    }
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
            }
        }

        .mudule-three {
            background: #fff;
            padding: 20px;
            border-radius: 8px;

            .card-panel {
                .title-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;

                    .title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #333;

                        .icon-tooltip-label {
                            display: flex;
                            align-items: center;
                            gap: 6px;

                            .text {
                                font-size: 18px;
                                font-weight: 600;
                                color: #333;
                            }

                            .icon {
                                color: #999;
                                cursor: help;

                                &:hover {
                                    color: #1890ff;
                                }
                            }
                        }
                    }

                    .operation {
                        .more-btn {
                            padding: 8px 16px;
                            font-weight: 400;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            color: #666666;
                            background: #fff;
                            font-size: 14px;
                            border: 1px solid #dcdfe6;
                            border-radius: 20px;

                            &:hover {
                                color: #409eff;
                                border-color: #c6e2ff;
                                background-color: #ecf5ff;
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
                    }
                }

                .sub-title {
                    margin: 20px 0;
                }

                .card-panel-body {
                    .author-video-list {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 20px;

                        .list-item {
                            .video-player {
                                position: relative;
                                margin-bottom: 12px;
                                border-radius: 8px;
                                overflow: hidden;

                                .cover-top {
                                    position: absolute;
                                    top: 8px;
                                    left: 8px;
                                    z-index: 2;

                                    .tag {
                                        background: rgba(0, 0, 0, 0.6);
                                        color: #fff;
                                        padding: 4px 8px;
                                        border-radius: 4px;
                                        font-size: 12px;
                                    }
                                }

                                .video-player-cover {
                                    position: relative;
                                    width: 100%;
                                    aspect-ratio: 16/9;
                                    background: #f5f5f5;
                                    border-radius: 8px;
                                    overflow: hidden;

                                    .play-icon {
                                        position: absolute;
                                        top: 50%;
                                        left: 50%;
                                        transform: translate(-50%, -50%);
                                        width: 48px;
                                        height: 48px;
                                        background: rgba(0, 0, 0, 0.6);
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        cursor: pointer;
                                        z-index: 3;
                                        transition: opacity 0.3s ease;

                                        svg {
                                            width: 24px;
                                            height: 24px;
                                            color: #fff;
                                            margin-left: 2px;
                                        }
                                    }

                                
                                    .cover-image {
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                    }

                                    video.cover-image {
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                        background: #000;
                                    }
                                }
                            }

                            .video-info {
                                display: flex;
                                flex-direction: column;
                                gap: 8px;

                                .text-ellipsis {
                                    font-size: 14px;
                                    font-weight: 600;
                                    color: #333;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                    display: block;
                                }

                                .info-row {
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;

                                    span:first-child {
                                        font-size: 13px;
                                        color: #999;
                                    }

                                    .value {
                                        font-size: 13px;
                                        font-weight: 600;
                                        color: #333;
                                    }
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

            .card-panel {
                .title-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;

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

                            .divider-vertical {
                                height: 20px;
                                width: 1px;
                                background-color: #e8e8e8;
                                margin: 0 8px;
                            }

                            .sub-title-text {
                                color: #999;
                                font-size: 14px;
                            }
                        }
                    }

                    .operation {
                        display: flex;
                        align-items: center;
                        gap: 16px;

                        .operation-item {
                            display: flex;
                            align-items: center;

                            .industry-select {
                                width: 120px;

                                :deep(.el-input__wrapper) {
                                    border: none;
                                    background: #f5f7fa;
                                    border-radius: 4px;
                                    padding: 0 12px;
                                }

                                :deep(.el-input__inner) {
                                    color: #333;
                                    font-size: 14px;
                                }
                            }
                        }

                        .more-btn {
                            padding: 8px 16px;
                            font-weight: 400;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            color: #666666;
                            background: #fff;
                            font-size: 14px;

                            &:hover {
                                color: #409eff;
                                border-color: #c6e2ff;
                                background-color: #ecf5ff;
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

                                    strong {
                                        color: #333;
                                        font-weight: 600;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

</style>