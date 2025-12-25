<template>
    <div class="page-wrapper">
        <div class="space-medium">
            <div class="page-left">
                <a-card :bordered="false" class="influencer-card">
                    <!-- 顶部用户信息 -->
                    <div class="author-info-section">
                        <a-avatar :size="48" :src="authorData.avatar_uri" />
                        <div class="author-info-content">
                            <div class="author-name">{{ authorData.nick_name || '暂无昵称' }}</div>
                            <div class="author-id">
                                <span class="id-label">星图ID：{{ authorData.id
 || '-' }}</span>
                                <a-typography-text copyable />
                            </div>
                        </div>
                    </div>

                    <!-- 数据指标 -->
                    <div class="data-metrics">
                        
                        <div class="metric-item">
                            <div class="metric-label">月涨粉数</div>
                            <div class="metric-value">{{ formatNumber(authorData.fans_increment_within_30d) }}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">月平均互动数</div>
                            <div class="metric-value">{{ formatNumber(authorData.interaction_median_30d) }}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">粉丝数</div>
                            <div class="metric-value">{{ formatNumber(authorData.follower) }}</div>
                        </div>
                         <div class="metric-item">
                            <div class="metric-label">月涨粉率</div>
                            <div class="metric-value">{{ formatPercent(authorData.fans_increment_rate_within_30d) }}</div>
                        </div>
                       
                    </div>

                    <!-- 达人推荐 -->
                    <div class="info-section">
                        <div class="section-label">达人推荐</div>
                        <div class="section-content">
                            <a-tag color="blue">
                                抖音精选
                            </a-tag>
                        </div>
                    </div>

                    <!-- 达人类型 -->
                    <div class="info-section">
                        <div class="section-label">达人类型</div>
                        <div class="section-content">
                            <a-space :size="8" wrap>
                                <a-tag v-for="(key, index) in tagsRelationKeys" :key="index">{{ key }}</a-tag>
                                <a-tag v-if="!tagsRelationKeys || tagsRelationKeys.length === 0">暂无标签</a-tag>
                            </a-space>
                        </div>
                    </div>

                    <!-- 内容主题 -->
                    <div class="info-section">
                        <div class="section-label">内容主题</div>
                        <div class="section-content">
                            <a-space :size="8" wrap>
                                <template v-if="authorData.content_theme_labels_180d && authorData.content_theme_labels_180d.length > 0">
                                    <a-tag v-if="authorData.content_theme_labels_180d[0]">{{ authorData.content_theme_labels_180d[0] }}</a-tag>
                                    <a-tag v-if="authorData.content_theme_labels_180d[1]">{{ authorData.content_theme_labels_180d[1] }}</a-tag>
                                    <ToolTipPicker v-if="authorData.content_theme_labels_180d.length > 2">
                                        <template #content>
                                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; max-width: 400px;">
                                                <a-tag v-for="(tag, index) in authorData.content_theme_labels_180d.slice(2)" :key="index">{{ tag }}</a-tag>
                                            </div>
                                        </template>
                                        <template #trigger>
                                            <a-tag>+{{ authorData.content_theme_labels_180d.length - 2 }}</a-tag>
                                        </template>
                                    </ToolTipPicker>
                                </template>
                                <a-tag v-else>暂无标签</a-tag>
                            </a-space>
                        </div>
                    </div>

                    <!-- 基本信息 -->
                    <div class="basic-info">
                        <div class="info-item">
                            <span class="info-label">性别</span>
                            <span class="info-value">{{ formatGender(authorData.gender) }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">地区</span>
                            <span class="info-value">{{ authorData.province && authorData.city ? `${authorData.province} ${authorData.city}` : '--' }}</span>
                        </div>
                    </div>
                </a-card>

                <!-- 价格信息卡片 -->
                <div class="price-info">
                    <div class="price-title-wrapper">
                        <div class="price-title">达人服务报价</div>
                    </div>
                    <div class="price-card-list">
                        <div class="author-price-card">
                            <div class="add-to-cart add-to-cart-v2">
                                <div data-btm="add">
                                    <div class="price-card lined">
                                        <div class="content">
                                            <div class="price">
                                                <div class="price-value">
                                                    <div class="star-price">
                                                        <span class="unit">￥</span>
                                                        <span class="price-number">{{ authorData.price_1_20?.toLocaleString() || '0' }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="desc">1-20s视频</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="author-price-card">
                            <div class="add-to-cart add-to-cart-v2">
                                <div data-btm="add">
                                    <div class="price-card lined">
                                        <div class="content">
                                            <div class="price">
                                                <div class="price-value">
                                                    <div class="star-price">
                                                        <span class="unit">￥</span>
                                                        <span class="price-number">{{ authorData.price_20_60?.toLocaleString() || '0' }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="desc">21-60s视频</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="author-price-card">
                            <div class="add-to-cart add-to-cart-v2">
                                <div data-btm="add">
                                    <div class="price-card lined">
                                        <div class="content">
                                            <div class="price">
                                                <div class="price-value">
                                                    <div class="star-price">
                                                        <span class="unit">￥</span>
                                                        <span class="price-number">{{ authorData.price_60?.toLocaleString() || '0' }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="desc">60s以上视频</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="author-price-card">
                            <div class="add-to-cart add-to-cart-v2">
                                <div data-btm="add">
                                    <div class="price-card lined">
                                        <div class="content">
                                            <div class="price">
                                                <div class="price-value">
                                                    <div class="star-price">
                                                        <span class="unit">￥</span>
                                                        <span class="price-number">-</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="desc">短直种草</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="author-price-card">
                            <div class="add-to-cart add-to-cart-v2">
                                <div data-btm="add">
                                    <div class="price-card lined">
                                        <div class="content">
                                            <div class="price">
                                                <div class="price-value">
                                                    <div class="star-price">
                                                        <span class="unit">￥</span>
                                                        <span class="price-number">-</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="desc">定制短剧单集</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="desc">想要获取更好的营销效果？尝试让达人同步进行直播</div>
                        <button type="button" class="action el-button el-button--primary is-round">
                            前往查看达人直播主页
                        </button>
                    </div>
                </div>
            </div>
            <div class="page-right">
                <!-- Tab 标签在卡片内 -->
                <a-card :bordered="false" class="card-panel tabs">
                    <a-tabs
                        v-model:activeKey="activeTab"
                        class="star-tabs"
                    >
                        <a-tab-pane key="overview" tab="达人概览"></a-tab-pane>
                        <a-tab-pane key="content_performance" tab="内容表现"></a-tab-pane>
                        <a-tab-pane key="connected_users" tab="连接用户"></a-tab-pane>
                        <a-tab-pane key="business_capabilities" tab="商业能力"></a-tab-pane>
                    </a-tabs>
                </a-card>

                <!-- Tab 内容在卡片外 -->
                <div class="tab-content-container">
                    <TabOne v-if="activeTab === 'overview'" @switch-tab="activeTab = $event" />
                    <TabTwo v-if="activeTab === 'content_performance'" />
                    <TabThree v-if="activeTab === 'connected_users'" />
                    <TabFour v-if="activeTab === 'business_capabilities'" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { DatabaseOutlined, MessageOutlined } from '@ant-design/icons-vue';
import { getInfluencerFullData } from '#/api/influencer-v2';
import TabOne from './components/tab-one.vue';
import TabTwo from './components/tab-two.vue';
import TabThree from './components/tab-three.vue';
import TabFour from './components/tab-four.vue';
import ToolTipPicker from '../influencer-authors/components/ToolTipPicker.vue';

const activeTab = ref('overview');
const route = useRoute();

// 格式化数字显示
const formatNumber = (num: number | string): string => {
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number) || number === 0) return '-';

    if (number >= 10000) {
        return (number / 10000).toFixed(1) + 'w';
    }
    return Math.floor(number).toString();
};

// 格式化性别
const formatGender = (gender: any) => {
    if (gender === '1' || gender === 1) return '男';
    if (gender === '2' || gender === 2) return '女';
    return '未知';
};

// 格式化百分比
const formatPercent = (val: any) => {
    const n = Number(val);
    if (!n || isNaN(n)) return '-';
    // 如果是小数形式，转换为百分比
    if (n < 1) {
        return (n * 100).toFixed(2) + '%';
    }
    // 如果已经是百分比形式，直接返回
    return n + '%';
};

// 解析 tags_relation，获取键名
const tagsRelationKeys = computed(() => {
    const tagsRelation = authorData.value.tags_relation;
    if (!tagsRelation || typeof tagsRelation !== 'string') return [];
    try {
        const parsed = JSON.parse(tagsRelation);
        return Object.keys(parsed);
    } catch {
        return [];
    }
});

// 作者详细信息数据
const authorData = ref({
    // 基本信息
    id: '',
    avatar_uri: '',
    nick_name: '',
    core_user_id: '',
    star_id: '',

    // 数据指标
    fans_increment_within_30d: 0,
    interaction_median_30d: 0,
    follower: 0,
    fans_increment_rate_within_30d: '0%',

    // 标签信息
    star_excellent_author: '' as string | number | boolean,
    is_black_horse_author: '' as string | number | boolean,
    star_qianchuan_high_potential: '' as string | number,
    category: '',
    tags_relation: '' as string,
    content_theme_labels_180d: [] as string[],

    // 个人信息
    gender: '',
    province: '',
    city: '',

    // 价格信息
    price_1_20: 0,
    price_20_60: 0,
    price_60: 0,
    assign_task_price_list: [] as number[],

    // 机构信息
    org_name: '',
    cooperation_degree: '',
    annual_contract_org: '',
});

// 获取作者详情数据
const fetchAuthorData = async () => {
    const authorId = route.params.id;
    try {
        // 使用现有的API函数
        const data = await getInfluencerFullData(authorId as string);
        console.log('API返回结果:', data);
        console.log('content_theme_labels_180d:', data.content_theme_labels_180d);
        console.log('content_theme_labels_180d type:', typeof data.content_theme_labels_180d);

        // 直接映射API字段，减少数据转化
        authorData.value = {
            ...data,
            // 确保必要的默认值
            id: data.id || authorId,
            nick_name: data.nick_name || '暂无昵称',
            avatar_uri: data.avatar_uri || '',
            star_id: data.star_id || '--',
            // 确保数组类型的字段安全
            content_theme_labels_180d: Array.isArray(data.content_theme_labels_180d)
                ? data.content_theme_labels_180d
                : (typeof data.content_theme_labels_180d === 'string' ? JSON.parse(data.content_theme_labels_180d) : []),
            assign_task_price_list: Array.isArray(data.assign_task_price_list) ? data.assign_task_price_list : []
        };
    } catch (error) {
        console.error('获取作者数据失败:', error);
    }
};

// 页面加载时获取数据
onMounted(() => {
    fetchAuthorData();
});
</script>

<style scoped lang="scss">
.page-wrapper{
    padding: 24px;
    background-color: #f5f5f5;
    .space-medium{
        display: flex;
        justify-content: flex-start;
        align-items: flex-start;
        flex-direction: row;
        gap: 16px;
        
        .page-left{
            width: 320px;
            
            .influencer-card {

                // 顶部用户信息
                .author-info-section {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                    
                    .author-info-content {
                        flex: 1;
                        
                        .author-name {
                            font-size: 16px;
                            line-height: 22px;
                            margin-bottom: 4px;
                        }
                        
                        .author-id {
                            font-size: 13px;
                            color: #666;
                            display: flex;
                            align-items: center;
                            gap: 4px;

                            .id-label {
                                margin-right: 0px;
                            }

                            // 修复ant-design typography组件的对齐问题
                            :deep(.ant-typography) {
                                display: inline;
                                margin-bottom: 0;
                                line-height: 1.5;
                            }

                            :deep(.ant-typography-copy) {
                                vertical-align: middle;
                                position: relative;
                                top: -4px;
                                color: #999;
                            }
                        }
                    }
                }

                // 数据指标
                .data-metrics {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px 16px;
                    margin-bottom: 16px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #f0f0f0;
                    
                    .metric-item {
                        .metric-label {
                            font-size: 14px;
                            color: #999;
                        }
                        
                        .metric-value {
                            font-size: 18px;
                            font-weight: 500;
                            color: #111;
                        }
                    }
                }

                // 信息区块
                .info-section {
                    margin-bottom: 12px;
                    
                    .section-label {
                        font-size: 12px;
                        color: #666;
                        margin-bottom: 8px;
                    }
                    
                    .section-content {
                        .tag-icon {
                            margin-right: 4px;
                        }
                    }
                }

                // 基本信息
                .basic-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    padding: 12px 0;
                    border-top: 1px solid #f0f0f0;
                    border-bottom: 1px solid #f0f0f0;
                    margin-bottom: 12px;
                    
                    .info-item {
                        font-size: 12px;
                        
                        .info-label {
                            color: #666;
                            margin-right: 8px;
                        }
                        
                        .info-value {
                            color: #000;
                        }
                    }
                }

            }
             // 价格信息卡片
                .price-info {
                    margin-top: 16px;
                    padding: 20px;
                    background-color: #fff;
                    border-radius: 8px;

                    .price-title-wrapper {
                        margin-bottom: 16px;

                        .price-title {
                            font-size: 16px;
                            font-weight: 600;
                            color: #333;
                        }
                    }

                    .price-card-list {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 12px;
                        margin-bottom: 16px;

                        .author-price-card {
                            .add-to-cart {
                                cursor: pointer;

                                .price-card.lined {
                                    border: 1px solid #e8e8e8;
                                    border-radius: 8px;
                                    padding: 12px 16px;
                                    transition: all 0.3s;

                                    &:hover {
                                        border-color: #1890ff;
                                        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
                                    }

                                    .content {
                                        display: flex;
                                        justify-content: space-between;
                                        align-items: center;

                                        .price {
                                            .price-value {
                                                .star-price {
                                                    display: flex;
                                                    align-items: baseline;
                                                    color: #1890ff;
                                                    font-weight: 600;

                                                    .unit {
                                                        font-size: 12px;
                                                        margin-right: 2px;
                                                    }

                                                    .price-number {
                                                        font-size: 18px;
                                                    }
                                                }
                                            }
                                        }

                                        .desc {
                                            font-size: 14px;
                                            color: #666;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    .desc {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 12px;
                        text-align: center;
                    }

                    .action {
                        width: 100%;
                        height: 36px;
                        border: none;
                        border-radius: 18px;
                        background-color: #1890ff;
                        color: #fff;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s;

                        &:hover {
                            background-color: #40a9ff;
                        }
                    }
                }
        }
        
        .page-right{
            flex: 1;
            background-color: transparent;

            /* 右侧卡片整体无内边距，让 Tabs 顶边贴合卡片 */
            .card-panel {
                :deep(.ant-card-body) {
                    padding: 0 20px !important;
                }
            }

            /* 作用于当前组件内部 Antd Tabs 的样式，需要用 :deep */
            .star-tabs {
                :deep(.ant-tabs-tab),
                :deep(.ant-tabs-tab-btn) {
                    font-size: 16px !important;
                    color: #666666 !important;
                }

                :deep(.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn) {
                    font-size: 16px !important;
                    color: #666666 !important;
                }
            }

            /* Tab 内容容器样式 */
            .tab-content-container {
                margin-top: 16px;
                // padding: 20px;
                // background: #fff;
                // border-radius: 8px;
            }
        }
    }
}
        
</style>