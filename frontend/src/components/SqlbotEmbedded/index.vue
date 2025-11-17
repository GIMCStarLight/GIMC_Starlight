<template>
  <div class="sqlbot-embedded-container">
    <div class="sqlbot-full-page" ref="sqlbotContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { log } from '#/utils/logger';
import { useUserStore } from '@vben/stores';

// 定义组件属性
interface Props {
  /** SQLBot 嵌入式ID */
  embeddedId?: string;
  /** SQLBot 域名 */
  domain?: string;
  /** 是否在线模式 */
  online?: boolean;
  /** 用户标识 */
  userFlag?: string | number;
  /** 容器类名 */
  containerClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  //  embeddedId: '7384843616184700928',
   embeddedId: '7385934328515006464',
  domain: 'http://192.168.102.168:8009',
  online: true,
  containerClass: 'sqlbot-full-page'
});

// 组件状态
const sqlbotContainer = ref<HTMLElement>();
const isScriptLoaded = ref(false);
const isMounted = ref(false);
const userStore = useUserStore();

// 计算属性
const userFlag = computed(() => {
  if (!props.online) {
    return null;
  }
  return props.userFlag || userStore.userInfo?.id || userStore.userInfo?.username;
});

// SQLBot 初始化参数
const sqlbotParams = computed(() => {
  const params: Record<string, any> = {
    embeddedId: props.embeddedId,
    online: props.online,
  };

  if (props.online && userFlag.value) {
    params.userFlag = userFlag.value;
  }

  return params;
});

// 全局变量声明
declare global {
  interface Window {
    sqlbot_embedded_handler?: {
      mounted: (selector: string, params: Record<string, any>) => void;
    };
  }
}

/**
 * 创建降级处理器（当SQLBot脚本无法加载时）
 */
const createFallbackHandler = () => {
  if (!window.sqlbot_embedded_handler) {
    window.sqlbot_embedded_handler = {
      mounted: (selector: string, params: Record<string, any>) => {
        const container = document.querySelector(selector) as HTMLElement;
        if (container) {
          container.innerHTML = `
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              min-height: 400px;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              border-radius: 12px;
              padding: 40px 20px;
              text-align: center;
              color: #666;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
              <div style="
                width: 80px;
                height: 80px;
                background: #4a90e2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 24px;
                box-shadow: 0 8px 32px rgba(74, 144, 226, 0.3);
              ">
                <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 style="
                margin: 0 0 12px 0;
                font-size: 24px;
                font-weight: 600;
                color: #333;
              ">SQLBot 智能助手</h3>
              <p style="
                margin: 0 0 20px 0;
                font-size: 16px;
                line-height: 1.5;
                color: #666;
                max-width: 400px;
              ">
                SQLBot 服务暂时不可用，但您仍然可以使用其他AI助手功能。
              </p>
              <div style="
                background: rgba(255, 255, 255, 0.8);
                padding: 16px 24px;
                border-radius: 8px;
                border-left: 4px solid #4a90e2;
                margin-top: 20px;
                max-width: 500px;
              ">
                <p style="
                  margin: 0;
                  font-size: 14px;
                  color: #555;
                  line-height: 1.4;
                ">
                  <strong>提示：</strong>请切换到"对话助手"模式继续使用AI功能，或联系管理员配置SQLBot服务。
                </p>
              </div>
            </div>
          `;
        }
      }
    };
  }
};

/**
 * 加载 SQLBot 脚本
 */
const loadSqlbotScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const jsNamePrefix = 'xpack_static/sqlbot-embedded-dynamic.umd.js';
    const existScriptDom = document.querySelector(`script[src*="${jsNamePrefix}"]`);

    if (existScriptDom) {
      isScriptLoaded.value = true;
      resolve();
      return;
    }

    // 验证域名是否可用
    if (!props.domain) {
      log.warn('SQLBot domain not provided, using fallback');
      // 创建一个模拟的SQLBot处理器
      createFallbackHandler();
      isScriptLoaded.value = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.defer = true;
    script.async = true;
    script.src = `${props.domain}/${jsNamePrefix}?t=${Date.now()}`;
    
    script.onload = () => {
      isScriptLoaded.value = true;
      resolve();
    };
    
    script.onerror = () => {
      log.error('Failed to load SQLBot script from:', script.src);
      log.warn('Creating fallback SQLBot handler');
      // 创建降级方案
      createFallbackHandler();
      isScriptLoaded.value = true;
      resolve(); // 不要reject，而是使用降级方案
    };

    document.head.appendChild(script);
  });
};

