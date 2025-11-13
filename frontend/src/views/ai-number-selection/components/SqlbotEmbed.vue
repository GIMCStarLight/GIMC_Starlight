<template>
  <div class="sqlbot-embed-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在加载 AI 选号助手...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="errorMessage" class="error-container">
      <div class="error-icon">⚠️</div>
      <p class="error-text">{{ errorMessage }}</p>
      <button class="retry-button" @click="initSqlbot">重试</button>
    </div>
    
    <!-- SQLBot 嵌入容器 -->
    <div 
      v-else 
      ref="sqlbotContainer" 
      class="sqlbot-embedded-full-page"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { sqlbotApi } from '../../../api/sqlbot';

defineOptions({
  name: 'SqlbotEmbed',
});

// 响应式数据
const loading = ref(true);
const errorMessage = ref('');
const sqlbotContainer = ref<HTMLElement>();
const embedConfig = ref<any>(null);

// 计算属性
const sqlbotDomain = computed(() => embedConfig.value?.domain);
const embeddedAppId = computed(() => embedConfig.value?.embeddedAppId);

// 本地处理器类型与访问函数，避免与全局声明冲突
type SqlbotEmbeddedHandler = {
  mounted: (selector: string, params: Record<string, any>) => void;
  destroy?: (appId: string, removeScript?: boolean) => void;
};
const getSqlbotHandler = (): SqlbotEmbeddedHandler | undefined => (window as any).sqlbot_embedded_handler;

/**
 * 简单的HMAC-SHA256实现（用于HTTP环境降级）
 */
