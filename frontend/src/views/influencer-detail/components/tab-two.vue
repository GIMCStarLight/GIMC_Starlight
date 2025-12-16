<template>
    <div class="space-content">
        <div class="mudule-one">
            <!-- 标题栏 -->
            <div class="video-trend-panel--header">
                <h3 class="panel-title">最新15个视频表现柱状图</h3>
                <div class="data-filter">
                    <a-radio-group v-model:value="activeFilter" class="radio-button-group" button-style="solid">
                        <a-radio-button value="-1">全部</a-radio-button>
                        <a-radio-button value="0">个人视频</a-radio-button>
                        <a-radio-button value="1">星图视频</a-radio-button>
                    </a-radio-group>
                </div>
            </div>

            <!-- 数据选项卡 -->
            <div class="data-tabs">
                <el-check-tag :checked="activeDataItem === 'play'" @change="activeDataItem = 'play'">播放量</el-check-tag>
                <el-check-tag :checked="activeDataItem === 'like'" @change="activeDataItem = 'like'">点赞量</el-check-tag>
                <el-check-tag :checked="activeDataItem === 'comment'" @change="activeDataItem = 'comment'">评论量</el-check-tag>
                <el-check-tag :checked="activeDataItem === 'share'" @change="activeDataItem = 'share'">转发量</el-check-tag>
            </div>

            <!-- 结果概览 -->
            <div class="video-trend-panel--result">
                <span class="result-title">结果概览</span>
                <div class="divider"></div>
                <div class="result-item">
                    <span class="label">最新15个视频中最低播放量</span>
                    <span class="value">670.8w</span>
                    <div class="divider"></div>
                </div>
                <div class="result-item">
                    <span class="label">最高播放量</span>
                    <span class="value">7643.9w</span>
                    <div class="divider"></div>
                </div>
                <div class="result-item">
                    <span class="label">播放量均值为</span>
                    <span class="value">2342.5w</span>
                </div>
            </div>

            <!-- 柱状图 -->
            <div class="chart-container">
                <div ref="chartRef" class="chart"></div>
            </div>
        </div>
        <div class="mudule-two">
            <!-- 标题栏 -->
            <div class="video-trend-panel--header">
                <h3 class="panel-title">全部视频</h3>
                <div class="data-filter">
                    <a-radio-group v-model:value="activeFilter" class="radio-button-group" button-style="solid">
                        <a-radio-button value="-1">全部</a-radio-button>
                        <a-radio-button value="0">个人视频</a-radio-button>
                        <a-radio-button value="1">星图视频</a-radio-button>
                    </a-radio-group>
                </div>
            </div>

            <!-- 搜索和日期筛选 -->
            <div class="filter-controls">
                <a-input
                    v-model:value="searchKeyword"
                    placeholder="请输入关键词搜索"
                    class="search-input"
                    allow-clear
                >
                    <template #prefix>
                        <SearchOutlined />
                    </template>
                </a-input>

                <a-range-picker
                    v-model:value="dateRange"
                    class="date-range-picker"
                    format="YYYY/MM/DD"
                    value-format="YYYY-MM-DD"
                    :placeholder="['开始日期', '结束日期']"
                />
            </div>

            <!-- 数据标签 -->
            <div class="data-tag-section">
                <div class="data-tag-wrapper">
                    <div class="data-tag-list" :class="{ 'is-expanded': isExpanded }">
                        <el-check-tag :checked="activeTag === '全部'" @change="activeTag = '全部'">全部 (143)</el-check-tag>
                        <el-check-tag :checked="activeTag === '搞笑剧情'" @change="activeTag = '搞笑剧情'">搞笑剧情 (71)</el-check-tag>
                        <el-check-tag :checked="activeTag === '陈翔短剧'" @change="activeTag = '陈翔短剧'">陈翔短剧 (54)</el-check-tag>
                        <el-check-tag :checked="activeTag === '有趣剧情创作'" @change="activeTag = '有趣剧情创作'">有趣剧情创作 (40)</el-check-tag>
                        <el-check-tag :checked="activeTag === '剧情反转'" @change="activeTag = '剧情反转'">剧情反转 (19)</el-check-tag>
                        <el-check-tag :checked="activeTag === '职场趣闻'" @change="activeTag = '职场趣闻'">职场趣闻 (14)</el-check-tag>
                        <el-check-tag :checked="activeTag === '生活喜剧情节'" @change="activeTag = '生活喜剧情节'">生活喜剧情节 (12)</el-check-tag>
                        <el-check-tag :checked="activeTag === '亲情剧集'" @change="activeTag = '亲情剧集'">亲情剧集 (10)</el-check-tag>
                        <el-check-tag :checked="activeTag === '友情故事'" @change="activeTag = '友情故事'">友情故事 (9)</el-check-tag>
                        <el-check-tag :checked="activeTag === '家庭幽默演绎'" @change="activeTag = '家庭幽默演绎'">家庭幽默演绎 (9)</el-check-tag>
                        <el-check-tag :checked="activeTag === '意外结局'" @change="activeTag = '意外结局'">意外结局 (7)</el-check-tag>
                        <el-check-tag :checked="activeTag === '其他'" @change="activeTag = '其他'">其他 (47)</el-check-tag>
                    </div>
                </div>
                <button type="button" class="expand-button" @click="isExpanded = !isExpanded">
                    {{ isExpanded ? '收起' : '展开' }}
                    <span class="down-icon" :class="{ 'is-rotated': isExpanded }">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 48 48" fill="none">
                            <g>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="m24 29.172 13.586-13.586 2.828 2.828-15 15a2 2 0 0 1-2.828 0l-15-15 2.828-2.828L24 29.172Z" fill="currentColor"></path>
                            </g>
                        </svg>
                    </span>
                </button>
            </div>

            <!-- 视频列表 -->
            <div class="video-list-section">
                <div class="video-grid">
                    <div class="video-item" v-for="(video, index) in 6" :key="index">
                        <div class="video-player">
                            <div class="cover-top">
                                <span class="tag">视频 {{ index + 1 }}</span>
                            </div>
                            <div
                                class="video-cover"
                                @mouseenter="handleMouseEnter"
                                @mouseleave="handleMouseLeave"
                            >
                                <span class="play-icon">
                                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                        <path d="M6 4v16l14-8L6 4Z" fill="currentColor" stroke="none"/>
                                    </svg>
                                </span>
                                <video
                                    src="/test.mp4"
                                    class="cover-image"
                                    muted
                                    loop
                                    :ref="el => { if (el) videoRefs[index] = el as HTMLVideoElement }"
                                ></video>
                            </div>
                        </div>
                        <div class="video-info">
                            <span class="video-title">硬的怕横的，横的怕疯的 #陈翔六点半</span>
                            <div class="info-row">
                                <span>播放量</span>
                                <span class="value">{{ Math.floor(Math.random() * 10000) }}w</span>
                            </div>
                            <div class="info-row">
                                <span>点赞量</span>
                                <span class="value">{{ Math.floor(Math.random() * 1000) }}w</span>
                            </div>
                            <div class="info-row">
                                <span>评论量</span>
                                <span class="value">{{ Math.floor(Math.random() * 100) }}w</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 分页 show-quick-jumper -->
            <div class="pagination-wrapper">
                <a-pagination
                    v-model:current="currentPage"
                    :total="150"
                    :page-size="6"
                    :show-size-changer="false"
                />
            </div>
        </div>
         <div class="mudule-three">
            <div class="card-panel module-card author-content-distribution">
                <div class="title-wrapper">
                    <div class="title">
                        <span class="icon-tooltip-label">
                            <span class="text">内容类型分析</span>
                            <a-tooltip title="内容类型分析说明" class="icon right">
                                <QuestionCircleOutlined />
                            </a-tooltip>
                        </span>
                    </div>
                    <div class="operation">
                        <!-- 操作按钮区域 -->
                    </div>
                </div>
                <div class="card-panel-body">
                    <div class="treemap-chart distribution-map">
                        <div class="base-chart" ref="treemapChartRef"></div>
                    </div>
                </div>
            </div>
        </div>
          <div class="mudule-four">
            <!-- 标题栏 -->
            <div class="video-trend-panel--header">
                <h3 class="panel-title">热词分析</h3>
                <div class="data-filter">
                    <a-radio-group v-model:value="hotActiveFilter" class="radio-button-group" button-style="solid">
                        <a-radio-button value="0">评论热词</a-radio-button>
                        <a-radio-button value="1">内容热词</a-radio-button>
                    </a-radio-group>
                </div>
            </div>

            <!-- 热词分析内容 -->
            <div class="chart-container">
                <!-- 左侧热词列表 -->
                <div class="word-cloud-container">
                    <div class="hot-words-list">
                        <div v-for="(word, index) in hotWords" :key="index" class="hot-word-item">
                            <span class="dot" :style="{ backgroundColor: word.color }"></span>
                            <span class="name">{{ word.name }}</span>
                            <span class="count">{{ word.value }}</span>
                        </div>
                    </div>
                </div>
                <!-- 右侧柱状图 -->
                <div class="bar-container">
                    <div ref="barChartRef" class="base-chart bar-chart"></div>
                </div>
            </div>
          </div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import * as echarts from 'echarts';
import { SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue';
const hotActiveFilter = ref('0');
const activeFilter = ref('-1');
const activeDataItem = ref('play');
const chartRef = ref<HTMLDivElement>();
const searchKeyword = ref('');
const dateRange = ref<[string, string] | null>(null);
const isExpanded = ref(false);
const currentPage = ref(1);
const videoRefs = ref<HTMLVideoElement[]>([]);
const activeTag = ref('全部');
const treemapChartRef = ref<HTMLDivElement>();
const barChartRef = ref<HTMLDivElement>();

// 热词数据
const hotWords = [
    { name: '陈翔六点半', value: 283, color: '#FE346E' },
    { name: '哈哈哈', value: 245, color: '#38A1FF' },
    { name: '搞笑', value: 198, color: '#FF6B6B' },
    { name: '好看', value: 156, color: '#4ECDC4' },
    { name: '太搞笑了', value: 134, color: '#45B7D1' },
    { name: '支持', value: 98, color: '#96CEB4' },
    { name: '精彩', value: 87, color: '#DDA0DD' },
    { name: '期待', value: 76, color: '#FFB347' }
];

// 生成最近15天的日期
const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 14; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(`${date.getMonth() + 1}/${date.getDate()}`);
    }
    return dates;
};

// 初始化图表
const initChart = () => {
    if (!chartRef.value) return;

    const chart = echarts.init(chartRef.value);

    // 模拟数据 - 包含日期、播放量、视频类型
    const videoData = [
        { date: '12/2', value: 1200, type: 0 },  // 个人视频
        { date: '12/3', value: 850, type: 1 },   // 星图视频
        { date: '12/4', value: 1400, type: 0 },  // 个人视频
        { date: '12/5', value: 920, type: 1 },   // 星图视频
        { date: '12/6', value: 1000, type: 0 },  // 个人视频
        { date: '12/7', value: 1100, type: 1 },  // 星图视频
        { date: '12/8', value: 1600, type: 0 },  // 个人视频
        { date: '12/9', value: 780, type: 1 },   // 星图视频
        { date: '12/10', value: 1300, type: 0 }, // 个人视频
        { date: '12/11', value: 1250, type: 1 }, // 星图视频
        { date: '12/12', value: 1100, type: 0 }, // 个人视频
        { date: '12/13', value: 980, type: 1 },  // 星图视频
        { date: '12/14', value: 1800, type: 0 }, // 个人视频
        { date: '12/15', value: 1350, type: 1 }, // 星图视频
        { date: '12/16', value: 1500, type: 0 }, // 个人视频
    ];

    const dates = videoData.map(item => item.date);
    const values = videoData.map(item => item.value);

    // 渐变色配置
    const blueGradient = {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [{
            offset: 0,
            color: '#0050b3' // 深蓝色
        }, {
            offset: 1,
            color: '#69c0ff' // 浅蓝色
        }]
    };

    const pinkGradient = {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [{
            offset: 0,
            color: '#eb2f96' // 深粉色
        }, {
            offset: 1,
            color: '#ffadd2' // 浅粉色
        }]
    };

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params: any) {
                const data = params[0];
                const videoType = videoData[data.dataIndex].type === 0 ? '个人视频' : '星图视频';
                return `${data.name}<br/>${videoType}: ${data.value}万`;
            }
        },
        legend: {
            data: ['个人视频', '星图视频'],
            top: 10,
            right: 20
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: dates,
            axisLabel: {
                fontSize: 12,
                color: '#666'
            },
            axisLine: {
                lineStyle: {
                    color: '#e8e8e8'
                }
            }
        },
        yAxis: {
            type: 'value',
            name: '播放量(万)',
            nameTextStyle: {
                fontSize: 12,
                color: '#666'
            },
            axisLabel: {
                fontSize: 12,
                color: '#666'
            },
            splitLine: {
                lineStyle: {
                    color: '#f0f0f0'
                }
            }
        },
        series: [
            {
                name: '视频播放量',
                type: 'bar',
                data: values.map((value, index) => ({
                    value: value,
                    itemStyle: {
                        color: videoData[index].type === 0 ? blueGradient : pinkGradient
                    }
                })),
                barWidth: '30%',
                showBackground: true,
                backgroundStyle: {
                    color: 'rgba(180, 180, 180, 0.1)'
                }
            }
        ],
        // 添加均值线
        markLine: {
            silent: true,
            data: [
                {
                    yAxis: 2342.5,
                    label: {
                        position: 'end',
                        formatter: '均值: 2342.5w',
                        color: '#ff9800',
                        fontSize: 12
                    }
                }
            ],
            lineStyle: {
                color: '#ff9800',
                type: 'dashed',
                width: 2
            }
        }
    };

    chart.setOption(option);

    // 响应式
    window.addEventListener('resize', () => {
        chart.resize();
    });
};

