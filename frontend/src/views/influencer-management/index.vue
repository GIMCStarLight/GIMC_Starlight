<template>
  <div class="influencer-management-page">
    <!-- 头部tab切换 -->
    <el-tabs v-model="activeTab" class="management-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="星链计划达人" name="starlink" />
      <el-tab-pane label="省广星媒独家签约达人" name="starmedia" />
    </el-tabs>

    <!-- 星链计划达人表格 -->
    <div v-if="activeTab === 'starlink'" class="table-container">
      <el-table
        v-loading="starlinkLoading"
        :data="starlinkData"
        border
        stripe
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="id" label="ID" width="70" fixed />
        <el-table-column prop="kolSerialNumber" label="序号" width="80" fixed />
        <el-table-column prop="nickname" label="昵称" width="120" show-overflow-tooltip fixed />
        <el-table-column prop="primaryPlatform" label="主发平台" width="100" />
        <el-table-column prop="accountCategory" label="账号类型" width="120" show-overflow-tooltip />
        <el-table-column prop="fansCount" label="粉丝量(万)" width="110" align="right">
          <template #default="{ row }">
            {{ row.fansCount ? Number(row.fansCount).toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="报价信息" align="center">
          <el-table-column prop="price1To20s" label="1-20s" width="100" align="right">
            <template #default="{ row }">
              {{ row.price1To20s ? Number(row.price1To20s).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="price21To60s" label="21-60s" width="100" align="right">
            <template #default="{ row }">
              {{ row.price21To60s ? Number(row.price21To60s).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="price60sPlus" label="60s+" width="100" align="right">
            <template #default="{ row }">
              {{ row.price60sPlus ? Number(row.price60sPlus).toLocaleString() : '-' }}
            </template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="返点信息" align="center">
          <el-table-column prop="minRebateRate" label="最低%" width="85" align="right">
            <template #default="{ row }">
              {{ row.minRebateRate || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="maxRebateRate" label="最高%" width="85" align="right">
            <template #default="{ row }">
              {{ row.maxRebateRate || '-' }}
            </template>
          </el-table-column>
        </el-table-column>
        <el-table-column prop="hasGuaranteedMetrics" label="保数据" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.hasGuaranteedMetrics ? 'success' : 'info'" size="small">
              {{ row.hasGuaranteedMetrics ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="currentOrderCount" label="累计订单" width="95" align="right" />
        <el-table-column prop="secondHalfOrderCount" label="下半年订单" width="105" align="right" />
        <el-table-column prop="contentStyle" label="内容风格" width="120" show-overflow-tooltip />
        <el-table-column prop="targetAudience" label="目标受众" width="120" show-overflow-tooltip />
        <el-table-column prop="cooperationIndustries" label="合作行业" width="120" show-overflow-tooltip />
        <el-table-column prop="allPlatforms" label="全网平台" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click.stop="handleEdit(row, 'starlink')">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click.stop="handleDelete(row, 'starlink')">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="starlinkPage"
        v-model:page-size="starlinkLimit"
        :total="starlinkTotal"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadStarlinkData"
        @size-change="handleStarlinkSizeChange"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </div>

    <!-- 省广星媒独家签约达人表格 -->
    <div v-else-if="activeTab === 'starmedia'" class="table-container">
      <el-table
        v-loading="starmediaLoading"
        :data="starmediaData"
        border
        stripe
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="id" label="ID" width="70" fixed />
        <el-table-column prop="influencerSerialNumber" label="序号" width="80" fixed />
        <el-table-column prop="nickname" label="昵称" width="120" show-overflow-tooltip fixed />
        <el-table-column prop="accountId" label="账号ID" width="150" show-overflow-tooltip />
        <el-table-column prop="influencerOverview" label="达人概况" width="150" show-overflow-tooltip />
        <el-table-column prop="affiliatedOrganization" label="所属机构" width="120" />
        <el-table-column prop="influencerCategory" label="达人类型" width="120" show-overflow-tooltip />
        <el-table-column prop="totalFans" label="主平台粉丝量(万)" width="140" align="right">
          <template #default="{ row }">
            {{ row.totalFans ? Number(row.totalFans).toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="合同信息" align="center">
          <el-table-column prop="contractStatus" label="签约进度" width="130" show-overflow-tooltip />
          <el-table-column prop="contractPeriod" label="合同周期" width="110" show-overflow-tooltip />
          <el-table-column prop="contractMonths" label="合同月数" width="95" align="right" />
          <el-table-column prop="contractRebateRate" label="签约返点%" width="105" align="right">
            <template #default="{ row }">
              {{ row.contractRebateRate || '-' }}
            </template>
          </el-table-column>
        </el-table-column>
        <el-table-column prop="contractStartDate" label="合同开始" width="110">
          <template #default="{ row }">
            {{ row.contractStartDate || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="contractEndDate" label="合同结束" width="110">
          <template #default="{ row }">
            {{ row.contractEndDate || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="platformAccounts" label="平台账号" width="150" show-overflow-tooltip />
        <el-table-column prop="allPlatforms" label="全网平台" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click.stop="handleEdit(row, 'starmedia')">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click.stop="handleDelete(row, 'starmedia')">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="starmediaPage"
        v-model:page-size="starmediaLimit"
        :total="starmediaTotal"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadStarmediaData"
        @size-change="handleStarmediaSizeChange"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="`编辑${activeTab === 'starlink' ? '星链计划达人' : '省广星媒独家签约达人'}`"
      width="70%"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" label-width="140px" :rules="formRules" ref="editFormRef">
        <!-- 星链计划达人表单 -->
        <template v-if="activeTab === 'starlink'">
          <el-divider content-position="left">基本信息</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="昵称" prop="nickname">
                <el-input v-model="editForm.nickname" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="主发平台">
                <el-input v-model="editForm.primaryPlatform" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="账号类型">
                <el-input v-model="editForm.accountCategory" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="粉丝量(万)" prop="fansCount">
                <el-input-number v-model="editForm.fansCount" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="达人链接">
                <el-input v-model="editForm.profileUrl" placeholder="https://..." />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="星图主页链接">
                <el-input v-model="editForm.starPlatformUrl" placeholder="https://..." />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">报价信息</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="1-20s视频报价">
                <el-input-number v-model="editForm.price1To20s" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="21-60s视频报价">
                <el-input-number v-model="editForm.price21To60s" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="60s+视频报价">
                <el-input-number v-model="editForm.price60sPlus" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">政策与返点</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="最低返点%" prop="minRebateRate">
                <el-input-number v-model="editForm.minRebateRate" :min="0" :max="100" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="最高返点%" prop="maxRebateRate">
                <el-input-number v-model="editForm.maxRebateRate" :min="0" :max="100" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否保数据">
                <el-switch v-model="editForm.hasGuaranteedMetrics" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="政策档位总结">
            <el-input v-model="editForm.policyTiersSummary" placeholder="政策档位简要说明" />
          </el-form-item>
          <el-form-item label="政策档位详情">
            <div class="policy-tiers-editor">
              <!-- 政策档位表格 -->
              <el-table :data="policyTiersData" border style="width: 100%; margin-bottom: 10px">
                <el-table-column label="订单范围" width="150">
                  <template #default="{ row, $index }">
                    <el-input v-model="row.order_range" placeholder="例如：1-3 或 8+" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="最小订单" width="120">
                  <template #default="{ row, $index }">
                    <el-input-number v-model="row.order_min" :min="0" size="small" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="最大订单" width="120">
                  <template #default="{ row, $index }">
                    <el-input-number v-model="row.order_max" :min="0" size="small" style="width: 100%" placeholder="无上限留空" />
                  </template>
                </el-table-column>
                <el-table-column label="返点率%" width="120">
                  <template #default="{ row, $index }">
                    <el-input-number v-model="row.rebate_rate" :min="0" :max="100" :precision="2" size="small" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="CPM" width="120">
                  <template #default="{ row, $index }">
                    <el-input-number v-model="row.cpm" :min="0" :precision="2" size="small" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="CPE" width="120">
                  <template #default="{ row, $index }">
                    <el-input-number v-model="row.cpe" :min="0" :precision="2" size="small" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" fixed="right">
                  <template #default="{ row, $index }">
                    <el-button type="danger" size="small" @click="removePolicyTier($index)" :icon="Delete">
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-button type="primary" size="small" @click="addPolicyTier" :icon="Plus">添加档位</el-button>
            </div>
          </el-form-item>
          <el-form-item label="政策备注">
            <el-input v-model="editForm.policyRemarks" type="textarea" :rows="2" />
          </el-form-item>

          <el-divider content-position="left">订单信息</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="当前累计订单数">
                <el-input-number v-model="editForm.currentOrderCount" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="下半年接单次数">
                <el-input-number v-model="editForm.secondHalfOrderCount" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">达人介绍</el-divider>
          <el-form-item label="达人简介">
            <el-input v-model="editForm.kolIntroduction" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="成就亮点">
            <el-input v-model="editForm.achievementHighlights" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="排名信息">
            <el-input v-model="editForm.rankingInfo" />
          </el-form-item>

          <el-divider content-position="left">内容与受众</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="内容风格">
                <el-input v-model="editForm.contentStyle" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="目标受众">
                <el-input v-model="editForm.targetAudience" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="内容优势">
            <el-input v-model="editForm.contentAdvantages" type="textarea" :rows="2" />
          </el-form-item>

          <el-divider content-position="left">合作与平台</el-divider>
          <el-form-item label="合作平台">
            <el-input v-model="editForm.collaborationPlatforms" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="分发平台">
            <el-input v-model="editForm.distributionPlatforms" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="分发规则">
            <el-input v-model="editForm.distributionRules" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="特殊福利">
            <el-input v-model="editForm.specialBenefits" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="全网平台">
            <el-input v-model="editForm.allPlatforms" />
          </el-form-item>

          <el-divider content-position="left">合作历史</el-divider>
          <el-form-item label="合作行业">
            <el-input v-model="editForm.cooperationIndustries" />
          </el-form-item>
          <el-form-item label="历史合作品牌">
            <el-input v-model="editForm.pastCooperationBrands" type="textarea" :rows="3" />
          </el-form-item>

          <el-divider content-position="left">荣誉与资质</el-divider>
          <el-form-item label="认证信息">
            <el-input v-model="editForm.certifications" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="获奖荣誉">
            <el-input v-model="editForm.awardsHonors" type="textarea" :rows="2" />
          </el-form-item>

          <el-divider content-position="left">账号矩阵</el-divider>
          <el-form-item label="关联账号">
            <el-input v-model="editForm.relatedAccounts" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="账号矩阵">
            <el-input v-model="editForm.accountMatrix" />
          </el-form-item>

          <el-divider content-position="left">其他信息</el-divider>
          <el-form-item label="备注">
            <el-input v-model="editForm.remarks" type="textarea" :rows="3" />
          </el-form-item>
        </template>

        <!-- 省广星媒独家签约达人表单 -->
        <template v-else>
          <el-divider content-position="left">基本信息</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="昵称" prop="nickname">
                <el-input v-model="editForm.nickname" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="账号ID">
                <el-input v-model="editForm.accountId" disabled />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="达人概况">
                <el-input v-model="editForm.influencerOverview" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="达人类型">
                <el-input v-model="editForm.influencerCategory" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="所属机构">
                <el-input v-model="editForm.affiliatedOrganization" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="主平台粉丝量(万)" prop="totalFans">
                <el-input-number v-model="editForm.totalFans" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">合同信息</el-divider>
          <el-form-item label="签约进度">
            <el-input v-model="editForm.contractStatus" />
          </el-form-item>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="合同周期">
                <el-input v-model="editForm.contractPeriod" placeholder="例如：2024年1月-2025年1月" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="合同月数">
                <el-input-number v-model="editForm.contractMonths" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="合同开始日期">
                <el-date-picker
                  v-model="editForm.contractStartDate"
                  type="date"
                  placeholder="选择日期"
                  style="width: 100%"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="合同结束日期">
                <el-date-picker
                  v-model="editForm.contractEndDate"
                  type="date"
                  placeholder="选择日期"
                  style="width: 100%"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="签约返点%" prop="contractRebateRate">
            <el-input-number v-model="editForm.contractRebateRate" :min="0" :max="100" :precision="2" style="width: 100%" />
          </el-form-item>

          <el-divider content-position="left">平台信息</el-divider>
          <el-form-item label="平台账号">
            <el-input v-model="editForm.platformAccounts" type="textarea" :rows="3" placeholder="各平台账号信息" />
          </el-form-item>
          <el-form-item label="全网平台">
            <el-input v-model="editForm.allPlatforms" />
          </el-form-item>

          <el-divider content-position="left">其他信息</el-divider>
          <el-form-item label="状态备注">
            <el-input v-model="editForm.statusRemarks" type="textarea" :rows="3" />
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Delete, Plus } from '@element-plus/icons-vue';
import { StarlinkInfluencerApi, StarmediaInfluencerApi } from '#/api/influencer-management-direct-edit';

// 政策档位类型定义
interface PolicyTier {
  order_range: string;
  order_min: number;
  order_max: number | null;
  rebate_rate: number;
  cpm: number;
  cpe: number;
}

// Tab状态
const activeTab = ref<'starlink' | 'starmedia'>('starlink');

// 星链计划达人数据
const starlinkLoading = ref(false);
const starlinkData = ref<StarlinkInfluencerApi.Influencer[]>([]);
const starlinkPage = ref(1);
const starlinkLimit = ref(20);
const starlinkTotal = ref(0);

// 省广星媒独家签约达人数据
const starmediaLoading = ref(false);
const starmediaData = ref<StarmediaInfluencerApi.Influencer[]>([]);
const starmediaPage = ref(1);
const starmediaLimit = ref(20);
const starmediaTotal = ref(0);

// 编辑对话框
const editDialogVisible = ref(false);
const editForm = reactive<any>({});
const editFormRef = ref<FormInstance>();
const saving = ref(false);
const editingId = ref<number | null>(null);

// 政策档位数据
const policyTiersData = ref<PolicyTier[]>([]);

// 监视 editForm.policyTiers 的变化，解析 JSON 字符串
watch(
  () => editForm.policyTiers,
  (newValue) => {
    if (typeof newValue === 'string' && newValue.trim()) {
      try {
        const parsed = JSON.parse(newValue);
        if (Array.isArray(parsed)) {
          policyTiersData.value = parsed;
        }
      } catch (e) {
        // 如果解析失败，保持原有数据
        console.warn('政策档位数据解析失败:', e);
      }
    } else if (!newValue) {
      policyTiersData.value = [];
    }
  },
  { immediate: true }
);

// 监视 policyTiersData 的变化，同步到 editForm.policyTiers
watch(
  policyTiersData,
  (newValue) => {
    if (newValue && newValue.length > 0) {
      editForm.policyTiers = JSON.stringify(newValue);
    } else {
      editForm.policyTiers = '';
    }
  },
  { deep: true }
);

// 表单校验规则
const formRules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  fansCount: [{ type: 'number', min: 0, message: '粉丝量不能为负数', trigger: 'blur' }],
  totalFans: [{ type: 'number', min: 0, message: '粉丝量不能为负数', trigger: 'blur' }],
  minRebateRate: [
    { type: 'number', min: 0, max: 100, message: '返点比例必须在0-100之间', trigger: 'blur' },
  ],
  maxRebateRate: [
    { type: 'number', min: 0, max: 100, message: '返点比例必须在0-100之间', trigger: 'blur' },
  ],
  contractRebateRate: [
    { type: 'number', min: 0, max: 100, message: '签约返点必须在0-100之间', trigger: 'blur' },
  ],
};

// 加载星链计划达人数据
async function loadStarlinkData() {
  starlinkLoading.value = true;
  try {
    const res = await StarlinkInfluencerApi.getList({
      page: starlinkPage.value,
      limit: starlinkLimit.value,
    });
    // 后端返回格式: { data: [...], pagination: { total, page, pageSize } }
    starlinkData.value = res.data || res;
    starlinkTotal.value = res.pagination?.total || res.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据失败');
  } finally {
    starlinkLoading.value = false;
  }
}

// 加载省广星媒独家签约达人数据
async function loadStarmediaData() {
  starmediaLoading.value = true;
  try {
    const res = await StarmediaInfluencerApi.getList({
      page: starmediaPage.value,
      limit: starmediaLimit.value,
    });
    // 后端返回格式: { data: [...], pagination: { total, page, pageSize } }
    starmediaData.value = res.data || res;
    starmediaTotal.value = res.pagination?.total || res.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据失败');
  } finally {
    starmediaLoading.value = false;
  }
}

// Tab切换
function handleTabChange(tab: string) {
  if (tab === 'starlink') {
    loadStarlinkData();
  } else {
    loadStarmediaData();
  }
}

// 分页大小改变
function handleStarlinkSizeChange() {
  starlinkPage.value = 1;
  loadStarlinkData();
}

function handleStarmediaSizeChange() {
  starmediaPage.value = 1;
  loadStarmediaData();
}

// 行点击（查看详情）
function handleRowClick(row: any) {
  console.log('查看详情:', row);
}

// 编辑
function handleEdit(row: any, type: 'starlink' | 'starmedia') {
  editingId.value = row.id;
  Object.assign(editForm, row);
  editDialogVisible.value = true;
}

// 保存
async function handleSave() {
  if (!editFormRef.value) return;

  await editFormRef.value.validate(async (valid) => {
    if (!valid) return;

    saving.value = true;
    try {
      if (activeTab.value === 'starlink') {
        await StarlinkInfluencerApi.update(editingId.value!, editForm);
        ElMessage.success('更新成功');
        loadStarlinkData();
      } else {
        await StarmediaInfluencerApi.update(editingId.value!, editForm);
        ElMessage.success('更新成功');
        loadStarmediaData();
      }
      editDialogVisible.value = false;
    } catch (error: any) {
      ElMessage.error(error.message || '保存失败');
    } finally {
      saving.value = false;
    }
  });
}

// 删除
function handleDelete(row: any, type: 'starlink' | 'starmedia') {
  ElMessageBox.confirm(`确定要删除达人"${row.nickname}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        if (type === 'starlink') {
          await StarlinkInfluencerApi.remove(row.id);
          ElMessage.success('删除成功');
          loadStarlinkData();
        } else {
          await StarmediaInfluencerApi.remove(row.id);
          ElMessage.success('删除成功');
          loadStarmediaData();
        }
      } catch (error: any) {
        ElMessage.error(error.message || '删除失败');
      }
    })
    .catch(() => {
      // 取消删除
    });
}

// 初始化
onMounted(() => {
  loadStarlinkData();
});

// 添加政策档位
function addPolicyTier() {
  policyTiersData.value.push({
    order_range: '',
    order_min: 0,
    order_max: null,
    rebate_rate: 0,
    cpm: 0,
    cpe: 0,
  });
}

// 删除政策档位
function removePolicyTier(index: number) {
  policyTiersData.value.splice(index, 1);
}
</script>

<style scoped lang="scss">
.influencer-management-page {
  padding: 20px;
  background: #fff;
  min-height: calc(100vh - 100px);

  .management-tabs {
    margin-bottom: 20px;
  }

  .table-container {
    :deep(.el-table) {
      font-size: 14px;

      .el-table__header th {
        background-color: #f5f7fa;
        color: #606266;
        font-weight: 600;
      }

      .el-table__row:hover {
        cursor: pointer;
        background-color: #f5f7fa;
      }
    }

    .el-pagination {
      display: flex;
    }
  }

  :deep(.el-dialog__body) {
    max-height: 600px;
    overflow-y: auto;
  }

  :deep(.el-form-item__label) {
    font-weight: 500;
  }

  .policy-tiers-editor {
    width: 100%;

    :deep(.el-table) {
      .el-input-number {
        width: 100%;
      }

      .el-input__inner {
        text-align: left;
      }
    }

    .el-button {
      margin-top: 10px;
    }
  }
}
</style>
