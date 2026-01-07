<template>
    <div class="standard-table">
        <!-- Element Plus Table -->
        <el-table
            :data="dataSource"
            :border="bordered"
            :size="size"
            :row-key="rowKey"
            v-loading="loading"
            @selection-change="handleSelectionChange"
            style="width: 100%"
        >
            <!-- 多选列 -->
            <el-table-column
                v-if="selectedRows !== undefined"
                type="selection"
                width="55"
                :reserve-selection="true"
            />
            
            <!-- 数据列 -->
            <el-table-column
                v-for="col in columns"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
                :width="col.width"
                :min-width="col.minWidth"
                :align="col.align || 'center'"
                :sortable="col.sortable"
                :fixed="col.fixed"
            >
                <template #default="{ row, $index }">
                    <slot 
                        v-if="$slots[col.prop]" 
                        :name="col.prop" 
                        :record="row"
                        :text="row[col.prop]"
                        :index="$index" 
                    />
                    <span v-else>{{ row[col.prop] }}</span>
                </template>
            </el-table-column>
        </el-table>

        <!-- Element Plus Pagination -->
        <el-pagination
            v-if="pagination !== false"
            v-model:current-page="currentPage"
            v-model:page-size="currentPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            class="pagination"
            @size-change="onPageSizeChange"
            @current-change="onPageChange"
        />
    </div>
</template>

<script setup>
import { computed, watch, ref, reactive } from 'vue'

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
    'clear'
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

/* ---------- Element Plus 选择变更 ---------- */
function handleSelectionChange(selection) {
    // Element Plus Table 的 selection-change 返回当前页选中的行
    const currentPageKeys = dataSource.value.map(getRowKey)
    
    // 保留其他页的选中项
    const otherPagesSelected = (props.selectedRows || []).filter(
        row => !currentPageKeys.includes(getRowKey(row))
    )
    
    // 合并当前页选中项
    const selectedRowsMap = new Map()
    otherPagesSelected.forEach(row => {
        selectedRowsMap.set(getRowKey(row), row)
    })
    selection.forEach(row => {
        selectedRowsMap.set(getRowKey(row), row)
    })
    
    const newSelectedRows = Array.from(selectedRowsMap.values())
    emit('update:selectedRows', newSelectedRows)
    emit('selectedRowChange', newSelectedRows.map(getRowKey), newSelectedRows)
}

const dataSource = computed(() => props.dataSource)

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
    :deep(.el-table th) {
        text-align: center;
        color: #31343B;
        font-size: 12px;
    }

    // 单元格内容居中
    :deep(.el-table td) {
        text-align: center;
        color: #31343B;
        font-size: 14px;
    }
}
</style>