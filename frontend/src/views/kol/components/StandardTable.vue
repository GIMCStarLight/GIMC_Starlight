<template>
    <div class="standard-table">
        <!-- Ant Design Table -->
        <a-table
            :loading="loading"
            :columns="antColumns"
            :data-source="dataSource"
            :row-key="rowKey"
            :bordered="bordered"
            :size="size"
            :pagination="false"
            :row-selection="selectedRows !== undefined ? rowSelection : null"
            :scroll="{ x: 'max-content' }"
            @change="handleTableChange"
        >
            <!-- 自定义单元格插槽 -->
            <template #bodyCell="{ text, record, index, column }">
                <template v-for="col in columns" :key="col.prop">
                    <slot 
                        v-if="$slots[col.prop] && column.dataIndex === (col.dataIndex || col.prop)" 
                        :name="col.prop" 
                        :text="text" 
                        :record="record" 
                        :index="index" 
                    />
                </template>
            </template>
        </a-table>

        <!-- Ant Design Pagination -->
        <a-pagination
            v-if="pagination !== false"
            v-model:current="currentPage"
            v-model:page-size="currentPageSize"
            :total="pagination.total"
            :show-size-changer="true"
            :show-quick-jumper="true"
            :show-total="total => `共 ${total} 条`"
            :page-size-options="['10', '20', '50', '100']"
            class="pagination"
            @change="onPageChange"
            @showSizeChange="onPageSizeChange"
        />
    </div>
</template>

<script setup>
import { computed, reactive, watch, ref } from 'vue'

const props = defineProps({
    bordered: Boolean,
    loading: Boolean,
    columns: { type: Array, default: () => [] },
    dataSource: { type: Array, default: () => [] },
    rowKey: { type: [String, Function], default: 'id' },
    treeProps: { type: Object, default: () => ({}) },
    defaultExpandAll: { type: Boolean, default: false },
    pagination: { type: [Object, Boolean], default: () => ({ current: 1, pageSize: 10, total: 0 }) },
    selectedRows: { type: Array, default: undefined }, // 支持 .sync
    expandedRowKeys: { type: Array, default: () => [] },
    size: { type: String, default: 'middle' }
})

const emit = defineEmits([
    'update:selectedRows',
    'update:expandedRowKeys',
    'selectedRowChange',
    'expandChange',
    'change',
    'clear',
    'sortChange'
])

// 分页相关
const currentPage = ref(props.pagination?.current || 1)
const currentPageSize = ref(props.pagination?.pageSize || 10)

watch(() => props.pagination?.current, (val) => {
    if (val) currentPage.value = val
})

watch(() => props.pagination?.pageSize, (val) => {
    if (val) currentPageSize.value = val
})

/* ---------- 多选逻辑 ---------- */
const selectedRowKeys = computed(() => {
    if (!props.selectedRows || props.selectedRows.length === 0) return []
    return props.selectedRows.map(r => getRowKey(r))
})

function getRowKey(row) {
    const rk = props.rowKey
    return typeof rk === 'function' ? rk(row) : row[rk]
}

function contains(arr, item) {
    const key = getRowKey(item)
    return arr.some(r => getRowKey(r) === key)
}

function onClear() {
    emit('update:selectedRows', [])
    emit('selectedRowChange', [], [])
    emit('clear')
}


/* ---------- 分页 ---------- */
function onPageChange(page, pageSize) {
    currentPage.value = page
    emit('change', { ...props.pagination, current: page, pageSize })
}

function onPageSizeChange(current, size) {
    currentPageSize.value = size
    currentPage.value = 1
    emit('change', { ...props.pagination, current: 1, pageSize: size })
}

/* ---------- 表格变化(排序) ---------- */
function handleTableChange(pagination, filters, sorter) {
    // 触发排序事件
    if (sorter && sorter.field) {
        emit('sortChange', {
            prop: sorter.field,
            order: sorter.order === 'ascend' ? 'ascending' : sorter.order === 'descend' ? 'descending' : null
        })
    }
}

/* ---------- Ant Design 列配置转换 ---------- */
const antColumns = computed(() => {
    return props.columns.map(col => ({
        title: col.label,
        dataIndex: col.dataIndex || col.prop,
        key: col.prop || col.label,
        width: col.width,
        align: col.align || 'center', // 默认居中
        sorter: col.sortable ? true : false,
        sortDirections: ['descend', 'ascend'],
        showSorterTooltip: col.sortable ? {
            title: '点击排序'
        } : false,
        customRender: col.formatter ? ({ text, record, index }) => col.formatter(record, index, text) : undefined,
        ellipsis: col.ellipsis !== undefined ? col.ellipsis : true,
        fixed: col.fixed
    }))
})

/* ---------- 行选择配置 ---------- */
const rowSelection = computed(() => {
    if (props.selectedRows === undefined) return null
    
    return {
        selectedRowKeys: selectedRowKeys.value,
        onChange: (selectedKeys, selectedRows) => {
            // Ant Design Table 的 onChange 会直接返回当前页选中的行
            // 我们需要合并其他页的选中状态
            const currentPageKeys = props.dataSource.map(getRowKey)
            
            // 保留其他页的选中项
            const otherPagesSelected = (props.selectedRows || []).filter(
                row => !currentPageKeys.includes(getRowKey(row))
            )
            
            // 合并当前页选中项（去重）
            const selectedRowsMap = new Map()
            
            // 先添加其他页的选中项
            otherPagesSelected.forEach(row => {
                selectedRowsMap.set(getRowKey(row), row)
            })
            
            // 再添加当前页的选中项（会自动覆盖重复的）
            selectedRows.forEach(row => {
                selectedRowsMap.set(getRowKey(row), row)
            })
            
            const newSelectedRows = Array.from(selectedRowsMap.values())
            
            emit('update:selectedRows', newSelectedRows)
            emit('selectedRowChange', newSelectedRows.map(getRowKey), newSelectedRows)
        },
        preserveSelectedRowKeys: true, // 保留选中状态
    }
})

/* ---------- 顶部总计 ---------- */
const needTotalList = reactive(
    props.columns.filter(c => c.needTotal).map(c => ({ ...c, total: 0 }))
)
watch(
    () => props.selectedRows,
    rows => {
        needTotalList.forEach(item => {
            item.total = rows.reduce((sum, r) => {
                const v = Number(r[item.dataIndex || item.prop] || 0)
                return sum + (Number.isNaN(v) ? 0 : v)
            }, 0)
        })
    },
    { immediate: true }
)
</script>

<style scoped lang="scss">
.standard-table {
    .pagination {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
    }

    // 表头居中
    :deep(.ant-table-thead > tr > th) {
        text-align: center;
        color: #31343B;
        font-size: 12px;
    }

    // 单元格内容居中
    :deep(.ant-table-tbody > tr > td) {
        text-align: center;
        color: #31343B;
        font-size: 14px;
    }
}
</style>