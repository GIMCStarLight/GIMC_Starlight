<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑 KOL' : '新增 KOL'"
    width="900px"
    :before-close="handleClose"
    destroy-on-close
  >
    <!-- 头部摘要（编辑模式下展示当前 KOL 的关键信息） -->
    <div v-if="isEdit" class="profile-header">
      <div class="avatar">
        <span>{{ (props.kolData?.account_name || '-').slice(0, 1) }}</span>
      </div>
      <div class="info-group">
        <!-- 第一行：昵称 + 粉丝标签 -->
        <div class="info-row">
          <span class="kol-name">{{ props.kolData?.account_name || '-' }}</span>
          <el-tag v-if="props.kolData?.followers_w" size="small" class="category-tag">
            粉丝 {{ props.kolData?.followers_w }} 万
          </el-tag>
        </div>
        <!-- 第二行：ID、机构、平台、达人类型 -->
        <div class="info-row">
          <span class="info-label">ID:</span>
          <span class="info-value">{{ props.kolData?.account_id || '-' }}</span>

          <div class="divider">|</div>

          <span class="info-label">机构名</span>
          <el-tag size="small" class="category-tag">
            <template #icon>
              <el-icon><OfficeBuilding /></el-icon>
            </template>
            {{ props.kolData?.org_name || '暂无机构' }}
          </el-tag>

          <div class="divider">|</div>

          <span class="info-label">平台</span>
          <el-tag size="small" class="category-tag">
               {{ props.kolData?.platform || '-' }}
          </el-tag>

          <div class="divider">|</div>

          <span class="info-label">达人类型</span>
          <el-tag size="small" class="category-tag">
            {{ props.kolData?.category || '未分类' }}
          </el-tag>
        </div>
        <!-- 第四行：主页链接 -->
        <div class="info-row">
          <span class="info-label">主页链接</span>
          <a v-if="props.kolData?.home_link" :href="props.kolData?.home_link" target="_blank" class="link">
            {{ props.kolData?.home_link }}
          </a>
          <span v-else class="info-value">-</span>
        </div>
      </div>
    </div>

    <!-- <el-divider v-if="isEdit" /> -->

    <!-- 唯一性提示（优化样式） -->
    <div v-if="isEdit" class="uniqueness-notice">
      <div class="notice-title">
        <el-icon class="notice-icon"><InfoFilled /></el-icon>
        <span>平台 + 账号ID 为唯一组合，编辑模式下已禁用修改，避免冲突</span>
      </div>
      <div class="notice-divider"></div>
    </div>

    <!-- Vben 表单 -->
    <div class="form-container">
      <Form />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { OfficeBuilding, InfoFilled } from '@element-plus/icons-vue'
import { log } from '../../../utils/logger'
import { KolListApi } from '../../../api/kol-match.api'
import { useVbenForm, z } from '@vben/common-ui'
import type { VbenFormSchema } from '@vben/common-ui'

interface Props {
  modelValue: boolean
  kolData?: any | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'kol-updated'): void
}

const props = withDefaults(defineProps<Props>(), { kolData: null })
const emit = defineEmits<Emits>()

const loading = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.kolData?.id)