const handleMouseEnter = (event: MouseEvent) => {
    const videoElement = event.currentTarget as HTMLElement;
    const video = videoElement.querySelector('video') as HTMLVideoElement;
    const playIcon = videoElement.querySelector('.play-icon') as HTMLElement;

    if (video) {
        video.play();
    }
    if (playIcon) {
        playIcon.style.opacity = '0';
    }
};

const handleMouseLeave = (event: MouseEvent) => {
    const videoElement = event.currentTarget as HTMLElement;
    const video = videoElement.querySelector('video') as HTMLVideoElement;
    const playIcon = videoElement.querySelector('.play-icon') as HTMLElement;

    if (video) {
        video.pause();
        video.currentTime = 0;
    }
    if (playIcon) {
        playIcon.style.opacity = '1';
    }
};

// 初始化treemap图表
const initTreemapChart = () => {
    if (!treemapChartRef.value) return;

    const chart = echarts.init(treemapChartRef.value);

    // 模拟数据 - 内容类型分布
    const data = [
        {
            name: '剧情',
            value: 94.7,
            videoCount: 18,
            children: [
                { name: '搞笑剧情', value: 45.2, videoCount: 8 },
                { name: '陈翔短剧', value: 30.1, videoCount: 5 },
                { name: '有趣剧情', value: 19.4, videoCount: 5 }
            ]
        },
        {
            name: '汽车',
            value: 5.3,
            videoCount: 1,
            children: [
                { name: '汽车广告', value: 5.3, videoCount: 1 }
            ]
        }
    ];

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params: any) {
                return `<div style="padding: 8px;">
                    <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
                    <div>视频数: ${params.data?.videoCount || 0}</div>
                    <div>占比: ${params.value}%</div>
                </div>`;
            }
        },
        series: [{
            name: '内容类型',
            type: 'treemap',
            data: data,
            roam: false,
            nodeClick: (params: any) => {
                console.log('Clicked:', params);
            },
            breadcrumb: { show: false },
            label: {
                show: true,
                formatter: '{b}\n{d}%'
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2
            },
            levels: [
                {
                    itemStyle: {
                        borderWidth: 3,
                        gapWidth: 3,
                        borderColor: '#ccc'
                    }
                }
            ],
            color: [
                '#69c0ff', '#eb2f96', '#ffadd2', '#91d5ff', '#69c0ff',
                '#fff0f6', '#ffe0ed', '#ffccc7', '#ffa39e', '#ff7875'
            ]
        }]
    };

    chart.setOption(option);

    // 响应式
    window.addEventListener('resize', () => {
        chart.resize();
    });
};


