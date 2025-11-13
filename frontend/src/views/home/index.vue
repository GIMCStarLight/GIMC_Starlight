<template>
  <div class="home-container">
    <div class="home-content">
      <div class="home-header">
        <h1 class="home-title">首页测试</h1>
        <p class="home-subtitle">欢迎来到系统首页</p>
      </div>
      
      <div class="home-body">
        <div class="welcome-card">
          <div class="card-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="card-content">
            <h3>系统首页</h3>
            <p>这是一个测试首页，用于验证菜单功能是否正常工作。</p>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">当前时间</div>
            <div class="info-value">{{ currentTime }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">页面状态</div>
            <div class="info-value">正常运行</div>
          </div>
          <div class="info-item">
            <div class="info-label">系统版本</div>
            <div class="info-value">v1.0.0</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';

// 当前时间
const currentTime = ref<string>('');

// 更新时间
const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.home-content {
  max-width: 1200px;
  margin: 0 auto;
}

.home-header {
  text-align: center;
  margin-bottom: 48px;
  color: white;
}

.home-title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.home-subtitle {
  font-size: 1.25rem;
  margin: 0;
  opacity: 0.9;
}

.home-body {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.welcome-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 24px;
}

.card-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.card-content h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.card-content p {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.info-item {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.info-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 500;
}

.info-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

@media (max-width: 768px) {
  .home-container {
    padding: 16px;
  }
  
  .home-title {
    font-size: 2rem;
  }
  
  .welcome-card {
    flex-direction: column;
    text-align: center;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>