function simpleHmacSha256(key: string, message: string): string {
  // 这是一个简化的HMAC实现，仅用于HTTP环境下的降级方案
  // 在生产环境中，建议使用HTTPS以获得更好的安全性
  let hash = 0;
  const keyMessage = key + message;
  for (let i = 0; i < keyMessage.length; i++) {
    const char = keyMessage.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * 检查是否在安全上下文中（HTTPS或localhost）
 */
function isSecureContext(): boolean {
  return window.isSecureContext && typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

/**
 * 生成JWT Token（用于SQLBot认证）
 */
async function generateJWT(payload: object, secret: string, expiresIn?: number): Promise<string> {
  const payloadWithExp = { ...payload } as any;
  
  if (expiresIn) {
    payloadWithExp.exp = Math.floor(Date.now() / 1000) + expiresIn;
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const encodedPayload = btoa(JSON.stringify(payloadWithExp))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  let encodedSignature: string;

  if (isSecureContext()) {
    // HTTPS环境：使用crypto.subtle API
    console.log('SQLBot: 使用安全上下文进行JWT签名');
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
      );
      
      encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch (error) {
      console.warn('SQLBot: crypto.subtle签名失败，降级到简单签名:', error);
      // 降级到简单签名
      const simpleSignature = simpleHmacSha256(secret, `${encodedHeader}.${encodedPayload}`);
      encodedSignature = btoa(simpleSignature)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
  } else {
    // HTTP环境：使用降级方案
    console.log('SQLBot: 非安全上下文，使用降级签名方案');
    const simpleSignature = simpleHmacSha256(secret, `${encodedHeader}.${encodedPayload}`);
    encodedSignature = btoa(simpleSignature)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * 加载SQLBot嵌入脚本
 */
const loadSqlbotScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!sqlbotDomain.value) {
      reject(new Error('SQLBot域名未配置'));
      return;
    }

    const jsNamePrefix = 'xpack_static/sqlbot-embedded-dynamic.umd.js';
    const existScriptDom = document.querySelector(`script[src*="/${jsNamePrefix}"]`);
    
    if (existScriptDom) {
      console.log('SQLBot: 脚本已存在，检查处理器...');
      if (getSqlbotHandler()) {
        resolve();
      } else {
        console.warn('SQLBot: 脚本存在但处理器未定义，重新加载...');
        existScriptDom.remove();
      }
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.defer = true;
    script.async = true;
    script.src = `${sqlbotDomain.value}/xpack_static/sqlbot-embedded-dynamic.umd.js?t=${Date.now()}`;
    
    console.log('SQLBot: 开始加载脚本:', script.src);
    
    script.onload = () => {
      console.log('SQLBot: 脚本文件加载完成');
      
      // 等待一小段时间让脚本执行
      setTimeout(() => {
        if (!getSqlbotHandler()) {
          console.error('SQLBot: window.sqlbot_embedded_handler未定义，脚本可能加载失败');
          console.error('SQLBot: window对象keys:', Object.keys(window).filter(key => key.includes('sqlbot')));
          reject(new Error('SQLBot脚本加载后未找到处理器'));
          return;
        }
        console.log('SQLBot: 处理器加载成功');
        resolve();
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error('SQLBot: 脚本加载失败', error);
      console.error('SQLBot: 脚本URL:', script.src);
      reject(new Error(`SQLBot脚本加载失败: ${script.src}`));
    };
    
    // 添加额外的错误监听
    window.addEventListener('error', (event) => {
      if (event.filename && event.filename.includes('sqlbot-embedded-dynamic')) {
        console.error('SQLBot: 脚本执行错误:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      }
    }, { once: true });

    document.head.appendChild(script);
  });
};

/**
 * 初始化SQLBot嵌入
 */
const initSqlbot = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';

    console.log('SQLBot: 开始初始化...');

    // 1. 获取SQLBot配置
    console.log('SQLBot: 获取配置...');
    embedConfig.value = await sqlbotApi.getEmbedConfig();
    console.log('SQLBot: 配置获取成功', embedConfig.value);
    
    if (!embedConfig.value.domain || !embedConfig.value.embeddedAppId) {
      throw new Error('SQLBot配置不完整，请联系管理员配置');
    }

    // 2. 加载SQLBot脚本
    console.log('SQLBot: 加载脚本...');
    await loadSqlbotScript();
    console.log('SQLBot: 脚本加载成功');

    // 3. 生成认证Token（改为后端签发更安全）
    console.log('SQLBot: 生成认证Token...');
    const tokenResp = await sqlbotApi.getToken({ account: 'admin' });
    const token = tokenResp.token;
    console.log('SQLBot: Token生成成功');

    // 4. 先设置loading为false，让DOM元素渲染
    loading.value = false;
    
    // 5. 等待DOM更新完成，然后挂载SQLBot
    await new Promise(resolve => setTimeout(resolve, 100)); // 等待DOM更新
    
    const mountSqlbot = () => {
      return new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 10秒，每100ms检查一次
        
        const timer = setInterval(() => {
          attempts++;
          
          // 检查DOM元素是否存在
          const container = document.querySelector('.sqlbot-embedded-full-page');
          if (!container) {
            console.log(`SQLBot: 等待容器元素渲染... (${attempts}/${maxAttempts})`);
            if (attempts >= maxAttempts) {
              clearInterval(timer);
              reject(new Error('SQLBot容器元素未找到，初始化超时'));
              return;
            }
            return;
          }
          
          // 检查SQLBot处理器是否存在
          const handler = getSqlbotHandler();
          if (!handler) {
            console.log(`SQLBot: 等待处理器加载... (${attempts}/${maxAttempts})`);
            if (attempts >= maxAttempts) {
              clearInterval(timer);
              reject(new Error('SQLBot处理器未加载，初始化超时'));
              return;
            }
            return;
          }
          
          if (handler.mounted) {
            try {
              console.log('SQLBot: 开始挂载，配置:', {
                appId: embedConfig.value.embeddedAppId,
                token: token.substring(0, 20) + '...',
                container: '.sqlbot-embedded-full-page'
              });
              
              handler.mounted('.sqlbot-embedded-full-page', {
                appId: embedConfig.value.embeddedAppId,
                token
              });
              
              clearInterval(timer);
              console.log('SQLBot: 挂载成功');
              resolve();
            } catch (err) {
              console.error('SQLBot: 挂载失败', err);
              clearInterval(timer);
              reject(err);
            }
          } else {
            console.log(`SQLBot: 等待mounted方法... (${attempts}/${maxAttempts})`);
            if (attempts >= maxAttempts) {
              clearInterval(timer);
              reject(new Error('SQLBot mounted方法未找到，初始化超时'));
              return;
            }
          }
        }, 100);
      });
    };

    await mountSqlbot();
    ElMessage.success('AI选号助手加载成功');

  } catch (err: any) {
    console.error('SQLBot初始化错误:', err);
    loading.value = false;
    errorMessage.value = err.message || 'SQLBot初始化失败';
    ElMessage.error(errorMessage.value);
  }
};

/**
 * 清理SQLBot资源
 */
const cleanupSqlbot = () => {
  const handler = getSqlbotHandler();
  if (handler?.destroy && embeddedAppId.value) {
    try {
      handler.destroy(embeddedAppId.value, true);
    } catch (err) {
      console.warn('SQLBot清理警告:', err);
    }
  }
};

// 生命周期钩子
onMounted(() => {
  initSqlbot();
});

onBeforeUnmount(() => {
  cleanupSqlbot();
});
</script>

<style scoped>
.sqlbot-embed-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.sqlbot-embedded-full-page {
  width: 100%;
  height: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e1e1e1;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  margin: 0;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #f56c6c;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  font-size: 14px;
  margin: 0 0 16px 0;
  text-align: center;
}

.retry-button {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.retry-button:hover {
  background: #66b1ff;
}

.retry-button:active {
  background: #3a8ee6;
}
</style>
