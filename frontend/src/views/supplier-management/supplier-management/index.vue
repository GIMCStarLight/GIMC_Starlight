<template>
  <div class="supplier-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">供应商管理</h1>
        <p class="page-description">管理供应商信息和合作关系</p>
      </div>
      <div class="header-right">
        <!-- <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增供应商
        </el-button> -->

        <el-button type="primary" @click="handleDownloadTemplate">
          <el-icon><Download /></el-icon>
          下载模板
        </el-button>

        <el-upload
          ref="uploadExcelRef"
          :on-change="uploadFile"
          :auto-upload="false"
          :limit="1"
        >
          <el-button type="primary">
            <el-icon><Upload /></el-icon>
            导入供应商
          </el-button>
        </el-upload>

        <!-- <el-button  @click="">
          <el-icon><Upload /></el-icon>
          导出供应商
        </el-button> -->
      </div>
    </div>

    <!-- 搜索筛选区域 -->
    <el-card class="search-card" shadow="never">
      <div class="search-area">
        <el-form :model="searchForm" inline>
          <el-form-item label="供应商名称">
            <el-input
              v-model="searchForm.search"
              placeholder="请输入供应商名称或机构名"
              clearable
              style="width: 220px"
            />
          </el-form-item>
          <el-form-item label="供应商性质">
            <el-select
              v-model="searchForm.supplier_type"
              placeholder="请选择供应商性质"
              clearable
              style="width: 150px"
            >
              <el-option label="集采" value="集采" />
              <el-option label="独代" value="独代" />
              <el-option label="独代+集采" value="独代+集采" />
            </el-select>
          </el-form-item>
          <el-form-item label="是否代下单">
            <el-select
              v-model="searchForm.is_proxy_order"
              placeholder="请选择"
              clearable
              style="width: 120px"
            >
              <el-option label="是" :value="true" />
              <el-option label="否" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item label="跟进人">
            <el-select
              v-model="searchForm.contract_follow_up_person"
              placeholder="请选择跟进人"
              clearable
              style="width: 120px"
            >
              <el-option label="SIRI" value="SIRI" />
              <el-option label="viya" value="viya" />
              <el-option label="鑫豪" value="鑫豪" />
              <el-option label="鑫豪/玉莹" value="鑫豪/玉莹" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 批量操作工具栏 -->
    <div v-if="selectedSuppliers.length > 0" class="batch-toolbar">
      <div class="batch-info">
        <span>已选择 {{ selectedSuppliers.length }} 个供应商</span>
        <el-button text type="primary" @click="clearSelection">取消选择</el-button>
      </div>
      <div class="batch-actions">
        <el-button type="primary" @click="handleBatchView">
          <el-icon><View /></el-icon>
          批量查看
        </el-button>
        <el-button type="warning" @click="handleBatchEdit" :disabled="selectedSuppliers.length !== 1">
          <el-icon><Edit /></el-icon>
          编辑（单选）
        </el-button>
        <el-button type="danger" @click="handleBatchDelete">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 供应商列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="suppliers"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="supplier_full_name" label="供应商全称" min-width="200" />
        <el-table-column prop="agency_name" label="机构名" min-width="150" />
        <el-table-column prop="supplier_type" label="供应商性质" width="120" />
        <el-table-column prop="current_policy_gradient" label="当前政策梯度" width="140" />
        <el-table-column prop="primary_contact_name" label="一级对接人" width="120" />
        <el-table-column prop="primary_contact_phone_wechat" label="联系方式" width="150" />
        <el-table-column prop="is_proxy_order" label="是否代下单" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_proxy_order ? 'success' : 'info'" size="small">
              {{ row.is_proxy_order ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tax_rate_percent" label="税率(%)" width="100" />
        <el-table-column prop="payment_term" label="账期" width="120" />
        <el-table-column prop="resource_type" label="资源类型" width="120" />
        <el-table-column prop="contract_follow_up_person" label="跟进人" width="100" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button type="warning" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 供应商详情浮窗 -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      size="65%"
      :close-on-click-modal="false"
    >
      <div class="supplier-detail">
        <!-- 基本信息 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">基本信息</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="供应商全称">{{ currentSupplier?.supplier_full_name }}</el-descriptions-item>
            <el-descriptions-item label="机构名">{{ currentSupplier?.agency_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="供应商性质">{{ currentSupplier?.supplier_type || '-' }}</el-descriptions-item>
            <el-descriptions-item label="供应商简称">{{ currentSupplier?.supplier_short_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="英文名">{{ currentSupplier?.supplier_english_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="官网">
              <a v-if="currentSupplier?.supplier_website" :href="currentSupplier.supplier_website" target="_blank" class="link">{{ currentSupplier.supplier_website }}</a>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="供应商简介" :span="2">{{ currentSupplier?.supplier_description || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 政策与财务 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">政策与财务</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="当前政策梯度">{{ currentSupplier?.current_policy_gradient || '-' }}</el-descriptions-item>
            <el-descriptions-item label="税率">{{ currentSupplier?.tax_rate_percent ? currentSupplier.tax_rate_percent + '%' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="账期">{{ currentSupplier?.payment_term || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结算方式">{{ currentSupplier?.settlement_method || '-' }}</el-descriptions-item>
            <el-descriptions-item label="开票主体">{{ currentSupplier?.billing_entity || '-' }}</el-descriptions-item>
            <el-descriptions-item label="收款主体">{{ currentSupplier?.collection_entity || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 2024年政策 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">2024年政策</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="政策梯度">{{ currentSupplier?.policy_2024_gradient || '-' }}</el-descriptions-item>
            <el-descriptions-item label="合作模式">{{ currentSupplier?.cooperation_mode_2024 || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ currentSupplier?.notes_2024 || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 2025年政策 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">2025年政策</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="政策梯度">{{ currentSupplier?.policy_2025_gradient || '-' }}</el-descriptions-item>
            <el-descriptions-item label="合作模式">{{ currentSupplier?.cooperation_mode_2025 || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ currentSupplier?.notes_2025 || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 联系人信息 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">联系人信息</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="一级对接人">{{ currentSupplier?.primary_contact_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系方式">{{ currentSupplier?.primary_contact_phone_wechat || '-' }}</el-descriptions-item>
            <el-descriptions-item label="二级对接人">{{ currentSupplier?.secondary_contact_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="二级联系方式">{{ currentSupplier?.secondary_contact_phone_wechat || '-' }}</el-descriptions-item>
            <el-descriptions-item label="三级对接人">{{ currentSupplier?.tertiary_contact_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="三级联系方式">{{ currentSupplier?.tertiary_contact_phone_wechat || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 合同信息 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">合同信息</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="跟进人">{{ currentSupplier?.contract_follow_up_person || '-' }}</el-descriptions-item>
            <el-descriptions-item label="合同状态">{{ currentSupplier?.contract_status || '-' }}</el-descriptions-item>
            <el-descriptions-item label="开始日期">{{ currentSupplier?.contract_start_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结束日期">{{ currentSupplier?.contract_end_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="合同备注" :span="2">{{ currentSupplier?.contract_notes || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 资源信息 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <span class="section-title">资源信息</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="资源类型">{{ currentSupplier?.resource_type || '-' }}</el-descriptions-item>
            <el-descriptions-item label="主要平台">{{ currentSupplier?.main_platform || '-' }}</el-descriptions-item>
            <el-descriptions-item label="是否代下单">
              <el-tag :type="currentSupplier?.is_proxy_order ? 'success' : 'info'" size="small">
                {{ currentSupplier?.is_proxy_order ? '是' : '否' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="资源备注" :span="2">{{ currentSupplier?.resource_notes || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
      
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">关闭</el-button>
          <el-button type="primary" @click="handleEditFromDrawer">编辑</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 供应商编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="70%"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="editForm"
        label-width="140px"
        :scroll-to-error="true"
      >
        <el-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="供应商全称" prop="supplier_full_name" :rules="[{ required: true, message: '请输入供应商全称' }]">
                  <el-input v-model="editForm.supplier_full_name" placeholder="请输入供应商全称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="机构名" prop="agency_name">
                  <el-input v-model="editForm.agency_name" placeholder="请输入机构名" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="供应商性质" prop="supplier_type">
                  <el-select v-model="editForm.supplier_type" placeholder="请选择供应商性质" style="width: 100%" clearable>
                    <el-option label="直媒" value="直媒" />
                    <el-option label="集采" value="集采" />
                    <el-option label="独代" value="独代" />
                    <el-option label="独代+集采" value="独代+集采" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="供应商简称" prop="supplier_short_name">
                  <el-input v-model="editForm.supplier_short_name" placeholder="请输入供应商简称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="英文名" prop="supplier_english_name">
                  <el-input v-model="editForm.supplier_english_name" placeholder="请输入英文名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="官网" prop="supplier_website">
                  <el-input v-model="editForm.supplier_website" placeholder="请输入官网地址" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="供应商简介" prop="supplier_description">
              <el-input v-model="editForm.supplier_description" type="textarea" :rows="3" placeholder="请输入供应商简介" />
            </el-form-item>
          </el-tab-pane>

          <!-- 政策财务 -->
          <el-tab-pane label="政策财务" name="finance">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="当前政策梯度" prop="current_policy_gradient">
                  <el-input v-model="editForm.current_policy_gradient" placeholder="请输入当前政策梯度" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="税率(%)" prop="tax_rate_percent">
                  <el-input-number v-model="editForm.tax_rate_percent" :min="0" :max="100" :precision="2" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="账期" prop="payment_term">
                  <el-input v-model="editForm.payment_term" placeholder="例如：月结、30天" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="结算方式" prop="settlement_method">
                  <el-input v-model="editForm.settlement_method" placeholder="请输入结算方式" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="开票主体" prop="billing_entity">
                  <el-input v-model="editForm.billing_entity" placeholder="请输入开票主体" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="收款主体" prop="collection_entity">
                  <el-input v-model="editForm.collection_entity" placeholder="请输入收款主体" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 年度政策 -->
          <el-tab-pane label="年度政策" name="policy">
            <h4 style="margin-bottom: 16px">2024年政策</h4>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="政策梯度" prop="policy_2024_gradient">
                  <el-input v-model="editForm.policy_2024_gradient" placeholder="请输入2024年政策梯度" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="合作模式" prop="cooperation_mode_2024">
                  <el-input v-model="editForm.cooperation_mode_2024" placeholder="请输入2024年合作模式" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="2024年备注" prop="notes_2024">
              <el-input v-model="editForm.notes_2024" type="textarea" :rows="2" placeholder="请输入2024年备注" />
            </el-form-item>

            <el-divider />

            <h4 style="margin-bottom: 16px">2025年政策</h4>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="政策梯度" prop="policy_2025_gradient">
                  <el-input v-model="editForm.policy_2025_gradient" placeholder="请输入2025年政策梯度" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="合作模式" prop="cooperation_mode_2025">
                  <el-input v-model="editForm.cooperation_mode_2025" placeholder="请输入2025年合作模式" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="2025年备注" prop="notes_2025">
              <el-input v-model="editForm.notes_2025" type="textarea" :rows="2" placeholder="请输入2025年备注" />
            </el-form-item>
          </el-tab-pane>

          <!-- 联系人 -->
          <el-tab-pane label="联系人" name="contact">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="一级对接人" prop="primary_contact_name">
                  <el-input v-model="editForm.primary_contact_name" placeholder="请输入一级对接人" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系方式" prop="primary_contact_phone_wechat">
                  <el-input v-model="editForm.primary_contact_phone_wechat" placeholder="请输入联系方式" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="二级对接人" prop="secondary_contact_name">
                  <el-input v-model="editForm.secondary_contact_name" placeholder="请输入二级对接人" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="二级联系方式" prop="secondary_contact_phone_wechat">
                  <el-input v-model="editForm.secondary_contact_phone_wechat" placeholder="请输入二级联系方式" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="三级对接人" prop="tertiary_contact_name">
                  <el-input v-model="editForm.tertiary_contact_name" placeholder="请输入三级对接人" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="三级联系方式" prop="tertiary_contact_phone_wechat">
                  <el-input v-model="editForm.tertiary_contact_phone_wechat" placeholder="请输入三级联系方式" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <!-- 合同资源 -->
          <el-tab-pane label="合同资源" name="contract">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="跟进人" prop="contract_follow_up_person">
                  <el-input v-model="editForm.contract_follow_up_person" placeholder="请输入跟进人" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="合同状态" prop="contract_status">
                  <el-select v-model="editForm.contract_status" placeholder="请选择合同状态" style="width: 100%" clearable>
                    <el-option label="生效中" value="生效中" />
                    <el-option label="已过期" value="已过期" />
                    <el-option label="待签约" value="待签约" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="合同开始日期" prop="contract_start_date">
                  <el-date-picker v-model="editForm.contract_start_date" type="date" placeholder="请选择开始日期" style="width: 100%" value-format="YYYY-MM-DD" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="合同结束日期" prop="contract_end_date">
                  <el-date-picker v-model="editForm.contract_end_date" type="date" placeholder="请选择结束日期" style="width: 100%" value-format="YYYY-MM-DD" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="合同备注" prop="contract_notes">
              <el-input v-model="editForm.contract_notes" type="textarea" :rows="2" placeholder="请输入合同备注" />
            </el-form-item>

            <el-divider />

            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="资源类型" prop="resource_type">
                  <el-select v-model="editForm.resource_type" placeholder="请选择资源类型" style="width: 100%" clearable>
                    <el-option label="短视频" value="短视频" />
                    <el-option label="直播" value="直播" />
                    <el-option label="图文" value="图文" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="主要平台" prop="main_platform">
                  <el-input v-model="editForm.main_platform" placeholder="例如：抖音、小红书" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="是否代下单" prop="is_proxy_order">
                  <el-radio-group v-model="editForm.is_proxy_order">
                    <el-radio :label="true">是</el-radio>
                    <el-radio :label="false">否</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="资源备注" prop="resource_notes">
              <el-input v-model="editForm.resource_notes" type="textarea" :rows="2" placeholder="请输入资源备注" />
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 操作工具栏 -->
    <el-card class="toolbar-card" shadow="never">
      
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { log } from '../../../utils/logger'
import { Excel, mapExcelSupplier } from '../../../utils/excel'
import { 
  getSupplierListApi, 
  batchCreateSupplierApi, 
  deleteSupplierApi, 
  batchDeleteSuppliersApi,
  downloadSupplierTemplateApi,
  updateSupplierApi,
  type SupplierInfo,
  type CreateSupplierDto,
  type SupplierListParams
} from '../../../api/supplier'

// 响应式数据
const drawerVisible = ref(false)  // 详情浮窗
const drawerTitle = ref('供应商详情')
const currentSupplier = ref<SupplierInfo | null>(null)  // 当前查看的供应商

const dialogVisible = ref(false)  // 编辑对话框
const dialogTitle = ref('')
const activeTab = ref('basic')  // 当前活动的tab
const submitting = ref(false)  // 提交中
const loading = ref(false)
const suppliers = ref<SupplierInfo[]>([])
const selectedSuppliers = ref<SupplierInfo[]>([])

// 分页信息
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 搜索表单 - 使用正确的字段名
const searchForm = reactive<SupplierListParams>({
  search: '',
  supplier_type: '',
  is_proxy_order: undefined,
  contract_follow_up_person: ''
})

// 编辑表单数据
const editForm = reactive<Partial<SupplierInfo>>({
  supplier_full_name: '',
  agency_name: '',
  supplier_type: '',
  supplier_short_name: '',
  supplier_english_name: '',
  supplier_website: '',
  supplier_description: '',
  current_policy_gradient: '',
  tax_rate_percent: undefined,
  payment_term: '',
  settlement_method: '',
  billing_entity: '',
  collection_entity: '',
  policy_2024_gradient: '',
  cooperation_mode_2024: '',
  notes_2024: '',
  policy_2025_gradient: '',
  cooperation_mode_2025: '',
  notes_2025: '',
  primary_contact_name: '',
  primary_contact_phone_wechat: '',
  secondary_contact_name: '',
  secondary_contact_phone_wechat: '',
  tertiary_contact_name: '',
  tertiary_contact_phone_wechat: '',
  contract_follow_up_person: '',
  contract_status: '',
  contract_start_date: '',
  contract_end_date: '',
  contract_notes: '',
  resource_type: '',
  main_platform: '',
  is_proxy_order: false,
  resource_notes: ''
})

// 加载数据 - 支持筛选
const loadData = async () => {
  try {
    loading.value = true
    
    // 过滤掉空字符串的筛选条件，只传递有值的参数
    const filters: any = {}
    if (searchForm.search && searchForm.search.trim()) {
      filters.search = searchForm.search.trim()
    }
    if (searchForm.supplier_type && searchForm.supplier_type.trim()) {
      filters.supplier_type = searchForm.supplier_type
    }
    if (searchForm.contract_follow_up_person && searchForm.contract_follow_up_person.trim()) {
      filters.contract_follow_up_person = searchForm.contract_follow_up_person.trim()
    }
    if (searchForm.is_proxy_order !== undefined) {
      filters.is_proxy_order = searchForm.is_proxy_order
    }
    
    const params: SupplierListParams = {
      page: pagination.page,
      limit: pagination.pageSize,
      ...filters  // 只包含非空的筛选条件
    }
    log.debug('🚀 开始加载供应商数据:', params)
    
    const result = await getSupplierListApi(params)
    
    if (result && typeof result === 'object' && 'data' in result && 'pagination' in result) {
      suppliers.value = result.data || []
      
      if (result.pagination) {
        pagination.total = result.pagination.total || 0
        pagination.page = result.pagination.page || pagination.page
        pagination.pageSize = result.pagination.pageSize || pagination.pageSize
      }
    } else {
      suppliers.value = []
      pagination.total = 0
    }
  } catch (error) {
    log.error('❌ 加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索和重置
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.supplier_type = ''
  searchForm.is_proxy_order = undefined
  searchForm.contract_follow_up_person = ''
  pagination.page = 1
  loadData()
}

// 查看详情 - 使用浮窗
const handleView = (row: SupplierInfo) => {
  currentSupplier.value = row
  drawerTitle.value = `${row.supplier_full_name} - 详细信息`
  drawerVisible.value = true
}

// 从浮窗跳转到编辑
const handleEditFromDrawer = () => {
  if (currentSupplier.value) {
    drawerVisible.value = false
    setTimeout(() => {
      handleEdit(currentSupplier.value!)
    }, 300)
  }
}

// 编辑供应商
const handleEdit = (row: SupplierInfo) => {
  dialogTitle.value = '编辑供应商'
  activeTab.value = 'basic'
  // 复制数据到编辑表单
  Object.assign(editForm, row)
  dialogVisible.value = true
}

// 重置编辑表单
const handleDialogClose = () => {
  Object.keys(editForm).forEach(key => {
    if (key === 'is_proxy_order') {
      (editForm as any)[key] = false
    } else if (key === 'tax_rate_percent') {
      (editForm as any)[key] = undefined
    } else {
      (editForm as any)[key] = ''
    }
  })
  activeTab.value = 'basic'
}

// 提交编辑
const handleSubmit = async () => {
  if (!editForm.id) {
    ElMessage.error('未找到供应商ID')
    return
  }
  
  try {
    submitting.value = true
    await updateSupplierApi(editForm.id, editForm)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()  // 重新加载数据
  } catch (error) {
    log.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

const handleBatchDelete = async () => {
  if (selectedSuppliers.value.length === 0) {
    ElMessage.warning('请先选择要删除的供应商')
    return
  }
  
  const supplierNames = selectedSuppliers.value.map(s => s.supplier_full_name).join('、')
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedSuppliers.value.length} 个供应商吗？\n${supplierNames}`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedSuppliers.value.map(s => s.id)
    const result = await batchDeleteSuppliersApi(ids)
    
    // 处理批量删除结果
    if (result.failedIds && result.failedIds.length > 0) {
      ElMessage.warning(
        `批量删除完成：成功 ${result.deletedCount} 个，失败 ${result.failedIds.length} 个`
      )
    } else {
      ElMessage.success(`成功删除 ${result.deletedCount} 个供应商`)
    }
    
    selectedSuppliers.value = []
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      log.error('批量删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 选择变更
const handleSelectionChange = (selection: SupplierInfo[]) => {
  selectedSuppliers.value = selection
}

// 清除选择
const clearSelection = () => {
  selectedSuppliers.value = []
}

// 批量查看
const handleBatchView = () => {
  if (selectedSuppliers.value.length === 0) return
  // 可以实现批量查看逻辑，这里暂时只查看第一个
  handleView(selectedSuppliers.value[0])
}

// 批量编辑（只支持单选）
const handleBatchEdit = () => {
  if (selectedSuppliers.value.length !== 1) return
  handleEdit(selectedSuppliers.value[0])
}

// 删除单个供应商
const handleDelete = async (row: SupplierInfo) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除供应商"${row.supplier_full_name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteSupplierApi(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      log.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadData()
}

// 工具方法
const getLevelType = (level: string) => {
  const typeMap: Record<string, string> = {
    GOLD: 'warning',
    SILVER: 'info',
    BRONZE: 'success'
  }
  return typeMap[level] || 'info'
}

const getLevelText = (level: string) => {
  const textMap: Record<string, string> = {
    GOLD: '金牌',
    SILVER: '银牌',
    BRONZE: '铜牌'
  }
  return textMap[level] || level
}

const getTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    MANUFACTURER: '制造商',
    DISTRIBUTOR: '分销商',
    AGENT: '代理商'
  }
  return textMap[type] || type
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    ACTIVE: 'success',
    INACTIVE: 'info',
    SUSPENDED: 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    ACTIVE: '正常',
    INACTIVE: '禁用',
    SUSPENDED: '暂停'
  }
  return textMap[status] || status
}

const getPolicyInfo = (supplier: any) => {
  // 根据供应商等级和类型生成默认政策
  const level = supplier.level
  const type = supplier.type
  
  if (level === 'GOLD') {
    return {
      returnRate: '8-12%',
      resourceSupport: '全面支持',
      projectAutonomy: '高度自主',
      description: '战略供应商，优惠返点+资源支持+高度自主',
      stars: 5
    }
  } else if (level === 'SILVER') {
    return {
      returnRate: '5-8%',
      resourceSupport: '部分支持',
      projectAutonomy: '中等自主',
      description: '优质供应商，根据业务量分层返点+对应资源',
      stars: 4
    }
  } else {
    return {
      returnRate: '3-5%',
      resourceSupport: '基础支持',
      projectAutonomy: '标准自主',
      description: '合作供应商，标准返点+部分资源共享',
      stars: 3
    }
  }
}

const getCooperationLevelType = (level: string) => {
  const typeMap: Record<string, string> = {
    key: 'primary',
    normal: 'success',
    potential: 'warning'
  }
  return typeMap[level] || 'info'
}

const getCooperationLevelLabel = (level: string) => {
  const labelMap: Record<string, string> = {
    key: '重点供应商',
    normal: '普通供应商',
    potential: '潜在供应商'
  }
  return labelMap[level] || '未知'
}

const formatAmount = (amount: number) => {
  return `¥${(amount / 10000).toFixed(1)}万`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 下载导入模板
const handleDownloadTemplate = async () => {
  log.debug('🚀 [下载模板] 开始下载供应商导入模板')
  
  try {
    loading.value = true
    log.debug('⏳ [下载模板] 设置加载状态为true')
    
    log.debug('📡 [下载模板] 调用API: downloadSupplierTemplateApi()')
    const startTime = Date.now()
    const response = await downloadSupplierTemplateApi()
    const endTime = Date.now()
    
    log.debug('✅ [下载模板] API调用成功', {
      responseType: typeof response,
      responseSize: response?.size || 'unknown',
      responseConstructor: response?.constructor?.name,
      duration: `${endTime - startTime}ms`
    })
    
    // 验证响应数据
    if (!response) {
      throw new Error('API返回空响应')
    }
    
    // 确保响应是Blob对象
    let blob: Blob
    if (response instanceof Blob) {
      log.debug('📄 [下载模板] 响应已是Blob对象，直接使用', {
        size: response.size,
        type: response.type
      })
      blob = response
    } else {
      log.warn('⚠️ [下载模板] 响应不是Blob对象，尝试转换', {
        actualType: typeof response,
        constructor: response?.constructor?.name
      })
      // 如果不是Blob，尝试转换
      blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    }
    
    log.debug('📦 [下载模板] 最终Blob信息', {
      size: blob.size,
      type: blob.type
    })
    
    if (blob.size === 0) {
      throw new Error('生成的Blob文件大小为0')
    }
    
    log.debug('🌐 [下载模板] 创建下载URL')
    const url = window.URL.createObjectURL(blob)
    log.debug('🔗 [下载模板] URL创建成功:', url)
    
    log.debug('📎 [下载模板] 创建下载链接元素')
    const link = document.createElement('a')
    link.href = url
    link.download = '供应商导入模板.xlsx'
    
    log.debug('📋 [下载模板] 下载链接配置', {
      href: link.href,
      download: link.download
    })
    
    log.debug('🖱️ [下载模板] 触发下载')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    log.debug('🧹 [下载模板] 清理资源')
    window.URL.revokeObjectURL(url)
    
    log.debug('✅ [下载模板] 下载完成')
    ElMessage.success('模板下载成功')
  } catch (error) {
    log.error('❌ [下载模板] 下载失败:', error)
    log.error('❌ [下载模板] 错误详情:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause
    })
    
    // 检查网络错误
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      log.error('🌐 [下载模板] 网络错误，请检查网络连接')
      ElMessage.error('网络连接失败，请检查网络后重试')
    } else if (error?.message?.includes('timeout')) {
      log.error('⏰ [下载模板] 请求超时')
      ElMessage.error('请求超时，请重试')
    } else {
      log.error('💥 [下载模板] 未知错误')
      ElMessage.error('下载模板失败，请重试')
    }
  } finally {
    log.debug('🏁 [下载模板] 重置加载状态')
    loading.value = false
  }
}

// 导入数据
const uploadExcelRef = ref()
const uploadFile = async (file: any) => {
  // 表头字段数组
  const header = Object.values(mapExcelSupplier);
  if (file.raw?.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      && file.raw?.type !== 'application/vnd.ms-excel') {
    ElMessage.error('文件格式错误，请重新上传！')
    // 移除上传的文件
    uploadExcelRef.value!.handleRemove(file)
    return false
  }
  
  // 对excel文件进行处理
  try {
    loading.value = true
    const excel = new Excel(file.raw);
    // 导入文件获取数据
    const res = await excel.importExcel({ header });
    res.shift() // 移除表头行（第1行）
    res.shift() // 移除说明行（第2行）- 从第3行开始算数据
    
    if (res.length === 0) {
      ElMessage.warning('Excel文件中没有有效数据')
      return
    }
    
    // 数据转换和验证
    const validSuppliers: CreateSupplierDto[] = []
    const invalidItems: Array<{index: number, error: string}> = []
    
    res.forEach((item, index) => {
      try {
        // 数据转换 - 只使用CreateSupplierDto中存在的字段
        const supplier: CreateSupplierDto = {
          supplier_full_name: item.supplier_full_name || '',
          agency_name: item.agency_name || '',
          supplier_type: item.supplier_type || '',
          current_policy_gradient: item.current_policy_gradient || '',
          billing_entity: item.billing_entity || '',
          collection_entity: item.collection_entity || '',
          policy_2024_gradient: item.policy_2024_gradient || '',
          cooperation_mode_2024: item.cooperation_mode_2024 || '',
          policy_2025_gradient: item.policy_2025_gradient || '',
          cooperation_mode_2025: item.cooperation_mode_2025 || '',
          tax_rate_percent: item.tax_rate_percent ? Number(item.tax_rate_percent) : undefined,
          payment_term: item.payment_term || '',
          settlement_method: item.settlement_method || '',
          is_proxy_order: item.is_proxy_order === '是' || item.is_proxy_order === 'true' || (item.is_proxy_order as any) === true,
          primary_contact_name: item.primary_contact_name || '',
          primary_contact_phone_wechat: item.primary_contact_phone_wechat || '',
          secondary_contact_name: item.secondary_contact_name || '',
          secondary_contact_phone_wechat: item.secondary_contact_phone_wechat || '',
          contract_start_date: item.contract_start_date || '',
          contract_end_date: item.contract_end_date || '',
          contract_follow_up_person: item.contract_follow_up_person || '',
          resource_type: item.resource_type || '',
          supplier_description: item.supplier_description || ''
        }
        
        // 基本验证
        if (!supplier.supplier_full_name) {
          invalidItems.push({
            index: index + 1,
            error: '供应商全称不能为空'
          })
          return
        }
        
        validSuppliers.push(supplier)
      } catch (error) {
        invalidItems.push({
          index: index + 1,
          error: `数据格式错误: ${error}`
        })
      }
    })
    
    if (validSuppliers.length === 0) {
      ElMessage.error('没有有效的供应商数据可以导入')
      return
    }
    
    // 批量创建供应商
    const result = await batchCreateSupplierApi({ suppliers: validSuppliers })
    
    let message = `导入完成！成功导入 ${result.successCount} 条记录`
    if (result.failedCount > 0) {
      message += `，失败 ${result.failedCount} 条记录`
    }
    if (invalidItems.length > 0) {
      message += `，跳过无效数据 ${invalidItems.length} 条`
    }
    
    ElMessage.success(message)
    
    // 刷新数据
    loadData()
    
  } catch (error) {
    log.error('导入失败:', error)
    ElMessage.error('导入失败，请检查文件格式和数据')
  } finally {
    loading.value = false
    uploadExcelRef.value!.handleRemove(file)
  }
}

// 页面加载时获取数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.supplier-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-description {
  color: #606266;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.search-card,
.table-card {
  margin-bottom: 20px;
  border: 1px solid #e4e7ed;
}

.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.contact-detail {
  font-size: 12px;
  color: #909399;
}

.cooperation-status {
  text-align: center;
}

.cooperation-level {
  margin-bottom: 4px;
}

.cooperation-amount {
  font-size: 12px;
  color: #606266;
}

.policy-stars {
  display: flex;
  justify-content: center;
}

.policy-tooltip h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.policy-tooltip p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-content {
  padding: 16px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.detail-item {
  margin-bottom: 12px;
}

.detail-label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
}

.detail-value {
  color: #303133;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 浮窗样式 */
.supplier-detail {
  padding: 0 16px;
}

.section-card {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-weight: 600;
  font-size: 16px;
}

.link {
  color: #409eff;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>



