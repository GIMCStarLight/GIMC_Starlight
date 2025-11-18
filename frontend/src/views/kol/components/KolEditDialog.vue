<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑 KOL' : '新增 KOL'"
    width="860px"
    :before-close="handleClose"
    destroy-on-close
  >
    <!-- 头部摘要（编辑模式下展示当前 KOL 的关键信息） -->
    <div v-if="isEdit" class="dialog-header-summary">
      <div class="summary-left">
        <div class="summary-title">
          <span class="summary-name">{{ props.kolData?.account_name || '-' }}</span>
          <el-tag size="small" type="info" class="summary-platform">{{ props.kolData?.platform || '-' }}</el-tag>
          <el-tag v-if="props.kolData?.followers_w" size="small" type="success" class="summary-followers">
            粉丝 {{ props.kolData?.followers_w }} 万
          </el-tag>
        </div>
        <div class="summary-sub">
          <span class="summary-id">ID：{{ props.kolData?.account_id || '-' }}</span>
          <el-divider direction="vertical" />
          <span class="summary-org">机构：{{ props.kolData?.org_name || '-' }}</span>
        </div>
      </div>
      <div class="summary-right">
        <a v-if="props.kolData?.home_link" :href="props.kolData?.home_link" target="_blank" class="link">访问主页</a>
      </div>
    </div>

    <!-- 唯一性提示 -->
    <el-alert
      v-if="isEdit"
      type="info"
      title="平台 + 账号ID 为唯一组合，编辑模式下已禁用修改，避免冲突"
      :closable="false"
      show-icon
      class="uniqueness-alert"
    />

    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      label-position="left"
      size="small"
    >
      <el-row :gutter="16">
        <!-- 基本信息（与数据库字段对齐） -->
        <el-col :span="24">
          <div class="form-section">
            <h4 class="section-title">基本信息</h4>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="平台" prop="platform">
                  <el-input v-model="formData.platform" :disabled="isEdit" placeholder="请输入平台" clearable />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="账号名称" prop="account_name">
                  <el-input v-model="formData.account_name" placeholder="请输入账号名称" clearable />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="账号ID" prop="account_id">
                  <el-input v-model="formData.account_id" :disabled="isEdit" placeholder="请输入账号ID" clearable />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="机构名" prop="org_name">
                  <el-input v-model="formData.org_name" placeholder="请输入机构名" clearable />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="账号类型" prop="category">
                  <el-input v-model="formData.category" placeholder="请输入账号类型" clearable />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="主页链接" prop="home_link">
                  <el-input v-model="formData.home_link" placeholder="请输入主页链接" clearable />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-col>

        <!-- 数据与报价 -->
        <el-col :span="24">
          <div class="form-section">
            <h4 class="section-title">数据与报价</h4>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="粉丝(万)" prop="followers_w">
                  <el-input-number v-model="formData.followers_w" :min="0" :precision="2" style="width: 100%" placeholder="请输入粉丝(万)" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="21-60s报价" prop="star_quote_21_60s">
                  <el-input-number v-model="formData.star_quote_21_60s" :min="0" style="width: 100%" placeholder="请输入报价" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="60s+报价" prop="star_quote_60s_plus">
                  <el-input-number v-model="formData.star_quote_60s_plus" :min="0" style="width: 100%" placeholder="请输入报价" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-col>

        <!-- 合作信息 -->
        <el-col :span="24">
          <div class="form-section">
            <h4 class="section-title">合作信息</h4>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="是否独家" prop="is_exclusive">
                  <el-switch v-model="exclusiveSwitch" active-text="是" inactive-text="否" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="返点政策" prop="rebate_policy">
                  <el-switch v-model="rebateSwitch" active-text="有" inactive-text="无" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="返点区间" prop="rebate_range">
                  <el-input v-model="formData.rebate_range" placeholder="示例：5%-10%" clearable />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="政策等级" prop="policy_level">
                  <el-input v-model="formData.policy_level" placeholder="请输入政策等级" clearable />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="返点账期" prop="rebate_period">
                  <el-input v-model="formData.rebate_period" placeholder="请输入返点账期" clearable />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="支付账期" prop="pay_period">
                  <el-input v-model="formData.pay_period" placeholder="请输入支付账期" clearable />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="配合度" prop="cooperation_degree">
                  <el-select v-model="formData.cooperation_degree" placeholder="请选择配合度" style="width: 100%" clearable>
                    <el-option label="高" value="high" />
                    <el-option label="中" value="medium" />
                    <el-option label="低" value="low" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="资源属性" prop="resource_attribute">
                  <el-select v-model="formData.resource_attribute" placeholder="请选择资源属性" style="width: 100%" clearable>
                    <el-option label="独家" value="exclusive" />
                    <el-option label="星光" value="sgxm" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="年框机构" prop="annual_contract_org">
                  <el-input v-model="formData.annual_contract_org" placeholder="请输入年框机构" clearable />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="合作简介" prop="cooperation_intro">
                  <el-input v-model="formData.cooperation_intro" placeholder="请输入合作简介" clearable />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-col>

        <!-- 备注信息 -->
        <el-col :span="24">
          <div class="form-section">
            <h4 class="section-title">备注信息</h4>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
            </el-form-item>
          </div>
        </el-col>
      </el-row>
    </el-form>

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
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { log } from '../../../utils/logger'
import { KolListApi } from '../../../api/kol-match.api'

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

const formRef = ref<FormInstance>()
const loading = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.kolData?.id)

