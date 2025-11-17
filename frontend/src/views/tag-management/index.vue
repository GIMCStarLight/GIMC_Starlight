<template>
  <div class="tag-management">
    <!-- 页面头部 -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold">标签管理</h2>
        <p class="mt-1 text-sm text-gray-500">管理系统标签和分类信息</p>
      </div>
      <div class="flex gap-2">
        <el-button type="primary" @click="handleCreate">
          <Icon icon="lucide:plus" class="mr-1" />
          新建标签
        </el-button>
        <el-button @click="handleRefresh">
          <Icon icon="lucide:refresh-cw" class="mr-1" />
          刷新
        </el-button>
        <el-button 
          :type="viewMode === 'tree' ? 'primary' : 'default'" 
          @click="toggleViewMode"
        >
          <Icon :icon="viewMode === 'tree' ? 'lucide:list' : 'lucide:tree-pine'" class="mr-1" />
          {{ viewMode === 'tree' ? '列表视图' : '树形视图' }}
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="mb-4 rounded-lg bg-background p-4 shadow-sm border">
      <el-form :model="queryParams" inline>
        <el-form-item label="标签名称">
          <el-input
            v-model="queryParams.name"
            placeholder="请输入标签名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="平台">
          <el-select
            v-model="queryParams.platform"
            placeholder="请选择平台"
            clearable
            style="width: 120px;"
          >
            <el-option label="星图" value="星图" />
            <el-option label="花火" value="花火" />
            <el-option label="蒲公英" value="蒲公英" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryParams.isActive"
            placeholder="请选择状态"
            clearable
            style="width: 120px;"
          >
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <Icon icon="lucide:search" class="mr-1" />
            搜索
          </el-button>
          <el-button @click="handleReset">
            <Icon icon="lucide:rotate-ccw" class="mr-1" />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 标签列表表格 -->
    <div class="rounded-lg bg-background shadow-sm border p-4">
      <!-- 树形视图 -->
      <div v-if="viewMode === 'tree'">
        <Grid />
      </div>

      <!-- 列表视图 -->
      <div v-else>
        <!-- 批量操作栏 -->
        <div v-if="selectedRows?.length" class="mb-4 flex items-center gap-2">
          <el-checkbox
            v-model="isAllSelected"
            :indeterminate="isIndeterminate"
            @change="handleSelectAll"
          >
            全选
          </el-checkbox>
          <el-button
            type="danger"
            size="small"
            @click="handleBatchDelete"
          >
            批量删除 ({{ selectedRows?.length || 0 }})
          </el-button>
          <el-button
            type="warning"
            size="small"
            @click="handleBatchToggleStatus"
          >
            批量切换状态
          </el-button>
        </div>

        <el-table
          v-loading="loading"
          :data="tableData"
          @selection-change="handleSelectionChange"
          border
          stripe
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="标签名称" min-width="150" />
          <el-table-column prop="code" label="标签代码" width="120" />
          <el-table-column prop="platform" label="平台" width="100">
            <template #default="{ row }">
              <el-tag :type="getPlatformTagType(row.platform)" size="small">
                {{ getPlatformText(row.platform) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="父级标签" width="150">
            <template #default="{ row }">
              {{ row.parent?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column prop="isActive" label="状态" width="80">
            <template #default="{ row }">
              <el-switch
                v-model="row.isActive"
                @change="handleToggleStatus(row)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <div class="flex gap-1">
                <el-button type="primary" size="small" @click="handleEdit(row)">
                  <Icon icon="lucide:edit" :size="14" />
                </el-button>
                <el-button type="success" size="small" @click="handleAddChild(row)">
                  <Icon icon="lucide:plus" :size="14" />
                </el-button>
                <el-button type="danger" size="small" @click="handleDelete(row)">
                  <Icon icon="lucide:trash-2" :size="14" />
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-center py-4">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入标签名称" />
        </el-form-item>
        
        <el-form-item label="标签代码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入标签代码（可选）" />
        </el-form-item>
        
        <el-form-item label="所属平台" prop="platform">
          <el-select v-model="formData.platform" placeholder="请选择平台">
            <el-option label="星图" value="星图" />
            <el-option label="花火" value="花火" />
            <el-option label="蒲公英" value="蒲公英" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="父级标签" prop="parentId">
          <el-cascader
            v-model="formData.parentPath"
            :options="parentOptions"
            :props="cascaderProps"
            placeholder="选择父级标签（可选）"
            clearable
            @change="handleFormParentChange"
          />
        </el-form-item>
        
        <el-form-item label="标签描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入标签描述（可选）"
          />
        </el-form-item>
        
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="formData.sort" :min="0" :max="9999" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入标签" width="500px">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :on-change="handleFileChange"
        :before-upload="handleBeforeUpload"
        accept=".csv,.xlsx,.xls"
        drag
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 CSV、Excel 格式，文件大小不超过 10MB
          </div>
        </template>
      </el-upload>
      
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImportSubmit" :loading="importing">
          开始导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, h } from 'vue'
import { ElMessage, ElMessageBox, ElButton, ElTag, ElSwitch } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import { useVbenVxeGrid, type VxeGridProps } from '#/adapter/vxe-table'
import {
  getTags,
  getTagTree,
  createTag,
  updateTag,
  deleteTag,
  deleteTags,
  type Tag,
  type TagTreeNode,
  type QueryTagDto,
  type CreateTagDto,
  type UpdateTagDto
} from '#/api/tag'
import { requestClient } from '#/api/request'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const importing = ref(false)
const viewMode = ref<'table' | 'tree'>('tree')
const dialogVisible = ref(false)
const importDialogVisible = ref(false)
const isEdit = ref(false)
const currentEditId = ref<number | null>(null)

// VxeTable配置
const gridOptions: VxeGridProps = reactive({
  data: [],
  columns: [
    {
      title: '标签名称',
      field: 'name',
      minWidth: 200,
      treeNode: true,
      slots: {
        default: ({ row }) => {
          return h('div', { class: 'flex items-center' }, [
            h(Icon, {
              icon: getTagIcon(row.level || 1),
              class: 'mr-2 text-blue-500',
              size: 16
            }),
            h('span', { class: 'font-medium' }, row.name || ''),
            row.code ? h(ElTag, {
              type: 'info',
              size: 'small',
              class: 'ml-2'
            }, { default: () => row.code }) : null
          ]);
import { log } from '#/utils/logger';
        }
      }
    },
    {
      title: '平台',
      field: 'platform',
      width: 100,
      slots: {
        default: ({ row }) => {
          return h(ElTag, { 
            style: { backgroundColor: getPlatformColor(row.platform) },
            size: 'small' 
          }, { default: () => row.platform });
        }
      }
    },
    {
      title: '描述',
      field: 'description',
      minWidth: 200,
      showOverflow: 'tooltip',
      slots: {
        default: ({ row }) => {
          return h('span', { class: 'text-gray-600' }, row.description || '-');
        }
      }
    },
    {
      title: '层级',
      field: 'level',
      width: 80,
      align: 'center',
      slots: {
        default: ({ row }) => {
          return h(ElTag, { 
            type: getLevelTagType(row.level), 
            size: 'small' 
          }, { default: () => `L${row.level}` });
        }
      }
    },
    {
      title: '排序',
      field: 'sort',
      width: 80,
      align: 'center'
    },
    {
      title: '状态',
      field: 'isActive',
      width: 100,
      align: 'center',
      slots: {
        default: ({ row }) => {
          return h(ElSwitch, {
            modelValue: row.isActive,
            onChange: (value) => {
              row.isActive = value;
              handleToggleStatus(row);
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
            }, { default: () => [h(Icon, { icon: 'lucide:edit', size: 14 }), h('span', { class: 'ml-1' }, '编辑')] }),
            h(ElButton, {
              type: 'success',
              size: 'small',
              onClick: () => handleAddChild(row)
            }, { default: () => [h(Icon, { icon: 'lucide:plus', size: 14 }), h('span', { class: 'ml-1' }, '添加子标签')] }),
            h(ElButton, {
              type: 'danger',
              size: 'small',
              onClick: () => handleDelete(row)
            }, { default: () => [h(Icon, { icon: 'lucide:trash-2', size: 14 }), h('span', { class: 'ml-1' }, '删除')] })
          ]);
        }
      }
    }
  ],
  treeConfig: computed(() => {
    if (viewMode.value !== 'tree') {
      return undefined; // 列表模式下不使用树形配置
    }
    const config = {
      transform: false, // 数据已经是树形结构，不需要转换
      parentField: 'parentId', // 父节点字段名
      rowField: 'id', // 行数据字段名
      childrenField: 'children', // 子节点字段名
      indent: 20, // 树形缩进
      showIcon: true, // 显示展开/收起图标
      iconOpen: 'vxe-icon-caret-down',
      iconClose: 'vxe-icon-caret-right',
      expandAll: true, // 默认展开所有节点
      accordion: false,
      trigger: 'default',
      lazy: false, // 禁用懒加载
      reserve: true // 保留展开状态
    };
    return config;
  }),
  loading: computed(() => loading.value),
  border: true,
  showOverflow: true,
  keepSource: true,
  id: 'tagTreeTable',
  round: true,
  size: 'small',
  align: 'left',
  pagerConfig: {
    enabled: false
  }
});

// 创建Grid实例
const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

// 查询参数
const queryParams = reactive<QueryTagDto>({
  page: 1,
  limit: 20,
  platform: '', // 修复：移除默认平台设置
  parentId: undefined,
  name: '',
  level: undefined,
  includeChildren: false,
  sortBy: 'sort',
  sortOrder: 'ASC'
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 表格数据
const tableData = ref<Tag[]>([])
const treeData = ref<TagTreeNode[]>([])
const selectedRows = ref<Tag[]>([])
const selectAll = ref(false)
const parentOptions = ref<any[]>([])

// 表单数据
const formRef = ref<FormInstance>()
const formData = reactive<CreateTagDto & { parentPath?: number[]; isActive?: boolean }>({
  name: '',
  code: '',
  description: '',
  platform: '',
  parentId: undefined,
  sort: 0,
  isActive: true,
  parentPath: []
})

// 上传相关
const uploadRef = ref()
const uploadFile = ref<File | null>(null)

// 计算属性
const isIndeterminate = computed(() => {
  const selectedCount = selectedRows.value?.length || 0
  const totalCount = tableData.value?.length || 0
  return selectedCount > 0 && selectedCount < totalCount
})

const dialogTitle = computed(() => {
  return isEdit.value ? '编辑标签' : '新建标签'
})

// 级联选择器配置
const cascaderProps = {
  value: 'id',
  label: 'name',
  children: 'children',
  checkStrictly: true
}

// 树形组件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  platform: [
    { required: true, message: '请选择平台', trigger: 'change' }
  ]
}

// 方法
const loadTableData = async () => {
  try {
    loading.value = true
    // 修复：正确处理参数，过滤掉空值和undefined
    const params: Record<string, any> = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    // 只添加非空的筛选参数
    if (queryParams.name && queryParams.name.trim() !== '') {
      params.name = queryParams.name
    }
    
    if (queryParams.platform && queryParams.platform.trim() !== '') {
      params.platform = queryParams.platform
    }
    
    if (queryParams.isActive !== undefined && queryParams.isActive !== null) {
      params.isActive = queryParams.isActive
    }
    
    if (queryParams.parentId !== undefined) {
      params.parentId = queryParams.parentId
    }
    
    if (queryParams.level !== undefined) {
      params.level = queryParams.level
    }
    
    if (queryParams.includeChildren !== undefined) {
      params.includeChildren = queryParams.includeChildren
    }
    
    if (queryParams.sortBy) {
      params.sortBy = queryParams.sortBy
    }
    
    if (queryParams.sortOrder) {
      params.sortOrder = queryParams.sortOrder
    }
    
    log.debug('Table API params:', params) // 调试日志
    
    // 使用raw模式获取完整响应
    const response = await requestClient.get('/tags', { params, responseReturn: 'raw' })
    log.debug('Table API Response:', response) // 调试日志
    
    // 处理完整的响应对象
    if (response && response.data && typeof response.data === 'object') {
      const responseData = response.data
      if (Array.isArray(responseData.data)) {
        tableData.value = responseData.data
        // 从pagination对象中获取total
        pagination.total = responseData.pagination?.total || 0
      } else {
        log.warn('Invalid table data response:', responseData)
        tableData.value = []
        pagination.total = 0
      }
    } else {
      tableData.value = []
      pagination.total = 0
    }
    log.debug('Table data updated:', tableData.value.length, 'items') // 调试日志
  } catch (error) {
    tableData.value = []
    pagination.total = 0
    log.error('加载标签列表失败:', error)
    ElMessage.error('加载标签列表失败')
  } finally {
    loading.value = false
  }
}

const loadTreeData = async () => {
  try {
    loading.value = true
    // 传递完整的筛选参数
    const params: Record<string, any> = {}
    
    // 修复：正确处理参数，包括空字符串的处理
    if (queryParams.platform && queryParams.platform.trim() !== '') {
      params.platform = queryParams.platform
    }
    
    if (queryParams.name && queryParams.name.trim() !== '') {
      params.name = queryParams.name
    }
    
    if (queryParams.isActive !== undefined && queryParams.isActive !== null) {
      params.isActive = queryParams.isActive
    }
    
    log.debug('Tree API params:', params) // 调试日志
    const response = await requestClient.get('tags/tree', { params, responseReturn: 'raw' })
    log.debug('Tree API Response:', response) // 调试日志
    
    // 处理完整的响应对象
    if (response && response.data && typeof response.data === 'object') {
      const responseData = response.data
      if (Array.isArray(responseData.data)) {
        const dataArray = responseData.data
        treeData.value = dataArray
        
        // 等待DOM更新
        await nextTick()
        
        // 使用loadData方法加载数据，类似role页面的实现
        if (gridApi && gridApi.grid && gridApi.grid.loadData) {
          log.debug('Using gridApi.loadData to load tree data:', dataArray.length, 'items')
          gridApi.grid.loadData(dataArray)
        } else {
          log.debug('GridApi not ready, updating gridOptions.data directly')
          // 如果gridApi还未初始化，直接更新gridOptions
          gridOptions.data = dataArray
        }
      } else {
        log.warn('Tree data is not an array:', responseData)
        treeData.value = []
        gridOptions.data = []
      }
    } else {
      treeData.value = []
      gridOptions.data = []
    }
    log.debug('Grid data updated:', treeData.value.length, 'items') // 调试日志
  } catch (error) {
    log.error('加载树形数据失败:', error)
    ElMessage.error('加载数据失败')
    treeData.value = []
    gridOptions.data = []
  } finally {
    loading.value = false
  }
}

const loadParentOptions = async () => {
  try {
    const platform = formData.platform || queryParams.platform
    if (platform) {
      parentOptions.value = await getTagTree({ platform })
    }
  } catch (error) {
    log.error('加载父级标签选项失败:', error)
  }
}

// 构建父级标签路径
const buildParentPath = (targetId: number | undefined) => {
  if (!targetId || !parentOptions.value.length) {
    formData.parentPath = []
    return
  }
  
  // 递归查找标签路径
  const findPath = (nodes: any[], id: number, path: number[] = []): number[] | null => {
    for (const node of nodes) {
      const currentPath = [...path, node.id]
      if (node.id === id) {
        return currentPath
      }
      if (node.children && node.children.length > 0) {
        const result = findPath(node.children, id, currentPath)
        if (result) {
          return result
        }
      }
    }
    return null
  }
  
  const path = findPath(parentOptions.value, targetId)
  formData.parentPath = path || []
}

const handleSearch = () => {
  pagination.page = 1
  if (viewMode.value === 'table') {
    loadTableData()
  } else {
    loadTreeData()
  }
}

const handleReset = () => {
  Object.assign(queryParams, {
    page: 1,
    limit: 20,
    platform: '', // 修复：重置时清空平台选择
    parentId: undefined,
    name: '',
    level: undefined,
    includeChildren: false,
    sortBy: 'sort',
    sortOrder: 'ASC',
    isActive: undefined // 修复：重置时清空状态选择
  })
  pagination.page = 1
  handleSearch()
}

const handleParentChange = (value: number[]) => {
  queryParams.parentId = value && value.length > 0 ? value[value.length - 1] : undefined
  handleSearch()
}

const handleSelectionChange = (selection: Tag[]) => {
  selectedRows.value = selection
  selectAll.value = selection?.length === tableData.value?.length
}

const handleSelectAll = (checked: boolean) => {
  // 这里需要通过表格组件的方法来实现全选
  // 具体实现依赖于 Element Plus 的 API
}

const handleTreeCheckChange = () => {
  // 处理树形组件的选择变化
}

const handleSizeChange = (size: number) => {
  pagination.limit = size
  pagination.page = 1
  loadTableData()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadTableData()
}

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'tree' ? 'table' : 'tree'
  // 延迟加载确保视图切换完成
  setTimeout(() => {
    loadData()
  }, 100)
}

// 刷新数据
const handleRefresh = () => {
  loadData()
}

const handleCreate = () => {
  isEdit.value = false
  currentEditId.value = null
  resetFormData()
  dialogVisible.value = true
  loadParentOptions()
}

const handleEdit = async (row: Tag) => {
  isEdit.value = true
  currentEditId.value = row.id
  Object.assign(formData, {
    name: String(row.name || ''),
    code: String(row.code || ''),
    description: String(row.description || ''),
    platform: String(row.platform || ''),
    parentId: row.parentId || undefined,
    sort: Number(row.sort) || 0,
    isActive: row.isActive
  })
  
  dialogVisible.value = true
  
  // 先加载父级选项，然后构建路径
  await loadParentOptions()
  
  // 设置父级标签路径
  if (row.parentId) {
    buildParentPath(row.parentId)
  } else {
    formData.parentPath = []
  }
}

const handleAddChild = async (row: Tag) => {
  isEdit.value = false
  currentEditId.value = null
  resetFormData()
  formData.platform = String(row.platform || '')
  formData.parentId = row.id
  
  dialogVisible.value = true
  
  // 先加载父级选项，然后构建路径
  await loadParentOptions()
  
  // 设置父级标签路径，添加子标签时应该构建到当前标签的路径
  buildParentPath(row.id)
}

const handleDelete = async (row: Tag) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除标签 "${row.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteTag(row.id)
    ElMessage.success('删除成功')
    
    if (viewMode.value === 'table') {
      loadTableData()
    } else {
      loadTreeData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      log.error('删除标签失败:', error)
      ElMessage.error('删除标签失败')
    }
  }
}

