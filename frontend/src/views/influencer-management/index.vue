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
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="kolSerialNumber" label="序号" width="80" />
        <el-table-column prop="nickname" label="昵称" width="120" show-overflow-tooltip />
        <el-table-column prop="primaryPlatform" label="主发平台" width="100" />
        <el-table-column prop="accountCategory" label="账号类型" width="120" show-overflow-tooltip />
        <el-table-column prop="fansCount" label="粉丝量(万)" width="110" align="right">
          <template #default="{ row }">
            {{ row.fansCount ? Number(row.fansCount).toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="price60sPlus" label="60s+报价" width="110" align="right">
          <template #default="{ row }">
            {{ row.price60sPlus ? Number(row.price60sPlus).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="minRebateRate" label="最低返点%" width="100" align="right">
          <template #default="{ row }">
            {{ row.minRebateRate || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="maxRebateRate" label="最高返点%" width="100" align="right">
          <template #default="{ row }">
            {{ row.maxRebateRate || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="currentOrderCount" label="当前订单数" width="110" align="right" />
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
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="influencerSerialNumber" label="序号" width="80" />
        <el-table-column prop="accountId" label="账号ID" width="150" show-overflow-tooltip />
        <el-table-column prop="nickname" label="昵称" width="120" show-overflow-tooltip />
        <el-table-column prop="influencerOverview" label="达人概况" width="150" show-overflow-tooltip />
        <el-table-column prop="influencerCategory" label="达人类型" width="120" show-overflow-tooltip />
        <el-table-column prop="totalFans" label="主平台粉丝量(万)" width="140" align="right">
          <template #default="{ row }">
            {{ row.totalFans ? Number(row.totalFans).toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="contractStatus" label="签约进度" width="180" show-overflow-tooltip />
        <el-table-column prop="contractRebateRate" label="签约返点%" width="110" align="right">
          <template #default="{ row }">
            {{ row.contractRebateRate || '-' }}
          </template>
        </el-table-column>
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
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最低返点%" prop="minRebateRate">
                <el-input-number v-model="editForm.minRebateRate" :min="0" :max="100" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最高返点%" prop="maxRebateRate">
                <el-input-number v-model="editForm.maxRebateRate" :min="0" :max="100" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
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
          <el-form-item label="达人链接">
            <el-input v-model="editForm.profileUrl" />
          </el-form-item>
          <el-form-item label="星图主页链接">
            <el-input v-model="editForm.starPlatformUrl" />
          </el-form-item>
          <el-form-item label="全网平台">
            <el-input v-model="editForm.allPlatforms" />
          </el-form-item>
          <el-form-item label="达人简介">
            <el-input v-model="editForm.kolIntroduction" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="editForm.remarks" type="textarea" :rows="2" />
          </el-form-item>
        </template>

        <!-- 省广星媒独家签约达人表单 -->
        <template v-else>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="昵称" prop="nickname">
                <el-input v-model="editForm.nickname" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="账号ID">
                <el-input v-model="editForm.accountId" />
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
              <el-form-item label="主平台粉丝量(万)" prop="totalFans">
                <el-input-number v-model="editForm.totalFans" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="签约返点%" prop="contractRebateRate">
                <el-input-number v-model="editForm.contractRebateRate" :min="0" :max="100" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="签约进度">
            <el-input v-model="editForm.contractStatus" />
          </el-form-item>
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
          <el-form-item label="全网平台">
            <el-input v-model="editForm.allPlatforms" />
          </el-form-item>
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
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { StarlinkInfluencerApi, StarmediaInfluencerApi } from '#/api/influencer-management';

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
}
</style>