// Vben Form Schema 定义
const formSchema = computed((): VbenFormSchema[] => {
  return [
    // ========== 平台和账号ID（不可编辑字段优先显示） ==========
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入平台',
        disabled: true,
      },
      fieldName: 'platform',
      label: '平台',
      rules: z.string().min(1, { message: '请输入平台' }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入账号ID',
        disabled: true,
      },
      fieldName: 'account_id',
      label: '账号ID',
      rules: z.string().min(1, { message: '请输入账号ID' }),
    },
    
    // ========== 基本信息 ==========
    // {
    //   component: 'Divider',
    //   componentProps: {
    //     title: '基本信息',
    //     contentPosition: 'left',
    //   },
    //   fieldName: 'divider1',
    // },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入账号名称',
      },
      fieldName: 'account_name',
      label: '账号名称',
      rules: z.string().min(1, { message: '请输入账号名称' }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入机构名',
      },
      fieldName: 'org_name',
      label: '机构名',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入账号类型',
      },
      fieldName: 'category',
      label: '账号类型',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入主页链接',
      },
      fieldName: 'home_link',
      label: '主页链接',
    },

    // ========== 数据与报价 ==========
    // {
    //   component: 'Divider',
    //   componentProps: {
    //     title: '数据与报价',
    //     contentPosition: 'left',
    //   },
    //   fieldName: 'divider2',
    // },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入粉丝(万)',
        min: 0,
        precision: 2,
        style: { width: '100%' },
      },
      fieldName: 'followers_w',
      label: '粉丝(万)',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '',
        readonly: true,
        style: { width: '100%', visibility: 'hidden', height: '1px', padding: '0', margin: '0' },
      },
      fieldName: 'spacer2',
      label: '',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入报价',
        min: 0,
        style: { width: '100%' },
      },
      fieldName: 'star_quote_21_60s',
      label: '21-60s报价',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入报价',
        min: 0,
        style: { width: '100%' },
      },
      fieldName: 'star_quote_60s_plus',
      label: '60s+报价',
    },

    // ========== 合作信息 ==========
    // {
    //   component: 'Divider',
    //   componentProps: {
    //     title: '合作信息',
    //     contentPosition: 'left',
    //   },
    //   fieldName: 'divider3',
    // },
    {
      component: 'Switch',
      componentProps: {
        activeText: '是',
        inactiveText: '否',
      },
      fieldName: 'is_exclusive',
      label: '是否独家',
      defaultValue: false,
    },
    {
      component: 'Switch',
      componentProps: {
        activeText: '有',
        inactiveText: '无',
      },
      fieldName: 'rebate_policy',
      label: '返点政策',
      defaultValue: false,
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '示例：5%-10%',
      },
      fieldName: 'rebate_range',
      label: '返点区间',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入政策等级',
      },
      fieldName: 'policy_level',
      label: '政策等级',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入返点账期',
      },
      fieldName: 'rebate_period',
      label: '返点账期',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入支付账期',
      },
      fieldName: 'pay_period',
      label: '支付账期',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择配合度',
        options: [
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
      },
      fieldName: 'cooperation_degree',
      label: '配合度',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择资源属性',
        options: [
          { label: '独家', value: 'exclusive' },
          { label: '星光', value: 'sgxm' },
          { label: '其他', value: 'other' },
        ],
      },
      fieldName: 'resource_attribute',
      label: '资源属性',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入年框机构',
      },
      fieldName: 'annual_contract_org',
      label: '年框机构',
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入合作简介',
      },
      fieldName: 'cooperation_intro',
      label: '合作简介',
    },

    // ========== 备注信息 ==========
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入备注信息',
        type: 'textarea',
        rows: 3,
        style: { width: '100%' },
      },
      fieldName: 'remark',
      label: '备注',
      formItemClass: 'full-width-remark',
    },
  ]
})

// 创建 Vben Form
const [Form, formApi] = useVbenForm(
  reactive({
    schema: formSchema,
    wrapperClass: 'grid-cols-1 md:grid-cols-2',
    commonConfig: {
      componentProps: {
        class: 'w-full',
      },
    },
    layout: 'horizontal',
    labelWidth: 100,
    // 禁用 Vben Form 自带的操作按钮（重置和提交）
    showDefaultActions: false,
  })
)

// 监听数据变化，初始化表单
watch(() => props.kolData, (d) => {
  if (!d) {
    formApi.resetForm()
    return
  }
  formApi.setValues({
    platform: d.platform || '',
    account_name: d.account_name || d.accountName || '',
    account_id: d.account_id || d.accountId || '',
    org_name: d.org_name || d.orgName || '',
    category: d.category || '',
    home_link: d.home_link || d.homeLink || '',
    followers_w: d.followers_w ?? d.followersW ?? 0,
    star_quote_21_60s: d.star_quote_21_60s ?? d.starQuote21_60s ?? 0,
    star_quote_60s_plus: d.star_quote_60s_plus ?? d.starQuote60sPlus ?? 0,
    is_exclusive: typeof d.is_exclusive === 'boolean' ? d.is_exclusive : (typeof d.is_exclusive === 'number' ? d.is_exclusive === 1 : (d.isExclusive ? true : false)),
    rebate_policy: Boolean(typeof d.rebate_policy === 'string' ? d.rebate_policy === '1' : (typeof d.rebate_policy === 'number' ? d.rebate_policy === 1 : false)),
    rebate_range: d.rebate_range || d.rebateRange || '',
    policy_level: d.policy_level || d.policyLevel || '',
    rebate_period: d.rebate_period || d.rebatePeriod || '',
    pay_period: d.pay_period || d.payPeriod || '',
    cooperation_degree: d.cooperation_degree || d.cooperationDegree || '',
    resource_attribute: d.resource_attribute || d.resourceAttribute || '',
    annual_contract_org: d.annual_contract_org || d.annualContractOrg || '',
    cooperation_intro: d.cooperation_intro || d.cooperationIntro || '',
    remark: d.remark || ''
  })
}, { immediate: true })

