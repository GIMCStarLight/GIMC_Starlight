<script setup lang="ts">
import { log } from '../../../utils/logger'
import type { FormInstance, FormRules } from 'element-plus';

import type { PermissionApi } from '#/api/core/permission';

import { computed, h, nextTick, onMounted, reactive, ref, watch } from 'vue';

import { IconifyIcon as Icon } from '@vben/icons';

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
  ElTree,
  ElTreeSelect,
} from 'element-plus';

import { useVbenVxeGrid, type VxeGridProps } from '#/adapter/vxe-table';

import {
  createPermissionApi,
  deletePermissionApi,
  getPermissionListApi,
  getPermissionTreeApi,
  getPermissionTreeListApi,
  getPermissionTreeSelectApi,
  updatePermissionApi,
} from '#/api/core/permission';
import { $t } from '#/locales';

// 响应式数据
const loading = ref(false);
const permissionList = ref<PermissionApi.PermissionInfo[]>([]);
const permissionTreeOptions = ref<PermissionApi.PermissionInfo[]>([]);
const isTreeView = ref(true); // 默认使用树形视图
const searchForm = reactive({
  search: '',
  type: undefined as string | undefined,
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
  Partial<PermissionApi.CreatePermissionParams & { status: number }>
>({
  name: '',
  code: '',
  type: 'MENU',
  resource: '',
  action: '',
  description: '',
  parentId: undefined,
});

// 监听资源和操作标识变化，生成权限代码
watch(
  [() => formData.resource, () => formData.action],
  ([resource, action]) => {
    if (resource && action) {
      formData.code = `${resource}:${action}`;
    }
  },
);

// 树形选择器属性
const treeSelectProps = {
  children: 'children',
  label: 'name',
  value: 'id',
};

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入权限名称', trigger: 'blur' },
    {
      min: 2,
      max: 50,
      message: '权限名称长度在 2 到 50 个字符',
      trigger: 'blur',
    },
  ],
  code: [
    {
      pattern: /^[a-z][\w:]*$/i,
      message: '权限代码必须以字母开头，只能包含字母、数字、下划线和冒号',
      trigger: 'blur',
    },
  ],
  type: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
  resource: [
    { required: true, message: '请输入资源标识', trigger: 'blur' },
    {
      pattern: /^[a-z][\w]*$/i,
      message: '资源标识必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur',
    },
  ],
  action: [
    { required: true, message: '请输入操作标识', trigger: 'blur' },
    {
      pattern: /^[a-z][\w]*$/i,
      message: '操作标识必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur',
    },
  ],
};

// VxeTable配置 - 按照角色管理页面的方式
const gridOptions: VxeGridProps = reactive({
  // 移除静态data绑定，改为动态加载
  data: [], // 初始化为空数组
  columns: [
    {
      title: '权限名称',
      field: 'name',
      minWidth: 200,
      treeNode: true,
      slots: {
        default: ({ row }) => {
          return h('div', { class: 'flex items-center' }, [
            h(Icon, {
              icon: getPermissionIcon(row.type, row.resource),
              class: 'mr-2 text-blue-500',
              size: 16
            }),
            h('span', { class: 'font-medium' }, row.name),
            h(ElTag, {
              type: getTypeTagType(row.type),
              size: 'small',
              class: 'ml-2'
            }, { default: () => getTypeLabel(row.type) })
          ]);
        }
      }
    },
    {
      title: '权限代码',
      field: 'code',
      width: 180,
      slots: {
        default: ({ row }) => {
          return h(ElTag, { type: 'info', size: 'small' }, { default: () => row.code });
        }
      }
    },
    {
      title: '类型',
      field: 'type',
      width: 100,
      align: 'center',
      slots: {
        default: ({ row }) => {
          return h(ElTag, {
            type: getTypeTagType(row.type),
            size: 'small'
          }, { default: () => getTypeLabel(row.type) });
        }
      }
    },
    {
      title: '资源',
      field: 'resource',
      width: 150,
      showOverflow: 'tooltip'
    },
    {
      title: '操作',
      field: 'action',
      width: 120,
      showOverflow: 'tooltip'
    },
    {
      title: '描述',
      field: 'description',
      minWidth: 200,
      showOverflow: 'tooltip'
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
              onClick: () => handleCreateChild(row)
            }, { default: () => h(Icon, { icon: 'lucide:plus', size: 14 }) }),
            h(ElButton, {
              type: 'danger',
              size: 'small',
              onClick: () => handleDelete(row)
            }, { default: () => h(Icon, { icon: 'lucide:trash-2', size: 14 }) })
          ]);
        }
      }
    }
  ],
  treeConfig: computed(() => {
     if (!isTreeView.value) {
       return undefined; // 列表模式下不使用树形配置
     }
     return {
       transform: false, // 数据已经是树形结构，不需要转换
       parentField: 'parentId', // 父节点字段名
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
   }),
  loading: computed(() => loading.value), // 修复loading属性类型错误，使用computed保持响应式
  border: true,
  showOverflow: true,
  keepSource: true,
  id: 'permissionTreeTable',
  round: true,
  size: 'small',
  align: 'left',
  pagerConfig: {
    enabled: false, // VxeTable内置分页禁用，使用外部ElPagination组件
  }
});

