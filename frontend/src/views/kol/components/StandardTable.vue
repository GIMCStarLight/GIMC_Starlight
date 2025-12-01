<template>
    <div class="standard-table">
        <!-- 顶部提示条 - 已注释 -->
        <!-- <el-alert v-if="selectedRows && selectedRows.length" type="info" :closable="false" show-icon class="alert">
            <template #default>
                <div class="message">
                    已选择 <b>{{ selectedRows.length }}</b> 项
                    <el-link type="primary" underline @click="onClear">清空</el-link>
                    <template v-for="(item, index) in needTotalList" :key="index">
                        <div v-if="item.needTotal" class="total-item">
                            {{ item.label }} 总计 <b>{{ item.total }}</b>
                        </div>
                    </template>
                </div>
            </template>
        </el-alert> -->

        <!-- 表格 -->
        <el-table ref="elTable" v-loading="loading" :data="dataSource" :border="bordered" :size="size" :row-key="rowKey"
            :tree-props="treeProps" :expand-row-keys="expandedRowKeys" :default-expand-all="defaultExpandAll"
            @select="onSelect" @select-all="onSelectAll" @selection-change="onSelectionChange"
            @expand-change="onExpandChange">
            <!-- 多选列 -->
            <el-table-column v-if="selectedRows" type="selection" width="55" :reserve-selection="true" />

            <!-- 普通列 -->
            <el-table-column v-for="col in columns" :key="col.prop || col.label" :prop="col.dataIndex || col.prop"
                :label="col.label" :width="col.width" :sortable="col.sortable ? 'custom' : false"
                :formatter="col.formatter" :align="col.align">
                <!-- 自定义单元格 -->
                <template #default="{ row, column, $index }" v-if="$slots[col.prop]">
                    <slot :name="col.prop" :text="row[col.prop]" :record="row" :index="$index" />
                </template>
            </el-table-column>

            <!-- 展开行 -->
            <template #expand="{ row, $index }" v-if="$slots.expandedRowRender">
                <slot name="expandedRowRender" :record="row" :index="$index" />
            </template>
        </el-table>

        <!-- 分页 -->
        <el-pagination v-if="pagination !== false" background layout="total, prev, pager, next, jumper, sizes"
            :total="pagination.total" :page-size="pagination.pageSize" :current-page="pagination.current"
            :page-sizes="[10, 20, 50, 100]" @size-change="onPageSizeChange" @current-change="onCurrentChange" />
    </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

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
    size: { type: String, default: 'default' }
})

const emit = defineEmits([
    'update:selectedRows',
    'update:expandedRowKeys',
    'selectedRowChange',
    'expandChange',
    'change',
    'clear'
])

/* ---------- 多选逻辑 ---------- */
const selectedRowKeys = computed(() =>
    (props.selectedRows || []).map(r => getRowKey(r))
)

function getRowKey(row) {
    const rk = props.rowKey
    return typeof rk === 'function' ? rk(row) : row[rk]
}

function contains(arr, item) {
    const key = getRowKey(item)
    return arr.some(r => getRowKey(r) === key)
}

function onSelect(selection, row) {
    const selected = !contains(props.selectedRows, row)
    const newRows = selected
        ? [...props.selectedRows, row]
        : props.selectedRows.filter(r => getRowKey(r) !== getRowKey(row))
    emit('update:selectedRows', newRows)
    emit('selectedRowChange', newRows.map(getRowKey), newRows)
}

function onSelectAll(selection) {
    const set = {}
    props.selectedRows.forEach(r => (set[getRowKey(r)] = r))
    selection.forEach(r => (set[getRowKey(r)] = r))
    const unSelected = props.dataSource.filter(
        d => !contains(selection, d)
    )
    unSelected.forEach(r => delete set[getRowKey(r)])
    const newRows = Object.values(set)
    emit('update:selectedRows', newRows)
    emit('selectedRowChange', newRows.map(getRowKey), newRows)
}

function onSelectionChange(selection) {
    // 保留外部数组引用，兼容老代码
}

function onClear() {
    emit('update:selectedRows', [])
    emit('selectedRowChange', [], [])
    emit('clear')
}

/* ---------- 展开行 ---------- */
function onExpandChange(row, expandedRows) {
    // 处理树形表格和普通展开行两种情况
    const keys = Array.isArray(expandedRows) ? expandedRows.map(getRowKey) : []
    emit('expandChange', row, expandedRows)
    emit('update:expandedRowKeys', keys)
}

/* ---------- 分页 ---------- */
function onCurrentChange(current) {
    emit('change', { ...props.pagination, current })
}
function onPageSizeChange(pageSize) {
    emit('change', { ...props.pagination, pageSize, current: 1 })
}

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
    .alert {
        margin-bottom: 12px;
    }

    .message {
        display: flex;
        align-items: center;
        gap: 12px;

        .total-item {
            margin-left: 16px;
        }
    }

    .el-pagination {
        margin-top: 12px;
        justify-content: flex-end;
    }
}
</style>