// 提交表单
const handleSubmit = async () => {
  const { valid } = await formApi.validate()
  if (!valid) return

  try {
    loading.value = true
    const values = await formApi.getValues()
    
    // 数据处理逻辑（与原来保持一致）
    const sanitizePayload = (src: any) => {
      const p: any = { ...src }
      
      // 处理 Switch 组件返回值（布尔值转数字）
      if (typeof p.is_exclusive === 'boolean') {
        p.is_exclusive = p.is_exclusive ? 1 : 0
      }
      if (typeof p.rebate_policy === 'boolean') {
        p.rebate_policy = p.rebate_policy ? '1' : '0'  // 后端期望字符串类型
      }
      
      // 处理数字字段类型转换（InputNumber 可能返回字符串）
      if (p.followers_w !== undefined && p.followers_w !== null && p.followers_w !== '') {
        p.followers_w = Number(p.followers_w)
      }
      if (p.star_quote_21_60s !== undefined && p.star_quote_21_60s !== null && p.star_quote_21_60s !== '') {
        p.star_quote_21_60s = Number(p.star_quote_21_60s)
      }
      if (p.star_quote_60s_plus !== undefined && p.star_quote_60s_plus !== null && p.star_quote_60s_plus !== '') {
        p.star_quote_60s_plus = Number(p.star_quote_60s_plus)
      }
      
      // 字段处理配置
      const fieldConfig = {
        setToNull: [
          'rebate_range', 'rebate_period', 'org_name', 'category',
          'policy_level', 'pay_period', 'remark', 'cooperation_intro',
          'annual_contract_org'
        ],
        delete: []
      }

      // 处理主页链接
      if (!p.home_link || String(p.home_link).trim() === '') {
        p.home_link = ''
      } else {
        try {
          const linkStr = String(p.home_link).trim()
          const hasProtocol = /^(https?:)?\/\//i.test(linkStr)
          const normalized = hasProtocol ? linkStr : `https://${linkStr}`
          new URL(normalized)
          p.home_link = normalized
        } catch {
          ElMessage.error('主页链接必须是有效的URL或留空')
          throw new Error('invalid_home_link')
        }
      }

      // 处理需要设置为 null 的字段
      for (const key of fieldConfig.setToNull) {
        if (p[key] !== undefined && String(p[key]).trim() === '') {
          p[key] = null
        }
      }

      return p
    }

    const payload = sanitizePayload(values)
    
    // 编辑模式下，如果平台/账号ID未改动则不提交这两个字段，避免无意义的唯一性检查
    if (isEdit.value && props.kolData) {
      if (payload.platform === props.kolData.platform) {
        delete payload.platform
      }
      if (payload.account_id === (props.kolData.account_id || props.kolData.accountId)) {
        delete payload.account_id
      }
      
    }
    
    log.debug('提交payload:', payload)

    if (isEdit.value && props.kolData?.id) {
      const id = typeof props.kolData.id === 'string' ? parseInt(props.kolData.id) : props.kolData.id
      await KolListApi.updateKol(id, payload)
      ElMessage.success('KOL 信息已更新')
    } else {
      await KolListApi.createKol(payload)
      ElMessage.success('KOL 已创建')
    }
    emit('kol-updated')
    handleClose()
  } catch (e: any) {
    log.error('保存 KOL 失败:', e)
    ElMessage.error(`保存失败: ${e?.message || '请稍后重试'}`)
  } finally {
    loading.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  formApi.resetForm()
  visible.value = false
}
</script>

<style scoped>
/* 头部信息样式（与KolDetailDialog保持一致） */
.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #fcfcfd;
  border: 1px solid #eef2f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 22px;
  flex-shrink: 0;
}

.info-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.divider {
  color: #d9d9d9;
  font-size: 16px;
  margin: 0 4px;
  user-select: none;
}

.info-row:first-child {
  margin-bottom: 4px;
}

.kol-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-right: 4px;
}

.info-label {
  color: #909399;
  font-size: 13px;
}

.info-value {
  color: #606266;
  font-size: 13px;
}

.followers-tag {
  background: #f0f9ff;
  color: #10b981;
  border-color: #d1fae5;
  font-weight: 500;
}

.org-tag {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #dbeafe;
}

.type-tags {
  background: #fef3c7;
  color: #d97706;
  border-color: #fde68a;
}

.category-tag {
  background: #f3f4f6;
  color: #6b7280;
  border-color: #e5e7eb;
}

.link {
  color: #409eff;
  text-decoration: none;
  font-size: 13px;
}

.link:hover {
  text-decoration: underline;
}

/* 分割线样式 */
:deep(.el-divider--horizontal) {
  margin: 16px 0;
}

.uniqueness-notice {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 8px;
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
}

.notice-icon {
  font-size: 16px;
}

.notice-divider {
  height: 1px;
  background: linear-gradient(to right, #1890ff, transparent);
  width: 100%;
}

.form-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #fcfcfd;
  border: 1px solid #eef2f6;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.section-title {
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  padding-left: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  /* border-bottom: 2px solid #e4e7ed; */
  position: relative;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 20px;
  border-radius: 2px;
  background: #409eff;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-form-item) {
  margin-bottom: 14px;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-textarea__inner) {
  box-shadow: 0 1px 2px rgba(0,0,0,0.02) inset;
}

/* 强制备注字段占满整行 */
:deep(.full-width-remark) {
  grid-column: 1 / -1 !important;
}

/* 表单容器粉色背景 */
.form-container {
  /* background-color: pink !important; */
  padding-right: 40px !important;
}

</style>