const handleBatchDelete = async () => {
  if (!selectedRows.value?.length) {
    ElMessage.warning('请选择要删除的标签')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value?.length || 0} 个标签吗？此操作不可恢复。`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedRows.value.map(row => row.id)
    await deleteTags(ids)
    ElMessage.success('批量删除成功')
    
    selectedRows.value = []
    selectAll.value = false
    loadTableData()
  } catch (error) {
    if (error !== 'cancel') {
      log.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const handleBatchToggleStatus = async () => {
  if (!selectedRows.value?.length) {
    ElMessage.warning('请选择要操作的标签')
    return
  }
  
  // 这里需要实现批量状态切换的逻辑
  ElMessage.info('批量状态切换功能开发中')
}

const handleToggleStatus = async (row: Tag) => {
  try {
    // ElSwitch已经改变了row.isActive的值，所以直接使用即可
    const updateData: UpdateTagDto = { 
      isActive: row.isActive
    }
    log.debug('前端发送状态切换请求:', { id: row.id, updateData })
    await updateTag(row.id, updateData)
    ElMessage.success('状态更新成功')
    // 刷新数据以确保显示最新状态
    await loadTableData()
  } catch (error) {
    log.error('更新状态失败:', error)
    ElMessage.error('更新状态失败')
    // 恢复原状态
    row.isActive = !row.isActive
  }
}

const handleFormParentChange = (value: number[]) => {
  formData.parentId = value && value.length > 0 ? value[value.length - 1] : undefined
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    submitting.value = true
    
    // 确保数据类型正确，特别是字符串字段
    const submitData: CreateTagDto | UpdateTagDto = {
      name: String(formData.name || '').trim(),
      code: formData.code ? String(formData.code).trim() : undefined,
      description: formData.description ? String(formData.description).trim() : undefined,
      platform: String(formData.platform || ''),
      parentId: formData.parentId || undefined,
      sort: Number(formData.sort) || 0
    }
    
    // 编辑时总是包含isActive字段
    if (isEdit.value) {
      (submitData as UpdateTagDto).isActive = formData.isActive
    }
    
    // 移除空字符串字段
    if (!submitData.code) delete submitData.code
    if (!submitData.description) delete submitData.description
    
    if (isEdit.value && currentEditId.value) {
      await updateTag(currentEditId.value, submitData)
      ElMessage.success('更新成功')
    } else {
      await createTag(submitData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    
    if (viewMode.value === 'table') {
      loadTableData()
    } else {
      loadTreeData()
    }
  } catch (error) {
    log.error('提交失败:', error)
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
  resetFormData()
}

const resetFormData = () => {
  Object.assign(formData, {
    name: '',
    code: '',
    description: '',
    platform: '',
    parentId: undefined,
    sort: 0,
    isActive: true,
    parentPath: []
  })
}

const handleImport = () => {
  importDialogVisible.value = true
}

const handleExport = () => {
  ElMessage.info('导出功能开发中')
}

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
}

const handleBeforeUpload = () => {
  return false // 阻止自动上传
}

const handleImportSubmit = () => {
  if (!uploadFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }
  
  ElMessage.info('导入功能开发中')
}

// 工具方法
const getTagIcon = (level: number) => {
  const icons: Record<number, string> = {
    1: 'lucide:folder-tree',
    2: 'lucide:folder',
    3: 'lucide:tag',
    4: 'lucide:hash'
  };
  return icons[level] || 'lucide:tag';
}

const getLevelTagType = (level: number) => {
  const types: Record<number, string> = {
    1: 'primary',
    2: 'success', 
    3: 'warning',
    4: 'danger'
  }
  return types[level] || 'info'
}

const getPlatformColor = (platform: string) => {
  const colors: Record<string, string> = {
    '星图': '#409EFF',
    '花火': '#F56C6C',
    '蒲公英': '#67C23A'
  }
  return colors[platform] || '#909399'
}

const getPlatformTagType = (platform: string) => {
  const types: Record<string, string> = {
    '星图': 'primary',
    '花火': 'danger',
    '蒲公英': 'success'
  }
  return types[platform] || 'info'
}

const getPlatformText = (platform: string) => {
  return platform || '未知平台'
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN')
}

// 统一数据加载函数
const loadData = () => {
  if (viewMode.value === 'tree') {
    loadTreeData()
  } else {
    loadTableData()
  }
}

// 生命周期
onMounted(() => {
  // 延迟加载确保Grid组件完全初始化
  setTimeout(() => {
    loadData()
  }, 200)
})
</script>

<style scoped>
.tag-management {
  padding: 20px;
  background: var(--el-bg-color-page);
  min-height: 100vh;
}

/* 现代化卡片样式 */
.bg-background {
  background: var(--el-bg-color);
}

.shadow-sm {
  box-shadow: var(--el-box-shadow-light);
}

.border {
  border: 1px solid var(--el-border-color);
}

.rounded-lg {
  border-radius: 0.5rem;
}

/* VxeTable 树形表格样式优化 */
:deep(.vxe-table) {
  border: none !important;
  background: var(--el-bg-color) !important;
}

:deep(.vxe-table .vxe-header--column) {
  background: var(--el-fill-color-light) !important;
  border-bottom: 2px solid var(--el-border-color) !important;
  font-weight: 600;
  color: var(--el-text-color-primary) !important;
}

:deep(.vxe-table .vxe-body--row) {
  transition: all 0.2s ease;
  background: var(--el-bg-color) !important;
}

:deep(.vxe-table .vxe-body--row:hover) {
  background: var(--el-fill-color-lighter) !important;
}

/* 现代化树形展开图标 */
:deep(.vxe-table .vxe-tree--btn-wrapper) {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color);
}

:deep(.vxe-table .vxe-tree--btn-wrapper:hover) {
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color-dark);
  transform: scale(1.05);
}

/* 自定义箭头图标 */
:deep(.vxe-table .vxe-tree--expand-btn) {
  width: 14px;
  height: 14px;
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
  border-left: 5px solid var(--el-text-color-regular);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transform: translate(-50%, -50%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 展开状态的箭头 */
:deep(.vxe-table .vxe-tree-node--expand .vxe-tree--expand-btn::before) {
  transform: translate(-50%, -50%) rotate(90deg);
  border-left-color: var(--el-color-primary);
}

/* 树形节点缩进线 */
:deep(.vxe-table .vxe-tree--line-wrapper) {
  opacity: 0.3;
}

/* 状态标签样式 */
.el-tag {
  border-radius: 6px;
  font-weight: 500;
}

/* 操作按钮样式 */
.el-button {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 搜索表单样式 */
.el-form--inline .el-form-item {
  margin-right: 16px;
  margin-bottom: 0;
}

.el-input {
  border-radius: 6px;
}

.el-select {
  border-radius: 6px;
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color);
}

:deep(.el-table th) {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-weight: 600;
  border-bottom: 2px solid var(--el-border-color);
}

:deep(.el-table td) {
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

:deep(.el-table tr:hover td) {
  background: var(--el-fill-color-lighter);
}

/* 分页样式 */
:deep(.el-pagination) {
  justify-content: center;
}

:deep(.el-pagination .el-pager li) {
  border-radius: 6px;
  margin: 0 2px;
}

:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next) {
  border-radius: 6px;
}

/* 批量操作栏样式 */
.mb-4.flex.items-center.gap-2 {
  padding: 12px 16px;
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 8px;
  margin-bottom: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tag-management {
    padding: 16px;
  }
  
  .flex.items-center.justify-between {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .flex.gap-2 {
    justify-content: center;
  }
  
  .el-form--inline {
    display: block;
  }
  
  .el-form--inline .el-form-item {
    display: block;
    margin-bottom: 16px;
  }
}

/* 加载动画优化 */
:deep(.el-loading-mask) {
  border-radius: 8px;
}

/* 开关组件样式 */
:deep(.el-switch) {
  --el-switch-on-color: #10b981;
  --el-switch-off-color: #6b7280;
}

/* 图标样式 */
.iconify {
  display: inline-block;
  width: 1em;
  height: 1em;
}
</style>