// 创建Grid实例 - 按照官网教程方式
const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

// 计算属性
const dialogTitleComputed = computed(() => {
  return isEdit.value
    ? $t('page.system.editPermission')
    : $t('page.system.createPermission');
});



// 方法
const getPermissionIcon = (type: string, resource?: string) => {
  switch (type) {
    case 'API': {
      return 'lucide:api';
    }
    case 'BUTTON': {
      return 'lucide:mouse-pointer-click';
    }
    case 'MENU': {
      const resourceIconMap: Record<string, string> = {
        user: 'lucide:user',
        role: 'lucide:users',
        permission: 'lucide:shield-check',
        system: 'lucide:settings',
        dashboard: 'lucide:layout-dashboard',
      };
      return resourceIconMap[resource || ''] || 'lucide:menu';
    }
    case 'CATALOG': {
      return 'lucide:folder';
    }
    default: {
      return 'lucide:key';
    }
  }
};

const getPermissionIconColor = (type: string) => {
  switch (type) {
    case 'MENU': {
      return 'text-blue-500';
    }
    case 'BUTTON': {
      return 'text-green-500';
    }
    case 'API': {
      return 'text-orange-500';
    }
    case 'CATALOG': {
      return 'text-purple-500';
    }
    default: {
      return 'text-gray-500';
    }
  }
};

