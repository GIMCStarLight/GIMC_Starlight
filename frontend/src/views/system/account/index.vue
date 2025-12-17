<template>
  <div class="account-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <Icon icon="lucide:shield-check" size="32" />
        </div>
        <div class="header-content">
          <h2 class="page-title">{{ $t('page.system.account.title') }}</h2>
          <p class="page-description">{{ $t('page.system.account.tokenCheck.description') }}</p>
        </div>
      </div>
    </div>

    <div class="container">
      <!-- Token查询卡片 -->
      <div class="token-query-card">
        <div class="card-header">
          <div class="card-icon">
            <Icon icon="lucide:key" size="20" />
          </div>
          <h3 class="card-title">Token有效期查询</h3>
        </div>

        <div class="card-body">
          <!-- 输入表单 -->
          <div class="input-section">
            <div class="input-group">
              <label class="input-label">
                <!-- <Icon icon="lucide:user" size="16" class="mr-1" />
                {{ $t('page.system.account.tokenCheck.username') }} -->
              </label>
              <ElInput
                v-model="usernameInput"
                :placeholder="$t('page.system.account.tokenCheck.usernamePlaceholder')"
                size="large"
                clearable
                class="custom-input"
              >
                <template #prefix>
                  <Icon icon="lucide:user" size="16" class="text-gray-400" />
                </template>
              </ElInput>
            </div>

            <div class="input-group">
              <label class="input-label">
                <!-- <Icon icon="lucide:lock" size="16" class="mr-1" />
                {{ $t('page.system.account.tokenCheck.password') }} -->
              </label>
              <ElInput
                v-model="passwordInput"
                :placeholder="$t('page.system.account.tokenCheck.passwordPlaceholder')"
                type="password"
                size="large"
                show-password
                clearable
                class="custom-input"
              >
                <template #prefix>
                  <Icon icon="lucide:lock" size="16" class="text-gray-400" />
                </template>
              </ElInput>
            </div>

            <ElButton
              type="primary"
              size="large"
              @click="handleQueryToken"
              :loading="queryLoading"
              class="query-button"
            >
              <Icon v-if="!queryLoading" icon="lucide:search" class="mr-2" />
              {{ queryLoading ? '验证中...' : $t('page.system.account.tokenCheck.query') }}
            </ElButton>

            <div v-if="queryMessage" class="message" :class="queryMessageClass">
              <Icon :icon="queryMessageClass.includes('green') ? 'lucide:check-circle' : 'lucide:alert-circle'" size="16" class="mr-1" />
              {{ queryMessage }}
            </div>
          </div>
        </div>
      </div>

      <!-- Token信息展示 -->
      <div v-if="tokenData" class="token-info-section">
        <!-- 状态卡片 -->
        <div class="status-card" :class="`status-${tokenData.status}`">
          <div class="status-header">
            <div class="status-icon">
              <Icon :icon="getStatusIcon()" size="24" />
            </div>
            <div class="status-content">
              <h4 class="status-title">Token状态</h4>
              <p class="status-description">{{ getStatusDescription() }}</p>
            </div>
            <div class="status-badge">
              <ElTag :type="getTokenStatusTagType()" size="large" effect="dark">
                {{ getTokenStatusText() }}
              </ElTag>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-label">剩余有效期</span>
              <span class="progress-value">{{ tokenData.remainingDays }} / {{ tokenData.totalDays }} 天</span>
            </div>
            <div class="progress-container">
              <div
                class="progress-bar"
                :style="{
                  width: `${getTokenProgressPercentage()}%`,
                  backgroundColor: getTokenProgressColor()
                }"
              ></div>
            </div>
            <div class="progress-date">
              到期时间: {{ formatDate(tokenData.expiryDate) }}
            </div>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="info-section">
          <!-- Token值卡片 -->
          <div class="info-card token-card">
            <div class="card-header">
              <h4 class="card-title">
                <!-- <Icon icon="lucide:key-round" size="18" class="mr-2" /> -->
                当前Token值
              </h4>
              <ElButton
                size="small"
                type="primary"
                @click="copyTokenToClipboard"
                class="copy-button"
              >
                <Icon icon="lucide:copy" size="14" class="mr-1" />
                复制
              </ElButton>
            </div>
            <div class="token-display">
              <div class="token-content">
                {{ tokenData.token }}
              </div>
            </div>
            <p v-if="copySuccessMessage" class="copy-message">
              <Icon icon="lucide:check" size="14" class="mr-1" />
              {{ copySuccessMessage }}
            </p>
          </div>

          <!-- 基本信息卡片 -->
          <div class="info-card">
            <div class="card-header">
              <h4 class="card-title">
                <!-- <Icon icon="lucide:info" size="18" class="mr-2" /> -->
                基本信息
              </h4>
            </div>
            <div class="info-list">
              <div class="info-item">
                <span class="info-label">Token类型</span>
                <span class="info-value">{{ tokenData.tokenType }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">签发时间</span>
                <span class="info-value">{{ formatDate(tokenData.issuedAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">最后使用</span>
                <span class="info-value">{{ formatDate(tokenData.lastUsed) }}</span>
              </div>
            </div>
          </div>

          <!-- 权限信息卡片 -->
          <!-- <div class="info-card permissions-card">
            <div class="card-header">
              <h4 class="card-title">
                <Icon icon="lucide:shield" size="18" class="mr-2" />
                权限信息
              </h4>
            </div>
            <div class="permissions-list">
              <ElTag
                v-for="permission in tokenData.permissions"
                :key="permission"
                size="default"
                class="permission-tag"
              >
                <Icon icon="lucide:check" size="14" class="mr-1" />
                {{ getPermissionText(permission) }}
              </ElTag>
            </div>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IconifyIcon as Icon } from '@vben/icons';
import { ElButton, ElInput, ElMessage, ElProgress, ElTag } from 'element-plus';
import { $t } from '#/locales';

// Token查询相关
const usernameInput = ref('');
const passwordInput = ref('');
const queryLoading = ref(false);
const queryMessage = ref('');
const copySuccessMessage = ref('');
const tokenData = ref<TokenData | null>(null);

// Token数据接口
interface TokenData {
  token: string;
  tokenType: string;
  issuedAt: string;
  expiryDate: string;
  lastUsed: string;
  remainingDays: number;
  totalDays: number;
  permissions: string[];
  status: 'active' | 'expired' | 'will-expire';
}

// 查询消息样式
const queryMessageClass = computed(() => {
  return queryMessage.value.includes($t('page.system.account.tokenCheck.querySuccess'))
    ? 'text-green-600'
    : queryMessage.value.includes($t('page.system.account.tokenCheck.queryFailed'))
    ? 'text-red-600'
    : 'text-gray-500';
});

// 获取Token状态文本
const getTokenStatusText = () => {
  if (!tokenData.value) return '';
  switch (tokenData.value.status) {
    case 'active':
      return $t('page.system.account.tokenCheck.isActive');
    case 'expired':
      return $t('page.system.account.tokenCheck.isExpired');
    case 'will-expire':
      return $t('page.system.account.tokenCheck.willExpire');
    default:
      return '';
  }
};

// 获取Token状态标签类型
const getTokenStatusTagType = () => {
  if (!tokenData.value) return 'info';
  switch (tokenData.value.status) {
    case 'active':
      return 'success';
    case 'expired':
      return 'danger';
    case 'will-expire':
      return 'warning';
    default:
      return 'info';
  }
};

// 获取Token状态背景颜色
const getTokenStatusBgColor = () => {
  if (!tokenData.value) return 'bg-blue-50';
  switch (tokenData.value.status) {
    case 'active':
      return 'bg-green-50';
    case 'expired':
      return 'bg-red-50';
    case 'will-expire':
      return 'bg-yellow-50';
    default:
      return 'bg-blue-50';
  }
};

// 获取Token状态文本颜色
const getTokenStatusTextColor = () => {
  if (!tokenData.value) return 'text-blue-600';
  switch (tokenData.value.status) {
    case 'active':
      return 'text-green-600';
    case 'expired':
      return 'text-red-600';
    case 'will-expire':
      return 'text-yellow-600';
    default:
      return 'text-blue-600';
  }
};

// 获取Token进度百分比
const getTokenProgressPercentage = () => {
  if (!tokenData.value) return 0;
  return Math.round((tokenData.value.remainingDays / tokenData.value.totalDays) * 100);
};

// 获取Token进度颜色
const getTokenProgressColor = () => {
  const percentage = getTokenProgressPercentage();
  if (percentage > 50) return '#10b981';
  if (percentage > 20) return '#f59e0b';
  return '#ef4444';
};

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

// 生成模拟Token值
const generateMockToken = (username: string): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30天后过期
    iss: 'GIMC-Starlight',
    aud: 'system-management',
    permissions: ['read', 'write', 'admin']
  }));
  const signature = 'mock-signature-' + Math.random().toString(36).substring(2, 15);

  return `${header}.${payload}.${signature}`;
};

