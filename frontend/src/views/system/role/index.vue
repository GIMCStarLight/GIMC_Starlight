<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';

import type { PermissionApi } from '#/api/core/permission';
import type { RoleApi } from '#/api/core/role';

import { computed, h, nextTick, onMounted, reactive, ref, watch } from 'vue';

import { IconifyIcon as Icon } from '@vben/icons';

import PermissionSelector from './components/PermissionSelector.vue';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElLink,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
  ElTag,
  ElTransfer,
  ElTree,
} from 'element-plus';

import { useVbenVxeGrid, type VxeGridProps } from '#/adapter/vxe-table';

import { getPermissionTreeApi, getPermissionTreeSelectApi } from '#/api/core/permission';
import {
  assignRolePermissionsApi,
  assignRoleUsersApi,
  createRoleApi,
  deleteRoleApi,
  getRoleListApi,
  getRolePermissionsApi,
  getRoleAssignablePermissionsApi,
  getRoleTreeListApi,
  updateRoleApi,
} from '#/api/core/role';
import { getUserListApi } from '#/api/core/user';
import { $t } from '#/locales';

// 响应式数据
const loading = ref(false);
const roleList = ref<RoleApi.RoleInfo[]>([]);
const isTreeView = ref(true); // 默认使用树形视图
const searchForm = reactive({
  search: '',
  status: undefined as number | undefined,
});

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

// VxeTable配置 - 按照官网教程方式
const gridOptions: VxeGridProps = reactive({
  // 移除静态data绑定，改为动态加载
  data: [], // 初始化为空数组
  columns: [
    {
      title: '角色名称',
      field: 'name',
      minWidth: 200,
      treeNode: true,
      slots: {
        default: ({ row }) => {
          return h('div', { class: 'flex items-center' }, [
            h(Icon, {
              icon: getRoleIcon(row.code),
              class: 'mr-2 text-blue-500',
              size: 16
            }),
            h('span', { class: 'font-medium' }, row.name),
            row.code === 'super_admin' ? h(ElTag, {
              type: 'danger',
              size: 'small',
              class: 'ml-2'
            }, { default: () => '超级管理员' }) : null
          ]);
        }
      }
    },
    {
      title: '角色代码',
      field: 'code',
      width: 150,
      slots: {
        default: ({ row }) => {
          return h(ElTag, { type: 'info', size: 'small' }, { default: () => row.code });
        }
      }
    },
    {
      title: '描述',
      field: 'description',
      minWidth: 200,
      showOverflow: 'tooltip'
    },
    {
      title: '用户数量',
      field: 'userCount',
      width: 100,
      align: 'center',
      slots: {
        default: ({ row }) => {
          return h(ElLink, {
            type: 'primary',
            onClick: () => handleViewUsers(row)
          }, { default: () => row.userCount || 0 });
        }
      }
    },
    {
      title: '权限数量',
      field: 'permissionCount',
      width: 100,
      align: 'center',
      slots: {
        default: ({ row }) => {
          return h(ElLink, {
            type: 'success',
            onClick: () => handleAssignPermission(row)
          }, { default: () => row.permissionCount || 0 });
        }
      }
    },
    {
      title: '状态',
      field: 'status',
      width: 100,
      align: 'center',
      slots: {
        default: ({ row }) => {
          return h(ElSwitch, {
            modelValue: row.status,
            activeValue: 1,
            inactiveValue: 0,
            onChange: (value) => {
              row.status = value;
              handleStatusChange(row);
            }
          });
        }
      }
    },
    {
      title: '创建时间',
      field: 'createdAt',
      width: 180,
      slots: {
        default: ({ row }) => formatDate(row.createdAt)
      }
    },
    {
      title: '操作',
      field: 'actions',
      width: 280,
      fixed: 'right',
      slots: {
        default: ({ row }) => {
          return h('div', { class: 'flex gap-1' }, [
            h(ElButton, {
              type: 'primary',
              size: 'small',
              onClick: () => handleEdit(row)
            }, { default: () => h(Icon, { icon: 'lucide:edit', size: 14 }) }),
            h(ElButton, {
              type: 'success',
              size: 'small',
              onClick: () => handleAssignPermission(row)
            }, { default: () => h(Icon, { icon: 'lucide:shield-check', size: 14 }) }),
            h(ElButton, {
              type: 'warning',
              size: 'small',
              onClick: () => handleAssignUser(row)
            }, { default: () => h(Icon, { icon: 'lucide:users', size: 14 }) }),
            row.code !== 'super_admin' ? h(ElButton, {
              type: 'danger',
              size: 'small',
              onClick: () => handleDelete(row)
            }, { default: () => h(Icon, { icon: 'lucide:trash-2', size: 14 }) }) : null
          ]);
        }
      }
    }
  ],
  treeConfig: computed(() => {
     if (!isTreeView.value) {
       return undefined; // 列表模式下不使用树形配置
     }
     const config = {
       transform: false, // 数据已经是树形结构，不需要转换
       parentField: 'pid', // 父节点字段名（后端使用pid）
       rowField: 'id', // 行数据字段名
       childrenField: 'children', // 子节点字段名
       indent: 20, // 树形缩进
       showIcon: true, // 显示展开/收起图标
       expandAll: true, // 默认展开所有节点以查看树形效果
       accordion: false,
       trigger: 'default',
       lazy: false, // 禁用懒加载
       reserve: true // 保留展开状态
     };
     // 树形配置初始化
     return config;
   }),
  loading: computed(() => loading.value), // 修复loading属性类型错误，使用computed保持响应式
  // height: 'auto', // 移除height属性，让表格完全自适应内容高度
  border: true,
  showOverflow: true,
  keepSource: true,
  id: 'roleTreeTable',
  round: true,
  size: 'small',
  // stripe: true, // 树形表格不支持stripe，移除此属性
  align: 'left',
  pagerConfig: {
    enabled: false, // VxeTable内置分页禁用，使用外部ElPagination组件
  }
});

