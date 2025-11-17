<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import { log } from '#/utils/logger';

import { computed, markRaw } from 'vue';

import { AuthenticationLogin, SliderCaptcha, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.mobile'),
        type: 'tel',
      },
      fieldName: 'phone',
      label: $t('authentication.mobile'),
      rules: z.string().min(11, { message: $t('authentication.mobileTip') }).regex(/^1[3-9]\d{9}$/, { message: $t('authentication.mobileErrortip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: markRaw(SliderCaptcha),
      fieldName: 'captcha',
      rules: z.boolean().refine((value) => value, {
        message: $t('authentication.verifyRequiredTip'),
      }),
    },
  ];
});

// 添加登录处理函数
async function handleLogin(values: any) {
  // 处理登录表单提交

  // 只发送手机号和密码，移除其他字段
  const loginData = {
    phone: values.phone,
    password: values.password,
  };
  
  // 发送登录请求
  try {
    await authStore.authLogin(loginData);
    // 登录成功，authStore中已经处理了成功通知和跳转
  } catch (error: any) {
    // 登录失败，显示错误提示
    log.error('登录失败:', error);
    
    // 提取错误信息
    const errorMessage = error?.response?.data?.message || 
                        error?.message || 
                        '登录失败，请检查账号和密码';
    
    // 显示错误提示
    ElMessage.error(errorMessage);
  }
}
</script>

<template>
  <div class="login-container">
    <!-- 登录页顶部欢迎文案临时停用 -->
    <!-- <div class="login-header">
      <h1 class="login-title">欢迎回来！</h1>
      <p class="login-subtitle">请使用您的手机号和密码登录系统</p>
    </div> -->
    
    <AuthenticationLogin
      :form-schema="formSchema"
      :loading="authStore.loginLoading"
      :show-remember-me="false"
      :show-forget-password="false"
      :show-code-login="false"
      :show-qrcode-login="false"
      :show-register="false"
      :show-third-party-login="false"
      title=""
      sub-title=""
      @submit="handleLogin"
    />
    
    <!-- 底部提示与其他登录方式临时停用 -->
    <!-- <div class="login-footer">
      <p class="login-tip">
        💡 登录后系统将根据您的账户权限自动配置可访问的功能
      </p>
    </div> -->
  </div>
</template>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.login-subtitle {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.login-footer {
  margin-top: 2rem;
  text-align: center;
}

.login-tip {
  color: #6b7280;
  font-size: 0.75rem;
  margin: 0;
  padding: 0.75rem;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
}
</style>