// 获取状态图标
const getStatusIcon = () => {
  if (!tokenData.value) return 'lucide:help-circle';
  switch (tokenData.value.status) {
    case 'active':
      return 'lucide:check-circle';
    case 'expired':
      return 'lucide:x-circle';
    case 'will-expire':
      return 'lucide:alert-triangle';
    default:
      return 'lucide:help-circle';
  }
};

// 获取状态描述
const getStatusDescription = () => {
  if (!tokenData.value) return '';
  switch (tokenData.value.status) {
    case 'active':
      return 'Token当前有效，可以正常使用';
    case 'expired':
      return 'Token已过期，需要重新获取';
    case 'will-expire':
      return 'Token即将过期，建议及时更新';
    default:
      return '';
  }
};

// 获取权限文本
const getPermissionText = (permission: string) => {
  const permissionMap: Record<string, string> = {
    'read': '读取权限',
    'write': '写入权限',
    'admin': '管理员权限'
  };
  return permissionMap[permission] || permission;
};

// 复制Token到剪贴板
const copyTokenToClipboard = async () => {
  if (!tokenData.value?.token) {
    ElMessage.warning('没有可复制的Token');
    return;
  }

  try {
    await navigator.clipboard.writeText(tokenData.value.token);
    copySuccessMessage.value = 'Token已复制到剪贴板';
    ElMessage.success('Token已复制到剪贴板');

    // 3秒后清除成功消息
    setTimeout(() => {
      copySuccessMessage.value = '';
    }, 3000);
  } catch (error) {
    // 降级处理：使用传统的复制方法
    try {
      const textArea = document.createElement('textarea');
      textArea.value = tokenData.value.token;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      copySuccessMessage.value = 'Token已复制到剪贴板';
      ElMessage.success('Token已复制到剪贴板');

      setTimeout(() => {
        copySuccessMessage.value = '';
      }, 3000);
    } catch (fallbackError) {
      ElMessage.error('复制失败，请手动复制');
    }
  }
};