/**
 * 初始化 SQLBot
 */
const initSqlbot = async () => {
  try {
    // 加载脚本
    await loadSqlbotScript();

    // 等待 SQLBot handler 可用
    let attempts = 0;
    const maxAttempts = 10; // 减少等待时间到10秒

    const checkHandler = () => {
      return new Promise<void>((resolve, reject) => {
        const timer = setInterval(() => {
          attempts++;
          
          if (window.sqlbot_embedded_handler?.mounted) {
            clearInterval(timer);
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(timer);
            log.warn('SQLBot handler not available, using fallback');
            // 如果handler不可用，创建降级方案
            createFallbackHandler();
            resolve(); // 不要reject，继续执行
          }
        }, 1000);
      });
    };

    await checkHandler();

    // 挂载 SQLBot
    if (sqlbotContainer.value && window.sqlbot_embedded_handler?.mounted) {
      try {
        window.sqlbot_embedded_handler.mounted(`.${props.containerClass}`, sqlbotParams.value);
        isMounted.value = true;
        log.debug('SQLBot mounted successfully', sqlbotParams.value);
      } catch (mountError) {
        log.error('Failed to mount SQLBot:', mountError);
        // 挂载失败时也使用降级方案
        createFallbackHandler();
        if (sqlbotContainer.value) {
          window.sqlbot_embedded_handler.mounted(`.${props.containerClass}`, sqlbotParams.value);
          isMounted.value = true;
        }
      }
    }
  } catch (error) {
    log.error('Failed to initialize SQLBot:', error);
    // 初始化失败时使用降级方案
    createFallbackHandler();
    if (sqlbotContainer.value && window.sqlbot_embedded_handler?.mounted) {
      try {
        window.sqlbot_embedded_handler.mounted(`.${props.containerClass}`, sqlbotParams.value);
        isMounted.value = true;
      } catch (fallbackError) {
        log.error('Even fallback failed:', fallbackError);
      }
    }
  }
};

/**
 * 重新初始化 SQLBot（当参数变化时）
 */
const reinitSqlbot = async () => {
  if (isMounted.value && window.sqlbot_embedded_handler?.mounted) {
    try {
      window.sqlbot_embedded_handler.mounted(`.${props.containerClass}`, sqlbotParams.value);
      log.debug('SQLBot reinitialized with new params', sqlbotParams.value);
    } catch (error) {
      log.error('Failed to reinitialize SQLBot:', error);
    }
  }
};

// 监听参数变化
watch(
  () => sqlbotParams.value,
  () => {
    if (isMounted.value) {
      reinitSqlbot();
    }
  },
  { deep: true }
);

// 生命周期钩子
onMounted(() => {
  initSqlbot();
});

onBeforeUnmount(() => {
  isMounted.value = false;
  // 可选：清理 SQLBot 实例
  // 注意：SQLBot 可能没有提供卸载方法，通常页面刷新或跳转会自动释放
});

// 暴露方法给父组件
defineExpose({
  reinit: reinitSqlbot,
  isLoaded: computed(() => isScriptLoaded.value),
  isMounted: computed(() => isMounted.value)
});
</script>

<style scoped>
.sqlbot-embedded-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.sqlbot-full-page {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: none;
  background: transparent;
}

/* 确保 SQLBot 内容能够正确显示 */
.sqlbot-embedded-container :deep(iframe) {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
}

/* 加载状态样式 */
.sqlbot-embedded-container:not(.loaded)::before {
  content: '正在加载 AI 助手...';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--el-text-color-placeholder, #999);
  font-size: 14px;
  z-index: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sqlbot-full-page {
    min-height: 400px;
  }
}

@media (max-width: 480px) {
  .sqlbot-full-page {
    min-height: 350px;
  }
}
</style>