// 创建Grid实例 - 按照官网教程方式
const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

// 调试信息
// Grid配置初始化

// 对话框
const dialogVisible = ref(false);
const dialogTitle = ref('');
const isEdit = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance>();

// 表单数据
const formData = reactive<
  Partial<RoleApi.CreateRoleParams & { status: number }>
>({
  name: '',
  code: '',
  description: '',
  status: 1,
});

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    {
      min: 2,
      max: 50,
      message: '角色名称长度在 2 到 50 个字符',
      trigger: 'blur',
    },
  ],
  code: [
    { required: true, message: '请输入角色代码', trigger: 'blur' },
    {
      pattern: /^[a-z]\w*$/i,
      message: '角色代码必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur',
    },
  ],
};

// 权限相关
const permissionDialogVisible = ref(false);
const permissionLoading = ref(false);
const permissionTree = ref<PermissionApi.PermissionInfo[]>([]);
const selectedPermissions = ref<string[]>([]);
const currentRole = ref<null | RoleApi.RoleInfo>(null);

const treeProps = {
  children: 'children',
  label: 'name',
};

// 用户相关
const userDialogVisible = ref(false);
const userLoading = ref(false);
const userList = ref<{ disabled?: boolean; key: string; label: string }[]>([]);
const selectedUsers = ref<string[]>([]);
const userSearchKeyword = ref('');

// 计算属性
const dialogTitleComputed = computed(() => {
  return isEdit.value
    ? $t('page.system.editRole')
    : $t('page.system.createRole');
});

// 方法
const getRoleIcon = (code: string) => {
  const iconMap: Record<string, string> = {
    super_admin: 'lucide:crown',
    business_admin: 'lucide:briefcase',
    operator: 'lucide:settings',
    finance: 'lucide:dollar-sign',
    auditor: 'lucide:eye',
    read_only: 'lucide:eye-off',
    service_account: 'lucide:bot',
  };
  return iconMap[code] || 'lucide:user';
};