// 验证登录信息
const validateCredentials = (): boolean => {
  return usernameInput.value.trim().length > 0 && passwordInput.value.trim().length > 0;
};

// 查询Token信息
const handleQueryToken = async () => {
  if (!validateCredentials()) {
    queryMessage.value = $t('page.system.account.tokenCheck.credentialsRequired');
    return;
  }

  try {
    queryLoading.value = true;
    queryMessage.value = '';

    // 模拟登录和Token查询API调用
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟验证失败的情况
    if (usernameInput.value === 'wrong' || passwordInput.value === 'wrong') {
      queryMessage.value = $t('page.system.account.tokenCheck.invalidCredentials');
      ElMessage.error($t('page.system.account.tokenCheck.loginFailed'));
      return;
    }

    // 模拟返回Token数据
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 30); // 30天后过期

    const lastUsed = new Date(now);
    lastUsed.setHours(lastUsed.getHours() - 2); // 2小时前使用

    const issuedAt = new Date(now);
    issuedAt.setDate(issuedAt.getDate() - 15); // 15天前签发

    const totalDays = 30;
    const remainingDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'active' | 'expired' | 'will-expire' = 'active';
    if (remainingDays <= 0) {
      status = 'expired';
    } else if (remainingDays <= 7) {
      status = 'will-expire';
    }

    const mockTokenData: TokenData = {
      token: generateMockToken(usernameInput.value),
      tokenType: 'Bearer Token',
      issuedAt: issuedAt.toISOString(),
      expiryDate: expiryDate.toISOString(),
      lastUsed: lastUsed.toISOString(),
      remainingDays: Math.max(0, remainingDays),
      totalDays,
      permissions: ['read', 'write', 'admin'],
      status
    };

    tokenData.value = mockTokenData;
    queryMessage.value = $t('page.system.account.tokenCheck.querySuccess');
    ElMessage.success($t('page.system.account.tokenCheck.querySuccess'));

  } catch (error) {
    queryMessage.value = $t('page.system.account.tokenCheck.queryFailed');
    ElMessage.error($t('page.system.account.tokenCheck.queryFailed'));
  } finally {
    queryLoading.value = false;
  }
};