// 与数据库字段对齐的表单数据（snake_case）
const formData = reactive({
  platform: '',
  account_name: '',
  account_id: '',
  org_name: '',
  category: '',
  home_link: '',
  followers_w: 0,
  star_quote_21_60s: 0,
  star_quote_60s_plus: 0,
  is_exclusive: 0,
  rebate_policy: 0,
  rebate_range: '',
  policy_level: '',
  rebate_period: '',
  pay_period: '',
  cooperation_degree: '',
  resource_attribute: '',
  annual_contract_org: '',
  cooperation_intro: '',
  remark: ''
})

// 开关映射（后端字段为 number 0/1）
const exclusiveSwitch = computed({
  get: () => formData.is_exclusive === 1,
  set: (val: boolean) => { formData.is_exclusive = val ? 1 : 0 }
})

const rebateSwitch = computed({
  get: () => formData.rebate_policy === 1,
  set: (val: boolean) => { formData.rebate_policy = val ? 1 : 0 }
})

// 表单验证规则（关键字段）
const formRules: FormRules = {
  platform: [{ required: true, message: '请输入平台', trigger: 'blur' }],
  account_name: [{ required: true, message: '请输入账号名称', trigger: 'blur' }],
  account_id: [
    { required: true, message: '请输入账号ID', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const idStr = String(value || '').trim()
        const nameStr = String(formData.account_name || '').trim()
        if (idStr && nameStr && idStr === nameStr) {
          callback(new Error('账号ID不能与账号名称相同，请填写唯一ID'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    platform: '',
    account_name: '',
    account_id: '',
    org_name: '',
    category: '',
    home_link: '',
    followers_w: 0,
    star_quote_21_60s: 0,
    star_quote_60s_plus: 0,
    is_exclusive: 0,
    rebate_policy: 0,
    rebate_range: '',
    policy_level: '',
    rebate_period: '',
    pay_period: '',
    cooperation_degree: '',
    resource_attribute: '',
    annual_contract_org: '',
    cooperation_intro: '',
    remark: ''
  })
  formRef.value?.clearValidate()
}

// 兼容 camelCase 的旧类型，初始化表单数据
watch(() => props.kolData, (d) => {
  if (!d) { resetForm(); return }
  Object.assign(formData, {
    platform: d.platform || '',
    account_name: d.account_name || d.accountName || '',
    account_id: d.account_id || d.accountId || '',
    org_name: d.org_name || d.orgName || '',
    category: d.category || '',
    home_link: d.home_link || d.homeLink || '',
    followers_w: d.followers_w ?? d.followersW ?? 0,
    star_quote_21_60s: d.star_quote_21_60s ?? d.starQuote21_60s ?? 0,
    star_quote_60s_plus: d.star_quote_60s_plus ?? d.starQuote60sPlus ?? 0,
    is_exclusive: typeof d.is_exclusive === 'number' ? d.is_exclusive : (d.isExclusive ? 1 : 0),
    rebate_policy: typeof d.rebate_policy === 'number' ? d.rebate_policy : (d.rebatePolicy ? 1 : 0),
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

// 提交表单（与数据库字段对齐，并调用后端接口）
const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    loading.value = true
    // 构造提交数据，移除空字符串字段，避免后端 Length/Url 校验报错
    const sanitizePayload = (src: typeof formData) => {
      const p: any = { ...src }
      const emptyToUndefined = [
        'org_name',
        'category',
        'rebate_range',
        'policy_level',
        'rebate_period',
        'pay_period',
        'remark',
        'cooperation_intro',
        'annual_contract_org'
      ]
      for (const key of emptyToUndefined) {
        if (p[key] !== undefined && String(p[key]).trim() === '') {
          delete p[key]
        }
      }
      // 主页链接：留空则不传；非空时需为有效URL
      if (!p.home_link || String(p.home_link).trim() === '') {
        delete p.home_link
      } else {
        try {
          // 如果遗漏协议，尝试自动补全为 https
          const linkStr = String(p.home_link).trim()
          const hasProtocol = /^(https?:)?\/\//i.test(linkStr)
          const normalized = hasProtocol ? linkStr : `https://${linkStr}`
          // 检验URL有效性
          // eslint-disable-next-line no-new
          new URL(normalized)
          p.home_link = normalized
        } catch {
          ElMessage.error('主页链接必须是有效的URL或留空')
          throw new Error('invalid_home_link')
        }
      }
      return p
    }

    const payload = sanitizePayload(formData)
    // 编辑模式下，如果平台/账号ID未改动则不提交这两个字段，避免无意义的唯一性检查
    if (isEdit.value && props.kolData) {
      if (payload.platform === props.kolData.platform) delete payload.platform
      if (payload.account_id === props.kolData.account_id) delete payload.account_id
      // 额外保护：账号ID与账号名称相同时直接提示
      if (
        String(payload.account_id || '').trim() &&
        String(payload.account_name || '').trim() &&
        String(payload.account_id).trim() === String(payload.account_name).trim()
      ) {
        ElMessage.error('账号ID不能与账号名称相同，请填写唯一ID')
        throw new Error('invalid_account_id')
      }
    }
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
  resetForm()
  visible.value = false
}
</script>

<style scoped>
.dialog-header-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 16px 0;
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.summary-sub {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
}

.summary-right {
  display: flex;
  align-items: center;
}

.uniqueness-alert {
  margin-bottom: 12px;
}

.form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fcfcfd;
  border: 1px solid #eef2f6;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.section-title {
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  position: relative;
}

.section-title::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 2px;
  width: 4px;
  height: 16px;
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
</style>