const getPermissionIcon = (data: any) => {
  // 如果是权限节点
  const permissionIconMap: Record<string, string> = {
    MENU: 'lucide:menu',
    API: 'lucide:code',
    BUTTON: 'lucide:mouse-pointer',
  };
  return permissionIconMap[data.type] || 'lucide:key';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

// 获取角色列表
const fetchRoleList = async () => {
  try {
    loading.value = true;
    // 开始获取角色列表数据
    const params: RoleApi.RoleListParams = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.search || undefined,
      status: searchForm.status !== undefined ? searchForm.status : undefined,
    };
    // 发送请求参数

    const response = await getRoleListApi(params);
    // 接收API响应
    
    const listData = response.data || response || [];
    const total = response.pagination?.total || response.total || 0;
    
    // 数据解析完成
    
    // 更新数据
    roleList.value = listData;
    pagination.total = total;
    
    // 更新VxeTable数据
    await nextTick();
    const dataArray = Array.isArray(listData) ? listData : [];
    // 准备加载数据
    
    // 使用loadData方法加载数据
    if (gridApi && gridApi.grid) {
      gridApi.grid.loadData(dataArray);
      // VxeTable数据加载完成
    } else {
      // 如果gridApi还未初始化，直接更新gridOptions
      gridOptions.data = dataArray;
      // VxeTable数据更新完成
    }
  } catch (error) {
    // 获取角色列表失败
    ElMessage.error('获取角色列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取角色树形列表
const fetchRoleTreeList = async () => {
  try {
    loading.value = true;
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.search || undefined,
      status: searchForm.status,
    };

    const response = await getRoleTreeListApi(params);
    
    const treeData = response.data || [];
    
    // 更新数据
    roleList.value = treeData;
    
    // 树形视图下计算实际总数（包括所有子节点）
    const calculateTotalNodes = (nodes: any[]): number => {
      let count = 0;
      nodes.forEach(node => {
        count += 1; // 当前节点
        if (node.children && node.children.length > 0) {
          count += calculateTotalNodes(node.children); // 递归计算子节点
        }
      });
      return count;
    };
    
    const actualTotal = calculateTotalNodes(treeData);
     pagination.total = actualTotal;
     
     // 更新gridOptions的data属性
     await nextTick();
     const dataArray = Array.isArray(treeData) ? treeData : [];
     
     // 使用loadData方法加载数据
     if (gridApi && gridApi.grid) {
       gridApi.grid.loadData(dataArray);
     } else {
       // 如果gridApi还未初始化，直接更新gridOptions
       gridOptions.data = dataArray;
     }
  } catch (error) {
    // 获取角色树形列表失败
    ElMessage.error('获取角色树形列表失败');
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pagination.page = 1;
  // 根据视图模式加载对应的数据
  loadData();
};

// 重置搜索
const handleReset = () => {
  searchForm.search = '';
  searchForm.status = undefined;
  pagination.page = 1;
  // 根据视图模式加载对应的数据
  loadData();
};

// 分页事件处理
const handlePageChange = (page: number) => {
  pagination.page = page;
  loadData();
};

const handleSizeChange = (size: number) => {
  pagination.limit = size;
  pagination.page = 1;
  loadData();
};

// 刷新
const handleRefresh = () => {
  // 根据视图模式加载对应的数据
  loadData();
};

// 创建角色
const handleCreate = () => {
  isEdit.value = false;
  dialogTitle.value = $t('page.system.createRole');
  resetForm();
  dialogVisible.value = true;
};

// 编辑角色
const handleEdit = (role: RoleApi.RoleInfo) => {
  isEdit.value = true;
  dialogTitle.value = $t('page.system.editRole');
  Object.assign(formData, {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    status: role.status,
  });
  dialogVisible.value = true;
};

// 删除角色
const handleDelete = async (role: RoleApi.RoleInfo) => {
  try {
    await ElMessageBox.confirm(
      `确认删除角色 "${role.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    await deleteRoleApi(role.id);
    ElMessage.success('删除成功');
    fetchRoleTreeList();
  } catch (error) {
    if (error !== 'cancel') {
      // 删除角色失败
      ElMessage.error('删除角色失败');
    }
  }
};

// 状态切换
const handleStatusChange = async (role: RoleApi.RoleInfo) => {
  try {
    await updateRoleApi(role.id, { status: role.status });
    ElMessage.success('状态更新成功');
    // 不刷新数据，直接更新本地状态，避免闪烁
  } catch (error) {
    // 更新状态失败
    ElMessage.error('更新状态失败');
    // 恢复原状态
    role.status = role.status === 1 ? 0 : 1;
  }
};

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    code: '',
    description: '',
    status: 1,
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
      await updateRoleApi(formData.id!, {
        name: formData.name!,
        description: formData.description,
        status: formData.status,
      });
      ElMessage.success('更新成功');
    } else {
      await createRoleApi({
        name: formData.name!,
        code: formData.code!,
        description: formData.description,
      });
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    fetchRoleTreeList();
  } catch (error) {
    // 保存失败
    ElMessage.error('保存失败');
  } finally {
    submitLoading.value = false;
  }
};

// 分配权限
const handleAssignPermission = async (role: RoleApi.RoleInfo) => {
  currentRole.value = role;
  
  try {
    // 先获取角色的当前权限
    const rolePermissionsResponse = await getRolePermissionsApi(role.id);
    // 获取角色当前权限
    
    // 初始化选中的权限ID
    selectedPermissions.value = (rolePermissionsResponse || []).map((p: any) => p.id);
    // 初始化选中权限

    // 获取角色可分配的权限（父角色已有的权限）
    const assignablePermissionsResponse = await getRoleAssignablePermissionsApi(role.id);
    // 获取可分配权限
    
    // 将可分配的权限转换为树形结构
    const assignablePermissionIds = (assignablePermissionsResponse || []).map((p: any) => p.id);
    
    // 获取完整的权限树
    const response = await getPermissionTreeSelectApi();
    // 获取权限树数据
    
    // 过滤权限树，只显示可分配的权限
    const filterTree = (nodes: any[]): any[] => {
      return nodes.filter(node => {
        if (assignablePermissionIds.includes(node.id)) {
          return true;
        }
        if (node.children && node.children.length > 0) {
          const filteredChildren = filterTree(node.children);
          if (filteredChildren.length > 0) {
            node.children = filteredChildren;
            return true;
          }
        }
        return false;
      });
    };

    const filteredTree = filterTree(response);
    permissionTree.value = filteredTree;
    
    // 权限树数据处理完成

    permissionDialogVisible.value = true;
  } catch (error) {
    // 获取权限信息失败
    ElMessage.error('获取权限信息失败');
  }
};

// 保存权限分配
const handleSavePermissions = async () => {
  if (!currentRole.value) return;

  try {
    permissionLoading.value = true;
    
    // 直接使用 selectedPermissions，它已经包含了所有选中的权限ID
    const permissionIds = selectedPermissions.value.filter(id => 
      typeof id === 'string' && /^\d+$/.test(id)
    );

    // 准备分配权限

    const result = await assignRolePermissionsApi({
      roleId: currentRole.value.id,
      permissionIds: permissionIds,
    });
    
    // 权限分配完成

    ElMessage.success('权限分配成功');
    permissionDialogVisible.value = false;
    
    // 权限分配成功后，刷新角色列表以更新权限数量
    await fetchRoleTreeList();
    
    // 同时更新当前角色的权限信息
    if (currentRole.value) {
      const updatedRole = roleList.value.find(r => r.id === currentRole.value.id);
      if (updatedRole) {
        currentRole.value = updatedRole;
      }
    }
  } catch (error) {
    // 权限分配失败
    ElMessage.error('权限分配失败');
  } finally {
    permissionLoading.value = false;
  }
};

// 分配用户
const handleAssignUser = async (role: RoleApi.RoleInfo) => {
  currentRole.value = role;

  try {
    // 获取用户列表
    const response = await getUserListApi({ limit: 1000 });
    const users = response.data || [];
    userList.value = users.map((user) => ({
      key: user.id,
      label: `${user.name} (${user.phone})`,
      disabled: false,
    }));

    // 获取当前角色的用户
    selectedUsers.value = users
      .filter((user) => user.roles?.some((r) => r.id === role.id))
      .map((user) => user.id);

    userDialogVisible.value = true;
  } catch (error) {
    // 获取用户列表失败
    ElMessage.error('获取用户列表失败');
  }
};

// 用户搜索
const handleUserSearch = (keyword: string) => {
  // 这里可以实现用户搜索逻辑
  // 搜索用户
};

// 保存用户分配
const handleSaveUsers = async () => {
  if (!currentRole.value) return;

  try {
    userLoading.value = true;

    // 调用分配用户的API
    await assignRoleUsersApi({
      roleId: currentRole.value.id,
      userIds: selectedUsers.value,
    });

    ElMessage.success('用户分配成功');
    userDialogVisible.value = false;
    fetchRoleTreeList();
  } catch (error) {
    // 用户分配失败
    ElMessage.error('用户分配失败');
  } finally {
    userLoading.value = false;
  }
};

// 查看用户
const handleViewUsers = (role: RoleApi.RoleInfo) => {
  // 跳转到用户管理页面，并筛选该角色的用户
  // 查看角色用户
};

// 切换视图模式
const toggleViewMode = () => {
  isTreeView.value = !isTreeView.value;
  // 根据视图模式加载对应的数据
  loadData();
};

// 统一数据加载函数
const loadData = () => {
  if (isTreeView.value) {
    fetchRoleTreeList();
  } else {
    fetchRoleList();
  }
};

// 生命周期
onMounted(() => {
  // 根据视图模式加载对应的数据
  loadData();
});
// 监听分页变化
watch(
  () => [pagination.page, pagination.limit],
  () => {
    // 根据视图模式加载对应的数据
    loadData();
  },
  { deep: true },
);
</script>

<template>
  <div class="role-management">
    <!-- 页面头部 -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold">{{ $t('page.system.roleGroup') }}</h2>
        <p class="mt-1 text-sm text-gray-500">管理系统角色和权限分配</p>
      </div>
      <div class="flex gap-2">
        <ElButton type="primary" @click="handleCreate">
          <Icon icon="lucide:plus" class="mr-1" />
          {{ $t('page.system.createRole') }}
        </ElButton>
        <ElButton @click="handleRefresh">
          <Icon icon="lucide:refresh-cw" class="mr-1" />
          刷新
        </ElButton>
        <ElButton 
          :type="isTreeView ? 'primary' : 'default'" 
          @click="toggleViewMode"
        >
          <Icon :icon="isTreeView ? 'lucide:list' : 'lucide:tree-pine'" class="mr-1" />
          {{ isTreeView ? '列表视图' : '树形视图' }}
        </ElButton>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="mb-4 rounded-lg bg-background p-4 shadow-sm border">
      <ElForm :model="searchForm" inline>
        <ElFormItem label="角色名称">
          <ElInput
            v-model="searchForm.search"
            placeholder="请输入角色名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px;"
          >
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
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

    <!-- 角色列表表格 -->
    <div class="rounded-lg bg-background shadow-sm border p-4">
      <Grid />

      <!-- 分页 - 仅在列表视图下显示 -->
      <div v-if="!isTreeView" class="flex justify-center py-4">
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

    <!-- 创建/编辑角色对话框 -->
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
        <ElFormItem label="角色名称" prop="name">
          <ElInput v-model="formData.name" placeholder="请输入角色名称" />
        </ElFormItem>
        <ElFormItem label="角色代码" prop="code">
          <ElInput
            v-model="formData.code"
            placeholder="请输入角色代码（英文）"
            :disabled="isEdit"
          />
        </ElFormItem>
        <ElFormItem label="角色描述" prop="description">
          <ElInput
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElRadioGroup v-model="formData.status">
            <ElRadio :label="1">启用</ElRadio>
            <ElRadio :label="0">禁用</ElRadio>
          </ElRadioGroup>
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

    <!-- 权限分配对话框 -->
    <ElDialog
      v-model="permissionDialogVisible"
      title="分配权限"
      width="1100px"
      :close-on-click-modal="false"
    >
      <div class="mb-4">
        <h4 class="mb-2 text-lg font-medium">
          为角色 "{{ currentRole?.name }}" 分配权限
        </h4>
        <p class="text-sm text-gray-500">请选择该角色应该拥有的权限</p>
      </div>

      <PermissionSelector
        v-model="selectedPermissions"
        :permission-tree="permissionTree"
      />

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="permissionDialogVisible = false">取消</ElButton>
          <ElButton
            type="primary"
            @click="handleSavePermissions"
            :loading="permissionLoading"
          >
            保存权限
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- 用户分配对话框 -->
    <ElDialog
      v-model="userDialogVisible"
      title="分配用户"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="mb-4">
        <h4 class="mb-2 text-lg font-medium">
          为角色 "{{ currentRole?.name }}" 分配用户
        </h4>
        <p class="text-sm text-gray-500">选择应该拥有此角色的用户</p>
      </div>

      <!-- 用户搜索 -->
      <div class="mb-4">
        <ElInput
          v-model="userSearchKeyword"
          placeholder="搜索用户"
          clearable
          @input="handleUserSearch"
        >
          <template #prefix>
            <Icon icon="lucide:search" size="16" />
          </template>
        </ElInput>
      </div>

      <!-- 用户列表 -->
      <ElTransfer
        v-model="selectedUsers"
        :data="userList"
        :titles="['可选用户', '已选用户']"
        :button-texts="['移除', '添加']"
        :format="{
          noChecked: '${total}',
          hasChecked: '${checked}/${total}',
        }"
        filterable
        filter-placeholder="搜索用户"
      />

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="userDialogVisible = false">取消</ElButton>
          <ElButton
            type="primary"
            @click="handleSaveUsers"
            :loading="userLoading"
          >
            保存分配
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.role-management {
  padding: 16px;
}

.permission-tree {
  max-height: 400px;
  padding: 8px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

:deep(.el-tree-node__content) {
  height: 32px;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 0;
}

.dialog-footer {
  text-align: right;
}

/* 树形展开按钮样式 - 使用箭头图标 */
:deep(.vxe-table .vxe-tree--expand-btn) {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.vxe-table .vxe-tree--expand-btn::before) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 5px solid #6b7280;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transform: translate(-50%, -50%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 展开状态的箭头 */
:deep(.vxe-table .vxe-tree-node--expand .vxe-tree--expand-btn::before) {
  transform: translate(-50%, -50%) rotate(90deg);
  border-left-color: #3b82f6;
}

/* 树形节点缩进线 */
:deep(.vxe-table .vxe-tree--line-wrapper) {
  opacity: 0.3;
}
</style>
