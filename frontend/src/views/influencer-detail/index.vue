<template>
    <div class="page-wrapper">
        <div class="space-medium">
            <div class="page-left">
                <a-card :bordered="false" class="influencer-card">
                    <!-- 顶部用户信息 -->
                    <div class="author-info-section">
                        <a-avatar :size="48" src="data:image/png;base64,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" />
                        <div class="author-info-content">
                            <div class="author-name"></div>
                            <div class="author-id">
                                <span class="id-label">星图ID:</span>
                                <a-typography-text copyable />
                            </div>
                        </div>
                    </div>

                    <!-- 数据指标 -->
                    <div class="data-metrics">
                        <div class="metric-item">
                            <div class="metric-label">月连接用户数</div>
                            <div class="metric-value">19,669.1w</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">月深度用户数</div>
                            <div class="metric-value">10,814.1w</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">粉丝数</div>
                            <div class="metric-value">-</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">月涨粉率</div>
                            <div class="metric-value">0.06%</div>
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
                            <a-tag>暂无标签</a-tag>
                        </div>
                    </div>

                    <!-- 行业标签 -->
                    <div class="info-section">
                        <div class="section-label">行业标签</div>
                        <div class="section-content">
                            <a-space :size="8" wrap>
                                <a-tag>日化</a-tag>
                                <a-tag>家居建材</a-tag>
                                <a-tag>医药健康</a-tag>
                            </a-space>
                        </div>
                    </div>

                    <!-- 基本信息 -->
                    <div class="basic-info">
                        <div class="info-item">
                            <span class="info-label">性别</span>
                            <span class="info-value">--</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">地区</span>
                            <span class="info-value">--</span>
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <!-- <div class="action-buttons">
                        <a-button type="text" size="small">
                            <template #icon>
                                <database-outlined />
                            </template>
                            入库
                        </a-button>
                        <a-button type="text" size="small">
                            <template #icon>
                                <message-outlined />
                            </template>
                            联系
                        </a-button>
                    </div> -->
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
                                                        <span class="price-number">280,000</span>
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
                                                        <span class="price-number">381,600</span>
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
                                                        <span class="price-number">583,000</span>
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
                                                        <span class="price-number">550,000</span>
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
                                                        <span class="price-number">583,000</span>
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
                    <section class="fold-control">
                        <div class="fold-btn">
                            <span class="fold-tips">
                                <span class="i-icon i-icon-xt-icon-double-down">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 48 48" fill="none">
                                        <g>
                                            <path d="M37.586 7.586 24 21.172 10.414 7.586l-2.828 2.828 15 15a2 2 0 0 0 2.828 0l15-15-2.828-2.828Z" fill="currentColor"></path>
                                            <path d="M37.586 21.586 24 35.172 10.414 21.586l-2.828 2.828 15 15a2 2 0 0 0 2.828 0l15-15-2.828-2.828Z" fill="currentColor"></path>
                                        </g>
                                    </svg>
                                </span>
                                达人还支持抖音短视频合集任务等其他3报价方式
                            </span>
                        </div>
                    </section>
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
                    <TabOne v-if="activeTab === 'overview'" />
                    <TabTwo v-if="activeTab === 'content_performance'" />
                    <TabThree v-if="activeTab === 'connected_users'" />
                    <TabFour v-if="activeTab === 'business_capabilities'" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DatabaseOutlined, MessageOutlined } from '@ant-design/icons-vue';
import TabOne from './components/tab-one.vue';
import TabTwo from './components/tab-two.vue';
import TabThree from './components/tab-three.vue';
import TabFour from './components/tab-four.vue';

const activeTab = ref('overview');
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
                            font-size: 14px;
                            line-height: 22px;
                            margin-bottom: 4px;
                        }
                        
                        .author-id {
                            font-size: 12px;
                            color: #666;
                            
                            .id-label {
                                margin-right: 4px;
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
                            font-size: 12px;
                            color: #666;
                            margin-bottom: 4px;
                        }
                        
                        .metric-value {
                            font-size: 16px;
                            font-weight: 600;
                            color: #000;
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

                // 操作按钮
                .action-buttons {
                    display: flex;
                    justify-content: space-around;
                    padding-top: 8px;
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

                    .fold-control {
                        .fold-btn {
                            text-align: center;
                            margin: 16px 0;

                            .fold-tips {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 14px;
                                color: #666;
                                cursor: pointer;

                                .i-icon {
                                    margin-right: 4px;
                                    color: #666;
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