const getTypeTagType = (type: string) => {
  switch (type) {
    case 'API': {
      return 'warning';
    }
    case 'BUTTON': {
      return 'danger';
    }
    case 'MENU': {
      return 'success';
    }
    case 'CATALOG': {
      return 'info';
    }
    default: {
      return '';
    }
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'API': {
      return '接口';
    }
    case 'BUTTON': {
      return '按钮';
    }
    case 'MENU': {
      return '菜单';
    }
    case 'CATALOG': {
      return '目录';
    }
    default: {
      return type;
    }
  }
};

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 获取权限列表
const fetchPermissionList = async () => {
  try {
    loading.value = true;
    const params: PermissionApi.PermissionListParams = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.search || undefined,
      type: searchForm.type,
      status: searchForm.status,
    };

    const response = await getPermissionListApi(params, { responseReturn: 'raw' });
    
    log.debug('列表视图API响应:', response);
    log.debug('响应类型:', typeof response);
    log.debug('是否为数组:', Array.isArray(response));
    
    let listData = [];
    let total = 0;
    
    // 检查响应格式
     if (Array.isArray(response)) {
       // 如果直接返回数组（可能是中间件处理后的结果）
       listData = response;
       total = response.length; // 临时使用数组长度作为总数
       log.debug('直接数组响应，数据长度:', total);
     } else if (response && response.data && response.data.code === 200) {
       // 标准API响应格式
       const responseData = response.data;
       listData = responseData.data || [];
       
       // 使用后端返回的完整分页信息 - 参考达人页面的处理方式
       if (responseData.pagination) {
         const paginationInfo = responseData.pagination;
         pagination.page = paginationInfo.page || 1;
         pagination.limit = paginationInfo.pageSize || 10;  // 后端返回的是 pageSize
         pagination.total = paginationInfo.total || 0;
         
         log.debug('分页信息解析:', {
           原始分页数据: paginationInfo,
           解析后: {
             page: pagination.page,
             limit: pagination.limit,
             total: pagination.total
           }
         });
       } else {
         // 如果没有pagination信息，使用数组长度作为临时方案
         pagination.total = listData.length;
         log.warn('后端未返回pagination信息，使用数组长度作为total:', pagination.total);
       }
       
       log.debug('标准API响应格式，数据长度:', listData.length, '总数:', pagination.total);
     } else if (response && response.code === 200) {
       // 可能是已经解包的响应
       listData = response.data || [];
       
       // 使用后端返回的完整分页信息
       if (response.pagination) {
         const paginationInfo = response.pagination;
         pagination.page = paginationInfo.page || 1;
         pagination.limit = paginationInfo.pageSize || 10;  // 后端返回的是 pageSize
         pagination.total = paginationInfo.total || 0;
         
         log.debug('分页信息解析:', {
           原始分页数据: paginationInfo,
           解析后: {
             page: pagination.page,
             limit: pagination.limit,
             total: pagination.total
           }
         });
       } else {
         pagination.total = listData.length;
         log.warn('后端未返回pagination信息，使用数组长度作为total:', pagination.total);
       }
       
       log.debug('解包响应格式，数据长度:', listData.length, '总数:', pagination.total);
     } else {
       log.error('未知的API响应格式:', response);
     }
     
     // 更新数据
     permissionList.value = listData;
    
    // 更新VxeTable数据
    await nextTick();
    const dataArray = Array.isArray(listData) ? listData : [];
    
    // 使用loadData方法加载数据
    if (gridApi && gridApi.grid) {
      gridApi.grid.loadData(dataArray);
    } else {
      // 如果gridApi还未初始化，直接更新gridOptions
      gridOptions.data = dataArray;
    }
    
    log.debug('最终设置的数据:', {
      listData: listData.length,
      total: pagination.total,
      gridData: dataArray.length
    });
    
  } catch (error) {
    log.error('获取权限列表失败:', error);
    ElMessage.error('获取权限列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取权限树形列表
const fetchPermissionTreeList = async () => {
  try {
    loading.value = true;
    const params = {
      search: searchForm.search || undefined,
      type: searchForm.type,
      status: searchForm.status,
    };

    const response = await getPermissionTreeListApi(params);
    
    const treeData = response.data || [];
    const total = response.total || 0;
    
    // 更新数据
    permissionList.value = treeData;
    pagination.total = total;
    
    // 更新VxeTable数据
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
    // 获取权限树形列表失败
    ElMessage.error('获取权限树形列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取权限树形选项
const fetchPermissionTreeOptions = async () => {
  try {
    const response = await getPermissionTreeSelectApi();
    permissionTreeOptions.value = response;
  } catch (error) {
    // 获取权限树失败
  }
};

// 搜索
const handleSearch = () => {
  if (isTreeView.value) {
    fetchPermissionTreeList();
  } else {
    fetchPermissionList();
  }
};

// 重置搜索
const handleReset = () => {
  searchForm.search = '';
  searchForm.type = undefined;
  searchForm.status = undefined;
  if (isTreeView.value) {
    fetchPermissionTreeList();
  } else {
    fetchPermissionList();
  }
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
  if (isTreeView.value) {
    fetchPermissionTreeList();
  } else {
    fetchPermissionList();
  }
  fetchPermissionTreeOptions();
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
    fetchPermissionTreeList();
  } else {
    fetchPermissionList();
  }
};



// 创建权限
const handleCreate = () => {
  isEdit.value = false;
  dialogTitle.value = $t('page.system.createPermission');
  resetForm();
  dialogVisible.value = true;
};

// 创建子权限
const handleCreateChild = (parent: PermissionApi.PermissionInfo) => {
  isEdit.value = false;
  dialogTitle.value = `创建子权限 - ${parent.name}`;
  resetForm();
  formData.parentId = parent.id;
  dialogVisible.value = true;
};

// 编辑权限
const handleEdit = (permission: PermissionApi.PermissionInfo) => {
  isEdit.value = true;
  dialogTitle.value = $t('page.system.editPermission');
  Object.assign(formData, {
    id: permission.id,
    name: permission.name,
    code: permission.code,
    type: permission.type,
    resource: permission.resource,
    action: permission.action,
    description: permission.description,
    parentId: permission.parentId,
    sort: permission.sort,
    status: permission.status,
  });
  dialogVisible.value = true;
};

// 删除权限
const handleDelete = async (permission: PermissionApi.PermissionInfo) => {
  try {
    await ElMessageBox.confirm(
      `确认删除权限 "${permission.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    await deletePermissionApi(permission.id);
    ElMessage.success('删除成功');
    fetchPermissionList();
    fetchPermissionTreeOptions();
  } catch (error) {
    if (error !== 'cancel') {
      // 删除权限失败
      ElMessage.error('删除权限失败');
    }
  }
};

// 状态切换
const handleStatusChange = async (permission: PermissionApi.PermissionInfo) => {
  try {
    await updatePermissionApi(permission.id, { status: permission.status });
    ElMessage.success('状态更新成功');
  } catch (error) {
    // 更新状态失败
    ElMessage.error('更新状态失败');
    // 恢复原状态
    permission.status = permission.status === 1 ? 0 : 1;
  }
};

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    code: '',
    type: 'MENU',
    resource: '',
    action: '',
    description: '',
    parentId: undefined,
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
      await updatePermissionApi(formData.id!, {
        name: formData.name!,
        code: formData.code!,
        type: formData.type as any,
        resource: formData.resource,
        action: formData.action,
        description: formData.description,
        parentId: formData.parentId,
      });
      ElMessage.success('更新成功');
    } else {
      await createPermissionApi({
        name: formData.name!,
        code: formData.code!,
        type: formData.type as any,
        resource: formData.resource,
        action: formData.action,
        description: formData.description,
        parentId: formData.parentId,
      });
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    if (isTreeView.value) {
      fetchPermissionTreeList();
    } else {
      fetchPermissionList();
    }
    fetchPermissionTreeOptions();
  } catch (error) {
    // 保存失败
    ElMessage.error('保存失败');
  } finally {
    submitLoading.value = false;
  }
};

// 生命周期
onMounted(() => {
  // 根据视图模式加载对应的数据
  loadData();
  fetchPermissionTreeOptions();
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
  <div class="permission-management">
    <!-- 页面头部 -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold">
          {{ $t('page.system.permissionManagement') }}
        </h2>
        <p class="mt-1 text-sm text-gray-500">管理系统权限和资源访问控制</p>
      </div>
      <div class="flex gap-2">
        <ElButton type="primary" @click="handleCreate">
          <Icon icon="lucide:plus" class="mr-1" />
          {{ $t('page.system.createPermission') }}
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
        <ElFormItem label="权限名称">
          <ElInput
            v-model="searchForm.search"
            placeholder="请输入权限名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </ElFormItem>
        <ElFormItem label="权限类型">
          <ElSelect
            v-model="searchForm.type"
            placeholder="请选择类型"
            clearable
            style="width: 120px;"
          >
            <ElOption label="菜单" value="MENU" />
            <ElOption label="按钮" value="BUTTON" />
            <ElOption label="接口" value="API" />
            <ElOption label="字段" value="FIELD" />
          </ElSelect>
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

    <!-- 权限列表表格 -->
    <div class="rounded-lg bg-background shadow-sm border p-4">
      <Grid />

      <!-- 分页 -->
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

    <!-- 创建/编辑权限对话框 -->
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
        <ElFormItem label="权限名称" prop="name">
          <ElInput v-model="formData.name" placeholder="请输入权限名称" />
        </ElFormItem>

        <ElFormItem label="权限代码" prop="code">
          <ElInput
            v-model="formData.code"
            placeholder="自动生成：资源:操作"
            readonly
            style="background-color: #f5f7fa;"
          />
          <div class="text-xs text-gray-500 mt-1">
            权限代码将自动根据资源标识和操作标识生成
          </div>
        </ElFormItem>

        <ElFormItem label="权限类型" prop="type">
          <ElSelect
            v-model="formData.type"
            placeholder="请选择权限类型"
            class="w-full"
          >
            <ElOption label="菜单" value="MENU" />
            <ElOption label="按钮" value="BUTTON" />
            <ElOption label="接口" value="API" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="上级权限" prop="parentId">
          <ElTreeSelect
            v-model="formData.parentId"
            :data="permissionTreeOptions"
            :props="treeSelectProps"
            placeholder="请选择上级权限（可选）"
            clearable
            check-strictly
            class="w-full"
          />
        </ElFormItem>

        <ElFormItem label="资源" prop="resource">
          <ElInput v-model="formData.resource" placeholder="请输入资源标识" />
        </ElFormItem>

        <ElFormItem label="操作" prop="action">
          <ElInput v-model="formData.action" placeholder="请输入操作标识" />
        </ElFormItem>

        <ElFormItem label="描述" prop="description">
          <ElInput v-model="formData.description" placeholder="请输入权限描述" />
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
  </div>
</template>

<style scoped>
.permission-management {
  padding: 16px;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 0;
}

.dialog-footer {
  text-align: right;
}

.permission-tree {
  :deep(.el-tree-node__content) {
    height: auto;
    padding: 8px 0;
  }

  :deep(.el-tree-node__expand-icon) {
    padding: 6px;
  }
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