// 初始化柱状图（右侧）
const initBarChart = () => {
    if (!barChartRef.value) return;

    const chart = echarts.init(barChartRef.value);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params: any) {
                const data = params[0];
                return `${data.name}<br/>次数: ${data.value}`;
            }
        },
        grid: {
            left: '10%',
            right: '10%',
            bottom: '0%',
            top: '5%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: hotWords.map((item: any) => item.name),
            axisLabel: {
                fontSize: 12,
                color: '#666',
                rotate: 45,
                interval: 0
            },
            axisLine: {
                lineStyle: {
                    color: '#e8e8e8'
                }
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                fontSize: 12,
                color: '#666'
            },
            splitLine: {
                lineStyle: {
                    color: '#f0f0f0'
                }
            }
        },
        series: [{
            name: '次数',
            type: 'bar',
            data: hotWords.map((item: any) => item.value),
            itemStyle: {
                color: '#38A1FF'
            },
            barWidth: '40%'
        }]
    };

    chart.setOption(option);

    // 响应式
    window.addEventListener('resize', () => {
        chart.resize();
    });
};

// 监听热词数据变化，更新图表
watch(hotActiveFilter, () => {
    if (barChartRef.value) {
        const chart = echarts.getInstanceByDom(barChartRef.value);
        if (chart) {
            const option = {
                xAxis: {
                    data: hotWords.map((item: any) => item.name)
                },
                series: [{
                    data: hotWords.map((item: any) => item.value)
                }]
            };
            chart.setOption(option);
        }
    }
}, { deep: true });

