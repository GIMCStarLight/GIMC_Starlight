<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';

import type { RoleApi } from '#/api/core/role';
import type { UserApi } from '#/api/core/user';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { IconifyIcon as Icon } from '@vben/icons';

import {
  ElAvatar,
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { getRoleListApi } from '#/api/core/role';
import {
  assignUserRolesApi,
  createUserApi,
  deleteUserApi,
  getUserListApi,
  resetUserPasswordApi,
  updateUserApi,
} from '#/api/core/user';
import { $t } from '#/locales';

// 响应式数据
const loading = ref(false);
const userList = ref<UserApi.UserInfo[]>([]);
const roleOptions = ref<RoleApi.RoleInfo[]>([]);
const selectedUsers = ref<UserApi.UserInfo[]>([]);
const searchForm = reactive({
  search: '',
  roleId: undefined as string | undefined,
  status: undefined as number | undefined,
});

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

// 对话框
const dialogVisible = ref(false);
const dialogTitle = ref('');
const isEdit = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

// 表单数据
const formData = reactive<
  Partial<
    UserApi.CreateUserParams & UserApi.UpdateUserParams & { roleIds: string[] }
  >
>({
  name: '',
  phone: '',
  email: '',
  password: '',
  department: '',
  roleIds: [],
});

// 角色分配相关
const roleDialogVisible = ref(false);
const roleLoading = ref(false);
const currentUser = ref<null | UserApi.UserInfo>(null);
const selectedRoles = ref<string[]>([]);

// 密码重置相关
const passwordDialogVisible = ref(false);
const passwordLoading = ref(false);
const passwordFormRef = ref<FormInstance>();
const passwordForm = reactive({
  newPassword: '',
  confirmPassword: '',
});

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入用户名称', trigger: 'blur' },
    {
      min: 2,
      max: 50,
      message: '用户名称长度在 2 到 50 个字符',
      trigger: 'blur',
    },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号',
      trigger: 'blur',
    },
  ],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' },
  ],
};

// 密码验证规则
const passwordRules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value === passwordForm.newPassword) {
          callback();
        } else {
          callback(new Error('两次输入的密码不一致'));
        }
      },
      trigger: 'blur',
    },
  ],
};

// 计算属性
const dialogTitleComputed = computed(() => {
  return isEdit.value
    ? $t('page.system.editUser')
    : $t('page.system.createUser');
});

// 方法
const getRoleTagType = (code: string) => {
  const typeMap: Record<string, string> = {
    super_admin: 'danger',
    business_admin: 'warning',
    operator: 'primary',
    finance: 'success',
  };
  return typeMap[code] || 'info';
};

