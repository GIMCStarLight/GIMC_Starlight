<template>
  <div class="ai-dialog-panel">
    <!-- 模式切换按钮 -->
    <div class="mode-switch-section">
      <el-segmented
        v-model="currentMode"
        :options="modeOptions"
        size="large"
        class="mode-segmented"
      />
    </div>

    <!-- SQLBot 嵌入式 AI 助手 -->
    <div v-if="currentMode === 'sqlbot'" class="sqlbot-section">
      <div class="sqlbot-header">
        <div class="sqlbot-title">
          <el-icon class="title-icon"><ChatDotRound /></el-icon>
          <h2>SQLBot 智能助手</h2>
        </div>
        <p class="sqlbot-subtitle">
          专业的数据查询和分析助手，支持自然语言查询数据库
        </p>
      </div>

      <div class="sqlbot-container">
        <SqlbotEmbedded
          :embedded-id="sqlbotConfig.embeddedId"
          :domain="sqlbotConfig.domain"
          :online="sqlbotConfig.online"
          :user-flag="sqlbotConfig.userFlag"
          container-class="sqlbot-full-page"
        />
      </div>
    </div>

    <!-- 原有的对话式 AI 助手 -->
    <div v-else class="dialog-ai-section">
      <!-- 走马灯展示区域 -->
      <div class="carousel-section">
        <el-carousel
          :interval="4000"
          type="card"
          height="200px"
          indicator-position="outside"
          arrow="hover"
        >
          <el-carousel-item
            v-for="(image, index) in carouselImages"
            :key="index"
          >
            <div class="carousel-item-content">
              <img :src="image.src" :alt="image.alt" class="carousel-image" />
              <div class="carousel-overlay">
                <h3 class="carousel-title">{{ image.title }}</h3>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>

      <!-- AI 欢迎头部 -->
      <div class="ai-welcome-section">
        <h1 class="welcome-title">我是 省广星芒✨ 智能助手</h1>
        <p class="welcome-subtitle">
          可以帮你管理供应商、达人信息，查询数据报表，执行各种系统操作
        </p>
      </div>

      <!-- 对话输入区域 -->
      <div class="dialog-input-section">
        <div class="input-container">
          <div class="input-wrapper">
            <el-input
              v-model="inputMessage"
              :placeholder="inputPlaceholder"
              type="textarea"
              :rows="1"
              :autosize="{ minRows: 1, maxRows: 4 }"
              @keydown="handleKeyDown"
              @focus="showQuickActions = false"
              ref="inputRef"
              class="ai-input"
            />
            <div class="input-actions">
              <el-button
                type="text"
                size="small"
                @click="toggleQuickActions"
                :class="{ 'action-active': showQuickActions }"
                title="快捷功能"
              >
                <el-icon><Operation /></el-icon>
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="sendMessage"
                :disabled="!inputMessage.trim() || isLoading"
                :loading="isLoading"
                class="send-button"
              >
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>

          <!-- 快捷操作面板 -->
          <div v-if="showQuickActions" class="quick-actions-panel">
            <div class="actions-grid">
              <div
                v-for="action in quickActions"
                :key="action.id"
                class="action-card"
                @click="handleQuickAction(action)"
              >
                <div class="action-icon">
                  <el-icon><component :is="action.icon" /></el-icon>
                </div>
                <div class="action-label">{{ action.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话历史 -->
      <div v-if="messages.length > 0" class="messages-section">
        <div class="messages-container" ref="messagesContainer">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-item"
            :class="{
              'message-user': message.sender === 'user',
              'message-ai': message.sender === 'ai',
            }"
          >
            <div class="message-avatar">
              <div v-if="message.sender === 'user'" class="user-avatar">
                <el-icon><User /></el-icon>
              </div>
              <div v-else class="ai-avatar">AI</div>
            </div>
            <div class="message-content">
              <div
                class="message-text"
                v-html="formatMessage(message.content)"
              ></div>
              <div
                v-if="message.sender === 'ai' && message.actions"
                class="message-actions"
              >
                <el-button
                  v-for="action in message.actions"
                  :key="action.id"
                  size="small"
                  @click="handleActionClick(action)"
                >
                  <el-icon><component :is="action.icon" /></el-icon>
                  {{ action.text }}
                </el-button>
              </div>
              <div class="message-time">
                {{ formatTime(message.timestamp) }}
              </div>
            </div>
          </div>

          <!-- 加载状态 -->
          <div v-if="isLoading" class="message-item message-ai">
            <div class="message-avatar">
              <div class="ai-avatar thinking">AI</div>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <div class="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span class="typing-text">正在思考中...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 建议提示 -->
      <div v-if="messages.length === 0" class="suggestions-section">
        <div class="suggestions-title">试试问我：</div>
        <div class="suggestions-grid">
          <div
            v-for="suggestion in suggestions"
            :key="suggestion.id"
            class="suggestion-card"
            @click="applySuggestion(suggestion)"
          >
            <div class="suggestion-icon">
              <el-icon><component :is="suggestion.icon" /></el-icon>
            </div>
            <div class="suggestion-text">{{ suggestion.text }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  User,
  Operation,
  Promotion,
  Search,
  OfficeBuilding,
  DataAnalysis,
  TrendCharts,
  Plus,
  Setting,
  QuestionFilled,
  Bell,
  ChatDotRound,
} from "@element-plus/icons-vue";
import SqlbotEmbedded from "../../components/SqlbotEmbedded/index.vue";
import { useUserStore } from "@vben/stores";

// 接口定义
interface Message {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: Date;
  actions?: ActionItem[];
}

interface ActionItem {
  id: string;
  text: string;
  icon: string;
  action: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

interface Suggestion {
  id: string;
  text: string;
  icon: string;
  prompt: string;
}

// 获取用户信息
const userStore = useUserStore();

// 模式切换相关
const currentMode = ref("dialog"); // 'dialog' | 'sqlbot'
const modeOptions = [
  { label: "对话助手", value: "dialog" },
  { label: "SQLBot", value: "sqlbot" },
];

// SQLBot 配置
const sqlbotConfig = reactive({
  // embeddedId: '7384843616184700928',
  embeddedId: "7385934328515006464",
  domain: "http://192.168.102.168:8009",

  online: true,
  userFlag: computed(() => userStore.userInfo?.username || "guest"),
});

// 组件事件
const emit = defineEmits<{
  "message-sent": [];
}>();

// 组件状态
const inputMessage = ref("");
const isLoading = ref(false);
const showQuickActions = ref(false);
const messages = ref<Message[]>([]);
const messagesContainer = ref<HTMLElement>();
const inputRef = ref();

const router = useRouter();

// 走马灯图片数据
const carouselImages = ref([
  {
    src: "/src/assets/carousel-images/【哲风壁纸】93阅兵-人民大会堂.png",
    alt: "人民大会堂",
    title: "庄严肃穆的人民大会堂",
  },
  {
    src: "/src/assets/carousel-images/【哲风壁纸】可爱小狗-小狗-护眼.png",
    alt: "可爱小狗",
    title: "萌萌哒小狗狗",
  },
  {
    src: "/src/assets/carousel-images/【哲风壁纸】夏天森林-大树仰拍.png",
    alt: "夏天森林",
    title: "夏日森林的绿意盎然",
  },
  {
    src: "/src/assets/carousel-images/【哲风壁纸】夕阳-护栏.png",
    alt: "夕阳护栏",
    title: "夕阳西下的美好时光",
  },
  {
    src: "/src/assets/carousel-images/【哲风壁纸】森林-车站.png",
    alt: "森林车站",
    title: "森林中的小车站",
  },
]);

// 动态输入提示
const inputPlaceholder = computed(() => {
  const placeholders = [
    "给客户管理助手发送消息",
    "搜索供应商或达人信息...",
    "查询数据统计报表...",
    "执行系统操作指令...",
  ];
  return placeholders[Math.floor(Math.random() * placeholders.length)];
});

// 快捷操作
const quickActions = ref<QuickAction[]>([
  {
    id: "search-supplier",
    label: "搜索供应商",
    icon: "OfficeBuilding",
    prompt: "帮我查找供应商信息",
  },
  {
    id: "search-influencer",
    label: "搜索达人",
    icon: "User",
    prompt: "帮我查找达人信息",
  },
  {
    id: "view-stats",
    label: "查看统计",
    icon: "DataAnalysis",
    prompt: "显示今日数据统计",
  },
  {
    id: "create-new",
    label: "新增记录",
    icon: "Plus",
    prompt: "我想新增供应商或达人",
  },
  {
    id: "system-help",
    label: "使用帮助",
    icon: "QuestionFilled",
    prompt: "如何使用客户管理系统？",
  },
  {
    id: "notifications",
    label: "待办事项",
    icon: "Bell",
    prompt: "显示我的待办事项",
  },
]);

// 建议问题
const suggestions = ref<Suggestion[]>([
  {
    id: "1",
    text: "查看今日数据概况",
    icon: "TrendCharts",
    prompt: "请显示今日的供应商、达人和项目统计数据",
  },
  {
    id: "2",
    text: "搜索活跃供应商",
    icon: "OfficeBuilding",
    prompt: "帮我查找状态为活跃的供应商列表",
  },
  {
    id: "3",
    text: "如何新增达人信息？",
    icon: "QuestionFilled",
    prompt: "请教我如何在系统中添加新的达人信息",
  },
  {
    id: "4",
    text: "系统功能介绍",
    icon: "Setting",
    prompt: "介绍一下客户管理系统的主要功能",
  },
]);

// 处理输入
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    sender: "user",
    content: inputMessage.value.trim(),
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  const query = inputMessage.value.trim();
  inputMessage.value = "";
  showQuickActions.value = false;

  // 通知父组件有消息发送
  emit("message-sent");

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  // 模拟AI响应
  await simulateAIResponse(query);
};

// 模拟AI响应
const simulateAIResponse = async (query: string) => {
  isLoading.value = true;

  // 模拟思考时间
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );

  let response = "";
  let actions: ActionItem[] = [];

  // 基于查询内容生成响应
  if (query.includes("供应商") || query.toLowerCase().includes("supplier")) {
    response =
      "我为您找到了供应商相关信息。当前系统中共有 156 家供应商，其中 120 家状态为活跃。您可以：";
    actions = [
      {
        id: "goto-suppliers",
        text: "查看供应商列表",
        icon: "OfficeBuilding",
        action: () => router.push("/supplier"),
      },
      {
        id: "add-supplier",
        text: "新增供应商",
        icon: "Plus",
        action: () => router.push("/supplier"),
      },
    ];
  } else if (
    query.includes("达人") ||
    query.toLowerCase().includes("influencer")
  ) {
    response =
      "关于达人信息：系统中现有 89 位达人，涵盖多个平台和领域。您可以：";
    actions = [
      {
        id: "goto-influencers",
        text: "查看达人列表",
        icon: "User",
        action: () => router.push("/influencer"),
      },
      {
        id: "add-influencer",
        text: "注册新达人",
        icon: "Plus",
        action: () => router.push("/influencer"),
      },
    ];
  } else if (
    query.includes("统计") ||
    query.includes("数据") ||
    query.includes("报表")
  ) {
    response =
      "📊 今日数据概况：<br/>• 供应商总数：156 家 (↗️ +12.5%)<br/>• 达人总数：89 位 (↗️ +8.3%)<br/>• 项目总数：234 个 (↗️ +15.7%)<br/>• 月度营收：¥1,250,000 (↗️ +23.4%)";
    actions = [
      {
        id: "goto-dashboard",
        text: "查看详细报表",
        icon: "DataAnalysis",
        action: () => router.push("/analytics/dashboard"),
      },
    ];
  } else if (
    query.includes("帮助") ||
    query.includes("如何") ||
    query.includes("怎么")
  ) {
    response =
      "我很乐意为您提供帮助！客户管理系统的主要功能包括：<br/>• 供应商信息管理<br/>• 达人档案管理<br/>• 供应商-达人关系维护<br/>• 数据分析与报表<br/>• 财务返点管理";
    actions = [
      {
        id: "system-tour",
        text: "功能导览",
        icon: "QuestionFilled",
        action: () => ElMessage.success("功能导览即将推出！"),
      },
    ];
  } else {
    response =
      "感谢您的问题！我正在不断学习中，可能无法完美回答所有问题。您可以尝试询问关于供应商、达人、数据统计或系统使用方面的问题。";
  }

  const aiMessage: Message = {
    id: Date.now().toString(),
    sender: "ai",
    content: response,
    timestamp: new Date(),
    actions: actions.length > 0 ? actions : undefined,
  };

  isLoading.value = false;
  messages.value.push(aiMessage);

  await nextTick();
  scrollToBottom();
};