onMounted(() => {
    nextTick(() => {
        initChart();
        initTreemapChart();
        initBarChart();
    });
});
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
        
        // 数据选项卡
        .data-tabs {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 16px;
            :deep(.el-check-tag) {
                font-size: 14px;
                font-weight: 400;
                color: #666;
                &.is-checked {
                    color: #1890ff;
                }
            }
        }

        // 结果概览
        .video-trend-panel--result {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;

            .result-title {
                font-size: 14px;
                font-weight: 500;
                color: #333;
            }

            .divider {
                width: 1px;
                height: 16px;
                background-color: #e8e8e8;
            }

            .result-item {
                display: flex;
                align-items: center;
                gap: 8px;

                .label {
                    font-size: 14px;
                    color: #999;
                }

                .value {
                    font-size: 14px;
                    font-weight: 500;
                    color: #333;
                }

                .divider {
                    width: 1px;
                    height: 16px;
                    background-color: #e8e8e8;
                    margin-left: 8px;
                }
            }
        }

        // 图表容器
        .chart-container {
            margin-top: 20px;
            width: 100%;
            height: 400px;

            .chart {
                width: 100%;
                height: 100%;
            }
        }
    }
    .mudule-two {
        background: #fff;
        padding: 20px;
        border-radius: 8px;

        // 搜索和日期筛选
        .filter-controls {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;

            .search-input {
                width: 240px;
                height: 32px;

                // :deep(.ant-input) {
                //     border-radius: 4px;
                //     border: 1px solid #d9d9d9;
                //     font-size: 14px;

                //     &:hover {
                //         border-color: #40a9ff;
                //     }

                //     &:focus {
                //         border-color: #1890ff;
                //         box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
                //     }
                // }

                // :deep(.ant-input-prefix) {
                //     color: #bfbfbf;
                // }
            }

            .date-range-picker {
                width: 240px;
                height: 32px;

                :deep(.ant-picker) {
                    border-radius: 4px;
                    border: 1px solid #d9d9d9;
                    font-size: 14px;

                    &:hover {
                        border-color: #40a9ff;
                    }

                    &.ant-picker-focused {
                        border-color: #1890ff;
                        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
                    }
                }

                :deep(.ant-picker-input) {
                    input {
                        font-size: 14px;
                        &::placeholder {
                            color: #bfbfbf;
                        }
                    }
                }
            }
        }

        // 数据标签
        .data-tag-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;

            .data-tag-wrapper {
                flex: 1;

                .data-tag-list {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 6px;
                    max-height: 40px;
                    overflow: hidden;
                    transition: max-height 0.3s ease;

                    &.is-expanded {
                        max-height: none;
                    }

                    :deep(.el-check-tag) {
                        font-size: 14px;
                        font-weight: 400;
                        color: #666;
                        &.is-checked {
                            color: #1890ff;
                        }
                    }
                }
            }

            .expand-button {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                background: none;
                border: none;
                color: #1890ff;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s;

                &:hover {
                    color: #40a9ff;
                }

                .down-icon {
                    display: inline-flex;
                    align-items: center;

                    svg {
                        width: 16px;
                        height: 16px;
                        transition: transform 0.3s;
                    }

                    &.is-rotated svg {
                        transform: rotate(180deg);
                    }
                }

                &:hover:not(:active) .down-icon:not(.is-rotated) svg {
                    transform: translateY(2px);
                }
            }
        }

        // 视频列表
        .video-list-section {
            margin-bottom: 20px;

            .video-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;

                .video-item {
                    background: #fff;
                    border-radius: 8px;
                    overflow: hidden;

                    .video-player {
                        position: relative;
                        margin-bottom: 12px;

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

                        .video-cover {
                            position: relative;
                            width: 100%;
                            aspect-ratio: 16/9;
                            background: #f5f5f5;
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
                        }
                    }

                    .video-info {
                        padding: 0 12px 12px;

                        .video-title {
                            font-size: 14px;
                            font-weight: 600;
                            color: #333;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                            display: block;
                            margin-bottom: 8px;
                        }

                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 4px;

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

        // 分页
        .pagination-wrapper {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 16px 0;

            :deep(.ant-pagination) {
                .ant-pagination-item {
                    a {
                        font-size: 14px;
                    }

                    &.ant-pagination-item-active {
                        a {
                            color: #1890ff;
                        }
                    }
                }

                .ant-pagination-prev,
                .ant-pagination-next {
                    .ant-pagination-item-link {
                        font-size: 14px;
                    }
                }

                .ant-pagination-options {
                    .ant-pagination-options-quick-jumper {
                        input {
                            font-size: 14px;
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
            }

            .card-panel-body {
                .treemap-chart {
                    width: 100%;
                    height: 300px;
                    position: relative;

                    .base-chart {
                        width: 100%;
                        height: 100%;
                        position: relative;
                    }
                }
            }
        }
    }
    .mudule-four  {
        background: #fff;
        padding: 20px;
        border-radius: 8px;

        .chart-container {
            display: flex;
            gap: 20px;
            height: 248px;

            .word-cloud-container {
                flex: 0 0 233px;
                height: 100%;

                .hot-words-list {
                    padding: 20px 0;

                    .hot-word-item {
                        display: flex;
                        align-items: center;
                        margin-bottom: 16px;
                        font-size: 12px;

                        .dot {
                            display: inline-block;
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            margin-right: 8px;
                            flex-shrink: 0;
                        }

                        .name {
                            flex: 1;
                            color: #333;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }

                        .count {
                            color: #666;
                            margin-left: 10px;
                            text-align: right;
                            min-width: 30px;
                        }
                    }
                }
            }

            .bar-container {
                flex: 1;
                height: 100%;

                .base-chart {
                    width: 100%;
                    height: 100%;
                }
            }
        }
    }
}
// 标题栏
.video-trend-panel--header {
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
</style>