const getRoleIcon = (code: string) => {
  const iconMap: Record<string, string> = {
    super_admin: 'lucide:crown',
    business_admin: 'lucide:briefcase',
    operator: 'lucide:settings',
    finance: 'lucide:dollar-sign',
    auditor: 'lucide:eye',
  };
  return iconMap[code] || 'lucide:user';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

// 获取用户列表
const fetchUserList = async () => {
  try {
    loading.value = true;
    const params: UserApi.UserListParams = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.search || undefined,
      status: searchForm.status,
      roleId: searchForm.roleId,
    };

    const response = await getUserListApi(params);
    userList.value = response || [];
    pagination.total = response.pagination?.total || 0;
  } catch (error) {
    // 获取用户列表失败
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取角色选项
const fetchRoleOptions = async () => {
  try {
    const response = await getRoleListApi({ limit: 1000 });
    roleOptions.value = response || [];
  } catch (error) {
    // 获取角色列表失败
  }
};

// 搜索
const handleSearch = () => {
  pagination.page = 1;
  fetchUserList();
};

// 重置搜索
const handleReset = () => {
  searchForm.search = '';
  searchForm.roleId = undefined;
  searchForm.status = undefined;
  pagination.page = 1;
  fetchUserList();
};

// 分页事件处理
const handlePageChange = (page: number) => {
  pagination.page = page;
};

const handleSizeChange = (size: number) => {
  pagination.limit = size;
  pagination.page = 1;
};

// 刷新
const handleRefresh = () => {
  fetchUserList();
};

// 导入用户
const handleImport = () => {
  ElMessage.info('导入功能开发中...');
};

// 导出用户
const handleExport = () => {
  ElMessage.info('导出功能开发中...');
};

// 选择变化
const handleSelectionChange = (selection: UserApi.UserInfo[]) => {
  selectedUsers.value = selection;
};

// 创建用户
const handleCreate = () => {
  isEdit.value = false;
  dialogTitle.value = $t('page.system.createUser');
  resetForm();
  dialogVisible.value = true;
};

// 编辑用户
const handleEdit = (user: UserApi.UserInfo) => {
  isEdit.value = true;
  dialogTitle.value = $t('page.system.editUser');
  Object.assign(formData, {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    department: user.department,
    roleIds: user.roles?.map((role) => role.id) || [],
  });
  dialogVisible.value = true;
};

// 删除用户
const handleDelete = async (user: UserApi.UserInfo) => {
  try {
    await ElMessageBox.confirm(
      `确认删除用户 "${user.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    await deleteUserApi(user.id);
    ElMessage.success('删除成功');
    fetchUserList();
  } catch (error) {
    if (error !== 'cancel') {
      // 删除用户失败
      ElMessage.error('删除用户失败');
    }
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请选择要删除的用户');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedUsers.value.length} 个用户吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    // 这里调用批量删除API
    ElMessage.success('批量删除成功');
    selectedUsers.value = [];
    fetchUserList();
  } catch (error) {
    if (error !== 'cancel') {
      // 批量删除失败
      ElMessage.error('批量删除失败');
    }
  }
};

// 状态切换
const handleStatusChange = async (user: UserApi.UserInfo) => {
  try {
    await updateUserApi(user.id, { status: user.status });
    ElMessage.success('状态更新成功');
  } catch (error) {
    // 更新状态失败
    ElMessage.error('更新状态失败');
    // 恢复原状态
    user.status = user.status === 1 ? 0 : 1;
  }
};

// 分配角色
const handleAssignRole = (user: UserApi.UserInfo) => {
  currentUser.value = user;
  selectedRoles.value = user.roles?.map((role) => role.id) || [];
  roleDialogVisible.value = true;
};

// 批量分配角色
const handleBatchAssignRole = () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请选择要分配角色的用户');
    return;
  }
  ElMessage.info('批量分配角色功能开发中...');
};

// 保存角色分配
const handleSaveRoles = async () => {
  if (!currentUser.value) return;

  try {
    roleLoading.value = true;
    await assignUserRolesApi({
      userId: currentUser.value.id,
      roleIds: selectedRoles.value,
    });

    ElMessage.success('角色分配成功');
    roleDialogVisible.value = false;
    fetchUserList();
  } catch (error) {
    // 角色分配失败
    ElMessage.error('角色分配失败');
  } finally {
    roleLoading.value = false;
  }
};

// 重置密码
const handleResetPassword = (user: UserApi.UserInfo) => {
  currentUser.value = user;
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  passwordDialogVisible.value = true;
};

// 保存密码重置
const handleSavePassword = async () => {
  if (!passwordFormRef.value || !currentUser.value) return;

  try {
    await passwordFormRef.value.validate();
    passwordLoading.value = true;

    await resetUserPasswordApi({
      userId: currentUser.value.id,
      newPassword: passwordForm.newPassword,
    });

    ElMessage.success('密码重置成功');
    passwordDialogVisible.value = false;
  } catch (error) {
    // 密码重置失败
    ElMessage.error('密码重置失败');
  } finally {
    passwordLoading.value = false;
  }
};

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    phone: '',
    email: '',
    password: '',
    department: '',
    roleIds: [],
  });
  formRef.value?.clearValidate();
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (isEdit.value) {
      await updateUserApi(formData.id!, {
        name: formData.name!,
        phone: formData.phone!,
        email: formData.email,
        department: formData.department,
        position:
          formData.roleIds && formData.roleIds.length > 0
            ? roleOptions.value.find((r) => r.id === formData.roleIds![0])
                ?.name || ''
            : '',
        roleIds: formData.roleIds,
      });
      ElMessage.success('更新成功');
    } else {
      await createUserApi({
        name: formData.name!,
        phone: formData.phone!,
        email: formData.email,
        password: formData.password!,
        department: formData.department,
        position:
          formData.roleIds && formData.roleIds.length > 0
            ? roleOptions.value.find((r) => r.id === formData.roleIds![0])
                ?.name || ''
            : '',
        roleIds: formData.roleIds,
      });
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    fetchUserList();
  } catch (error) {
    // 保存失败
    ElMessage.error('保存失败');
  } finally {
    submitLoading.value = false;
  }
};

// 生命周期
onMounted(() => {
  fetchUserList();
  fetchRoleOptions();
});

// 监听分页变化
watch(
  () => [pagination.page, pagination.limit],
  () => {
    fetchUserList();
  },
  { deep: true },
);
</script>

<template>
  <div class="user-management">
    <!-- 页面头部 -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold">
          {{ $t('page.system.userManagement') }}
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ $t('page.system.user.description') }}
        </p>
      </div>
      <div class="flex gap-2">
        <ElButton type="primary" @click="handleCreate">
          <Icon icon="lucide:plus" class="mr-1" />
          {{ $t('page.system.createUser') }}
        </ElButton>
        <ElButton type="success" @click="handleImport">
          <Icon icon="lucide:upload" class="mr-1" />
          {{ $t('page.system.user.import') }}
        </ElButton>
        <ElButton @click="handleExport">
          <Icon icon="lucide:download" class="mr-1" />
          {{ $t('page.system.user.export') }}
        </ElButton>
        <ElButton @click="handleRefresh">
          <Icon icon="lucide:refresh-cw" class="mr-1" />
          {{ $t('page.system.refresh') }}
        </ElButton>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="mb-4 rounded-lg bg-background p-4 shadow-sm border">
      <ElForm :model="searchForm" inline>
        <ElFormItem :label="$t('page.system.user.userInfo')">
          <ElInput
            v-model="searchForm.search"
            :placeholder="$t('page.system.user.searchPlaceholder')"
            clearable
            @keyup.enter="handleSearch"
          />
        </ElFormItem>
        <ElFormItem :label="$t('page.system.user.role')">
          <ElSelect
            v-model="searchForm.roleId"
            :placeholder="$t('page.system.user.rolePlaceholder')"
            clearable
            style="width: 200px"
          >
            <ElOption
              v-for="role in roleOptions"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="$t('page.system.user.status.title')">
          <ElSelect
            v-model="searchForm.status"
            :placeholder="$t('page.system.user.statusPlaceholder')"
            clearable
            style="width: 150px"
          >
            <ElOption
              :label="$t('page.system.user.status.enabled')"
              :value="1"
            />
            <ElOption
              :label="$t('page.system.user.status.disabled')"
              :value="0"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">
            <Icon icon="lucide:search" class="mr-1" />
            {{ $t('page.system.search') }}
          </ElButton>
          <ElButton @click="handleReset">
            <Icon icon="lucide:rotate-ccw" class="mr-1" />
            {{ $t('page.system.reset') }}
          </ElButton>
        </ElFormItem>
      </ElForm>
    </div>

    <!-- 用户列表表格 -->
    <div class="rounded-lg bg-background shadow-sm border">
      <ElTable
        v-loading="loading"
        :data="userList"
        class="w-full"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn type="selection" width="55" />

        <ElTableColumn
          prop="name"
          :label="$t('page.system.user.userInfo')"
          min-width="200"
        >
          <template #default="{ row }">
            <div class="flex items-center">
              <ElAvatar :src="row.avatar" :size="32" class="mr-3">
                <Icon icon="lucide:user" size="16" />
              </ElAvatar>
              <div>
                <div class="font-medium">{{ row.name }}</div>
                <div class="text-sm text-gray-500">{{ row.phone }}</div>
              </div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="email"
          :label="$t('page.system.user.email')"
          width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="row.email" class="text-blue-600">{{ row.email }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="department"
          :label="$t('page.system.user.department')"
          width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="row.department">{{ row.department }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="roles"
          :label="$t('page.system.user.role')"
          min-width="200"
        >
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <ElTag
                v-for="role in row.roles || []"
                :key="role.id || role.code"
                :type="getRoleTagType(role.code)"
                size="small"
              >
                {{ role.name }}
              </ElTag>
              <span
                v-if="!row.roles || row.roles.length === 0"
                class="text-gray-400"
              >
                {{ $t('page.system.user.noRolesAssigned') }}
              </span>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="lastLoginAt"
          :label="$t('page.system.user.lastLogin')"
          width="180"
        >
          <template #default="{ row }">
            <span v-if="row.lastLoginAt" class="text-sm">
              {{ formatDate(row.lastLoginAt) }}
            </span>
            <span v-else class="text-gray-400">{{
              $t('page.system.user.neverLoggedIn')
            }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="status"
          :label="$t('page.system.user.status.title')"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <ElSwitch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(row)"
            />
          </template>
        </ElTableColumn>

        <ElTableColumn
          prop="createdAt"
          :label="$t('page.system.user.creationTime')"
          width="180"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </ElTableColumn>

        <ElTableColumn
          :label="$t('page.system.user.actions')"
          width="280"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="flex gap-1">
              <ElButton type="primary" size="small" @click="handleEdit(row)">
                <Icon icon="lucide:edit" size="14" />
              </ElButton>
              <ElButton
                type="success"
                size="small"
                @click="handleAssignRole(row)"
              >
                <Icon icon="lucide:user-check" size="14" />
              </ElButton>
              <ElButton
                type="warning"
                size="small"
                @click="handleResetPassword(row)"
              >
                <Icon icon="lucide:key" size="14" />
              </ElButton>
              <ElButton type="danger" size="small" @click="handleDelete(row)">
                <Icon icon="lucide:trash-2" size="14" />
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 批量操作 -->
      <div v-if="selectedUsers.length > 0" class="border-t bg-blue-50 p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm text-blue-600">
            {{
              $t('page.system.user.selectedUsers', {
                count: selectedUsers.length,
              })
            }}
          </span>
          <div class="flex gap-2">
            <ElButton size="small" @click="handleBatchAssignRole">
              {{ $t('page.system.user.batchAssignRoles') }}
            </ElButton>
            <ElButton size="small" type="danger" @click="handleBatchDelete">
              {{ $t('page.system.user.batchDelete') }}
            </ElButton>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="flex justify-center py-4">
        <ElPagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <!-- 创建/编辑用户对话框 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <ElForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <ElFormItem :label="$t('page.system.user.form.name')" prop="name">
          <ElInput
            v-model="formData.name"
            :placeholder="$t('page.system.user.form.namePlaceholder')"
          />
        </ElFormItem>

        <ElFormItem :label="$t('page.system.user.form.phone')" prop="phone">
          <ElInput
            v-model="formData.phone"
            :placeholder="$t('page.system.user.form.phonePlaceholder')"
            :disabled="isEdit"
          />
        </ElFormItem>

        <ElFormItem :label="$t('page.system.user.form.email')" prop="email">
          <ElInput
            v-model="formData.email"
            :placeholder="$t('page.system.user.form.emailPlaceholder')"
          />
        </ElFormItem>

        <ElFormItem
          v-if="!isEdit"
          :label="$t('page.system.user.form.password')"
          prop="password"
        >
          <ElInput
            v-model="formData.password"
            type="password"
            :placeholder="$t('page.system.user.form.passwordPlaceholder')"
            show-password
          />
        </ElFormItem>

        <ElFormItem
          :label="$t('page.system.user.department')"
          prop="department"
        >
          <ElInput v-model="formData.department" :placeholder="请输入部门" />
        </ElFormItem>

        <ElFormItem
          :label="$t('page.system.user.form.assignRoles')"
          prop="roleIds"
        >
          <ElSelect
            v-model="formData.roleIds"
            multiple
            :placeholder="$t('page.system.user.form.assignRolesPlaceholder')"
            class="w-full"
          >
            <ElOption
              v-for="role in roleOptions"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="dialogVisible = false">
            {{ $t('page.system.cancel') }}
          </ElButton>
          <ElButton
            type="primary"
            @click="handleSubmit"
            :loading="submitLoading"
          >
            {{ $t('page.system.save') }}
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- 角色分配对话框 -->
    <ElDialog
      v-model="roleDialogVisible"
      :title="$t('page.system.user.assignRolesTitle')"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="mb-4">
        <h4 class="mb-2 text-lg font-medium">
          {{
            $t('page.system.user.assignRolesToUser', {
              name: currentUser?.name,
            })
          }}
        </h4>
        <p class="text-sm text-gray-500">
          {{ $t('page.system.user.assignRolesDescription') }}
        </p>
      </div>

      <ElCheckboxGroup v-model="selectedRoles" class="flex flex-col gap-2">
        <ElCheckbox
          v-for="role in roleOptions"
          :key="role.id"
          :label="role.id"
          class="mb-2"
        >
          <div class="flex items-center">
            <Icon :icon="getRoleIcon(role.code)" class="mr-2" size="16" />
            <span class="font-medium">{{ role.name }}</span>
            <ElTag
              v-if="role.description"
              type="info"
              size="small"
              class="ml-2"
            >
              {{ role.description }}
            </ElTag>
          </div>
        </ElCheckbox>
      </ElCheckboxGroup>

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="roleDialogVisible = false">
            {{ $t('page.system.cancel') }}
          </ElButton>
          <ElButton
            type="primary"
            @click="handleSaveRoles"
            :loading="roleLoading"
          >
            {{ $t('page.system.saveAssignment') }}
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- 重置密码对话框 -->
    <ElDialog
      v-model="passwordDialogVisible"
      :title="$t('page.system.user.resetPasswordTitle')"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="mb-4">
        <h4 class="mb-2 text-lg font-medium">
          {{
            $t('page.system.user.resetPasswordForUser', {
              name: currentUser?.name,
            })
          }}
        </h4>
        <p class="text-sm text-gray-500">
          {{ $t('page.system.user.resetPasswordDescription') }}
        </p>
      </div>

      <ElForm
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
      >
        <ElFormItem prop="newPassword">
          <ElInput
            v-model="passwordForm.newPassword"
            type="password"
            :placeholder="$t('page.system.user.form.newPasswordPlaceholder')"
            show-password
          />
        </ElFormItem>
        <ElFormItem prop="confirmPassword">
          <ElInput
            v-model="passwordForm.confirmPassword"
            type="password"
            :placeholder="
              $t('page.system.user.form.confirmPasswordPlaceholder')
            "
            show-password
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="passwordDialogVisible = false">
            {{ $t('page.system.cancel') }}
          </ElButton>
          <ElButton
            type="primary"
            @click="handleSavePassword"
            :loading="passwordLoading"
          >
            {{ $t('page.system.user.resetPassword') }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.user-management {
  padding: 16px;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 0;
}

.dialog-footer {
  text-align: right;
}
</style>