// 处理快捷操作
const handleQuickAction = (action: QuickAction) => {
  inputMessage.value = action.prompt;
  showQuickActions.value = false;
  sendMessage();
};

// 处理建议点击
const applySuggestion = (suggestion: Suggestion) => {
  inputMessage.value = suggestion.prompt;
  sendMessage();
};

// 处理操作按钮点击
const handleActionClick = (action: ActionItem) => {
  action.action();
};

// 切换快捷操作面板
const toggleQuickActions = () => {
  showQuickActions.value = !showQuickActions.value;
};

// 格式化消息内容
const formatMessage = (content: string) => {
  return content.replace(/\n/g, "<br/>");
};

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

onMounted(() => {
  // 自动聚焦输入框
  setTimeout(() => {
    inputRef.value?.focus();
  }, 500);
});
</script>

<style scoped>
.ai-dialog-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* 模式切换区域 */
.mode-switch-section {
  padding: 20px;
  display: flex;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.mode-segmented {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 4px;
}

.mode-segmented :deep(.el-segmented__item) {
  color: white;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.mode-segmented :deep(.el-segmented__item.is-selected) {
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* SQLBot 区域样式 */
.sqlbot-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
}

.sqlbot-header {
  text-align: center;
  margin-bottom: 20px;
  color: white;
}

.sqlbot-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.title-icon {
  font-size: 28px;
  color: #ffd700;
}

.sqlbot-title h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sqlbot-subtitle {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.5;
}

.sqlbot-container {
  flex: 1;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
}

.sqlbot-container :deep(.sqlbot-full-page) {
  height: 100%;
  border-radius: 16px;
}

/* 对话式AI区域样式 */
.dialog-ai-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
  justify-content: center;
  align-items: center;
}

/* 走马灯区域 */
.carousel-section {
  margin-bottom: 40px;
  width: 100%;
}

.carousel-item-content {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.carousel-item-content:hover .carousel-image {
  transform: scale(1.05);
}

.carousel-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 20px;
  color: white;
}

.carousel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* 走马灯指示器样式 */
.carousel-section :deep(.el-carousel__indicators) {
  margin-top: 16px;
}

.carousel-section :deep(.el-carousel__indicator) {
  padding: 8px 4px;
}

.carousel-section :deep(.el-carousel__button) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.4);
  border: none;
  transition: all 0.3s ease;
}