// 创建账号
const handleCreate = () => {
  ElMessage.info('功能开发中...');
};

// 刷新
const handleRefresh = () => {
  ElMessage.info('功能开发中...');
};
</script>

<style scoped>
.account-management {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8faff 0%, #f5f0ff 50%, #faf0ff 100%);
  padding: 24px;
}

/* 页面头部 */
.page-header {
  margin-bottom: 32px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.header-content {
  color: #1f2937;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #1f2937;
  text-shadow: none;
}

.page-description {
  font-size: 16px;
  margin: 0;
  color: #6b7280;
  font-weight: 400;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Token查询卡片 */
.token-query-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
  backdrop-filter: blur(20px);
  margin-bottom: 32px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.card-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.card-body {
  /* 空白 */
}

/* 输入区域 */
.input-section {
  max-width: 400px;
}

.input-group {
  margin-bottom: 20px;
}

.input-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.custom-input {
  --el-input-border-radius: 10px;
  --el-input-border-color: #e5e7eb;
  --el-input-focus-border-color: #667eea;
}

.query-button {
  width: 100%;
  height: 48px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  transition: all 0.3s ease;
}

.query-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.message {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  margin-top: 16px;
}

.message.text-green-600 {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.message.text-red-600 {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* Token信息展示区域 */
.token-info-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 状态卡片 */
.status-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.12);
  border-left: 4px solid #667eea;
}

.status-card.status-active {
  border-left-color: #10b981;
}

.status-card.status-expired {
  border-left-color: #ef4444;
}

.status-card.status-will-expire {
  border-left-color: #f59e0b;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-card.status-active .status-icon {
  background: #f0fdf4;
  color: #10b981;
}

.status-card.status-expired .status-icon {
  background: #fef2f2;
  color: #ef4444;
}

.status-card.status-will-expire .status-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.status-content {
  flex: 1;
}

.status-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.status-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* 进度条区域 */
.progress-section {
  margin-top: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.progress-value {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
}

.progress-container {
  width: 100%;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-date {
  font-size: 12px;
  color: #9ca3af;
  text-align: right;
}

/* 信息网格 */
.info-grid {
  display: flex;
  flex-direction: row;
  gap: 24px;
  width: 100%;
}

@media (max-width: 1024px) {
  .info-grid {
    flex-direction: column;
  }
}

/* 信息卡片 */
.info-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.info-card .card-header {
  margin-bottom: 16px;
  justify-content: space-between;
}

.info-card .card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

/* Token卡片特殊样式 */
.token-card {
  flex: 1;
}

/* 基本信息和权限卡片 */
.info-card:not(.token-card) {
  flex: 1;
}

.token-display {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.token-content {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #475569;
  word-break: break-all;
  line-height: 1.5;
  background: white;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.copy-button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
}

.copy-message {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #10b981;
  font-weight: 500;
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #6b7280;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

/* 权限列表 */
.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 1px solid #0284c7;
  color: #0c4a6e;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .account-management {
    padding: 16px;
  }

  .token-query-card,
  .status-card,
  .info-card {
    padding: 20px;
  }

  .page-title {
    font-size: 24px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
  }

  .input-section {
    max-width: 100%;
  }
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.token-info-section {
  animation: fadeInUp 0.5s ease;
}
</style>