.carousel-section
  :deep(.el-carousel__indicator.is-active .el-carousel__button) {
  background-color: #409eff;
  transform: scale(1.2);
}

/* AI 欢迎区域 */
.ai-welcome-section {
  text-align: center;
  margin-bottom: 40px;
}

.welcome-title {
  font-size: 2rem;
  font-weight: 300;
  color: var(--el-text-color-primary, #1a1a1a);
  margin: 0 0 16px 0;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.welcome-subtitle {
  font-size: 1rem;
  color: var(--el-text-color-regular, #666666);
  margin: 0;
  line-height: 1.6;
  max-width: 500px;
  margin: 0 auto;
  font-weight: 400;
}

/* 对话输入区域 */
.dialog-input-section {
  margin-bottom: 32px;
  width: 100%;
}

.input-container {
  position: relative;
  background: var(--el-bg-color, #ffffff);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--el-border-color-light, rgba(255, 255, 255, 0.8));
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-container:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.input-container:focus-within {
  box-shadow: 0 16px 48px rgba(64, 158, 255, 0.2),
    0 6px 16px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.3);
  transform: translateY(-3px);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  padding: 20px 24px;
}

.ai-input {
  flex: 1;
  margin-right: 16px;
}

.ai-input :deep(.el-textarea__inner) {
  border: none;
  padding: 16px 20px;
  font-size: 16px;
  line-height: 1.6;
  resize: none;
  background: transparent;
  border-radius: 0;
  color: var(--el-text-color-primary, #333333);
  box-shadow: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.ai-input :deep(.el-textarea__inner):focus {
  background: transparent;
  box-shadow: none;
  border: none;
}

.ai-input :deep(.el-textarea__inner)::placeholder {
  color: var(--el-text-color-placeholder, #a8abb2);
}

.input-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.input-actions .el-button {
  border: none;
  background: linear-gradient(
    135deg,
    var(--el-fill-color-light, #f8f9fa) 0%,
    var(--el-fill-color, #e9ecef) 100%
  );
  color: var(--el-text-color-regular, #666666);
  border-radius: 12px;
  padding: 12px;
  min-width: 48px;
  height: 48px;
  font-size: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.input-actions .el-button:hover {
  background: linear-gradient(
    135deg,
    var(--el-fill-color, #e9ecef) 0%,
    var(--el-fill-color-dark, #dee2e6) 100%
  );
  color: var(--el-text-color-primary, #333333);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.action-active {
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.3) !important;
}

.send-button {
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%) !important;
  color: #ffffff !important;
  border-radius: 12px;
  padding: 12px 20px !important;
  min-width: 56px !important;
  height: 48px !important;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.3);
}

.send-button:hover {
  background: linear-gradient(135deg, #337ecc 0%, #2c6bb3 100%) !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

.send-button:disabled {
  background: linear-gradient(
    135deg,
    var(--el-color-info-light-5, #cccccc) 0%,
    var(--el-color-info-light-3, #b3b3b3) 100%
  ) !important;
  color: var(--el-text-color-disabled, #999999) !important;
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 快捷操作面板 */
.quick-actions-panel {
  border-top: 1px solid var(--el-border-color-lighter, #f0f0f0);
  padding: 16px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--el-border-color-lighter, #f0f0f0);
  background: var(--el-fill-color-lighter, #fafafa);
}

.action-card:hover {
  background: var(--el-bg-color, #ffffff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.action-icon {
  font-size: 18px;
  color: #409eff;
  margin-bottom: 8px;
}

.action-label {
  font-size: 12px;
  color: var(--el-text-color-primary, #333333);
  font-weight: 500;
  text-align: center;
}

/* 消息区域 */
.messages-section {
  margin-bottom: 32px;
  width: 100%;
}

.messages-container {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.messages-container::-webkit-scrollbar {
  width: 4px;
}

.messages-container::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter, #f5f5f5);
  border-radius: 2px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color, #cccccc);
  border-radius: 2px;
}

.message-item {
  display: flex;
  margin-bottom: 24px;
  align-items: flex-start;
}

.message-user {
  flex-direction: row-reverse;
}

.message-user .message-content {
  background: #409eff;
  color: white;
  margin-right: 12px;
  border-radius: 16px 16px 4px 16px;
}

.message-ai .message-content {
  background: var(--el-fill-color-lighter, #f8f9fa);
  border: 1px solid var(--el-border-color-light, #e5e5e5);
  margin-left: 12px;
  border-radius: 16px 16px 16px 4px;
  color: var(--el-text-color-primary, #333333);
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: #409eff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.ai-avatar {
  width: 32px;
  height: 32px;
  background: var(--el-fill-color, #f0f0f0);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular, #666666);
}

.ai-avatar.thinking {
  animation: thinking 2s ease-in-out infinite;
}

@keyframes thinking {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-text {
  line-height: 1.5;
  word-wrap: break-word;
  font-size: 14px;
}

.message-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.message-actions .el-button {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e5e5e5);
  color: #409eff;
  border-radius: 16px;
  font-size: 12px;
  padding: 4px 12px;
  transition: all 0.2s ease;
}

.message-actions .el-button:hover {
  background: #409eff;
  color: #ffffff;
  border-color: #409eff;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8px;
}

.message-ai .message-time {
  color: var(--el-text-color-placeholder, #999999);
}

/* 加载状态 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  background: var(--el-border-color, #cccccc);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}

.typing-text {
  color: var(--el-text-color-placeholder, #999999);
  font-size: 13px;
}

/* 建议区域 */
.suggestions-section {
  text-align: center;
  width: 100%;
}

.suggestions-title {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--el-text-color-primary, #333333);
  margin-bottom: 24px;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
  justify-items: center;
  align-items: center;
}

.suggestion-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.suggestion-card:hover {
  background: rgba(64, 158, 255, 0.05);
  transform: translateY(-1px);
}

.suggestion-card:hover .suggestion-icon {
  color: #409eff;
}

.suggestion-card:hover .suggestion-text {
  color: var(--el-text-color-primary, #333333);
}

.suggestion-icon {
  width: 32px;
  height: 32px;
  background: transparent;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder, #999999);
  font-size: 16px;
  margin-right: 8px;
  flex-shrink: 0;
}

.suggestion-text {
  font-size: 14px;
  color: var(--el-text-color-regular, #666666);
  font-weight: 400;
  line-height: 1.4;
  text-align: center;
  flex: 1;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .carousel-overlay {
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  }

  .input-container {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .input-container:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .action-card {
    border-color: var(--el-border-color-darker, #2c2c2c);
  }

  .message-content {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-dialog-panel {
    padding: 24px 16px;
  }

  .carousel-section {
    margin-bottom: 24px;
  }

  .carousel-section :deep(.el-carousel) {
    height: 150px !important;
  }

  .welcome-title {
    font-size: 1.5rem;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .suggestions-grid {
    grid-template-columns: 1fr;
  }

  .message-content {
    max-width: 85%;
  }
}
</style>
