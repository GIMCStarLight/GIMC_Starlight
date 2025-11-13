<template>
  <div class="tag-filter-page">
    <div class="toolbar">
      <el-select v-model="platform" placeholder="平台" class="toolbar-select" @change="reload">
        <el-option label="星图" value="星图" />
        <el-option label="花火" value="花火" />
        <el-option label="蒲公英" value="蒲公英" />
      </el-select>
      <el-switch v-model="onlyActive" active-text="仅启用" @change="reload" />
      <div class="toolbar-right">
        <el-button size="small" @click="resetSelections" plain>重置</el-button>
      </div>
    </div>

    <!-- 已选条件 -->
    <div v-if="selectedChips.length" class="chips-bar">
      <div class="chips-left">已选条件</div>
      <div class="chips">
        <el-tag v-for="chip in selectedChips" :key="chip.id" size="small" type="primary" closable @close="unselect(chip.id)">{{ chip.path }}</el-tag>
      </div>
      <el-button size="small" link type="primary" @click="resetSelections">清空全部</el-button>
    </div>

    <div class="group-market-filters group-filters">
      <table>
        <tr v-for="row in uiRows" :key="row.id" class="group-row">
          <th class="group-col-label"><span>{{ row.name }}</span></th>
          <td class="group-col-content">
            <div class="market-filters new">
              <!-- 将每个大组拆成多小行：小行标题=一级子组；右侧选项渲染二级，且下拉面板同时展示第三级与第四级 -->
              <template v-for="group in row.groups" :key="group.id">
                <!-- 顶层小行（大组本身汇总，不限按钮）-->
                <div class="primary-filters one-line">
                  <div class="title-container">
                    <span class="underline-tooltip title"><span class="text">{{ group.name }}</span></span>
                  </div>
                  <div>
                    <div class="filter-content new">
                      <el-button class="filter-btn is-all" :class="{active: isGroupCleared(group)}" @click="clearGroup(group)">不限</el-button>
                    </div>
                  </div>
                </div>

                <!-- 一级子组拆行渲染 -->
                <div v-for="l1 in (group.children || [])" :key="l1.id" class="primary-filters one-line">
                  <div class="title-container">
                    <span class="underline-tooltip title"><span class="text">{{ l1.name }}</span></span>
                  </div>
                  <div>
                    <div class="filter-content new">
                      <template v-for="l2 in (l1.children || [])" :key="l2.id">
                        <el-button v-if="!l2.children || l2.children.length === 0" class="filter-btn" :type="isSelected(l2.id) ? 'primary' : 'default'" @click="toggle(l2.id, l1)">{{ l2.name }}</el-button>

                        <el-dropdown v-else trigger="click" :teleported="false">
                          <el-button class="filter-btn" :type="isSelected(l2.id) ? 'primary' : 'default'">{{ l2.name }}<Icon icon="lucide:chevron-down" class="ml-1" /></el-button>
                          <template #dropdown>
                            <el-dropdown-menu class="dropdown-menu wide">
                              <el-scrollbar max-height="320">
                                <div class="level34">
                                  <div class="level3" v-for="l3 in (l2.children || [])" :key="l3.id">
                                    <div class="l3-title" @click.stop="toggle(l3.id, l2)">
                                      <el-tag :type="isSelected(l3.id) ? 'primary' : 'info'" effect="plain">{{ l3.name }}</el-tag>
                                    </div>
                                    <div class="level4">
                                      <el-button v-for="l4 in (l3.children || [])" :key="l4.id" size="small" class="filter-btn"
                                        :type="isSelected(l4.id) ? 'primary' : 'default'" @click.stop="toggle(l4.id, l3)">{{ l4.name }}</el-button>
                                    </div>
                                  </div>
                                </div>
                              </el-scrollbar>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </template>

                      <!-- 取消“更多”折叠，全部展示二级项 -->
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { requestClient } from '#/api/request'

type TagNode = {
  id: number
  name: string
  children?: TagNode[]
}

// 平台/仅启用
const platform = ref<string>('星图')
const onlyActive = ref<boolean>(true)

// 原始树
const tree = ref<TagNode[]>([])

// 每组显示的子项上限（其余放“更多”）
const CHILD_LIMIT = 10

// 选择集
const selected = ref<Set<number>>(new Set())
const isSelected = (id: number) => selected.value.has(id)
const toggle = (id: number, group?: TagNode) => {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
}
const clearGroup = (group: TagNode) => {
  // 清除该组及其子孙的选中
  const walk = (n?: TagNode) => {
    if (!n) return
    selected.value.delete(n.id)
    ;(n.children || []).forEach(walk)
  }
  walk(group)
}
const isGroupCleared = (group: TagNode) => {
  let any = false
  const walk = (n?: TagNode) => {
    if (!n) return
    if (selected.value.has(n.id)) any = true
    ;(n.children || []).forEach(walk)
  }
  walk(group)
  return !any
}

// 将后端树映射到四行：合作诉求/匹配度/性价比/主题推荐
// 若后端未严格分行，则按顺序均分到四行以贴近截图
const uiRows = computed(() => {
  const rows = [
    { id: 'co', name: '合作诉求', groups: [] as TagNode[] },
    { id: 'ma', name: '匹配度', groups: [] as TagNode[] },
    { id: 'ce', name: '性价比', groups: [] as TagNode[] },
    { id: 're', name: '主题推荐', groups: [] as TagNode[] }
  ]
  const src = tree.value || []
  if (src.length <= 4) {
    src.forEach((g, i) => rows[i] && rows[i].groups.push(g))
  } else {
    const chunk = Math.ceil(src.length / 4)
    rows[0].groups = src.slice(0, chunk)
    rows[1].groups = src.slice(chunk, chunk * 2)
    rows[2].groups = src.slice(chunk * 2, chunk * 3)
    rows[3].groups = src.slice(chunk * 3)
  }
  return rows
})

const reload = async () => {
  const params: Record<string, any> = {}
  if (platform.value) params.platform = platform.value
  if (onlyActive.value !== undefined) params.isActive = onlyActive.value
  const res = await requestClient.get('tags/tree', { params })
  const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : res?.data?.data || []
  tree.value = data as TagNode[]
}

const resetSelections = () => {
  selected.value.clear()
}

// 已选标签 chips
type Chip = { id: number; path: string }
const selectedChips = computed<Chip[]>(() => {
  const chips: Chip[] = []
  const pathMap = new Map<number, string>()

  const buildPaths = (nodes: TagNode[], prefix: string) => {
    for (const n of nodes || []) {
      const path = prefix ? `${prefix} / ${n.name}` : n.name
      pathMap.set(n.id, path)
      if (n.children && n.children.length) buildPaths(n.children, path)
    }
  }
  buildPaths(tree.value || [], '')

  selected.value.forEach((id) => {
    const path = pathMap.get(id)
    if (path) chips.push({ id, path })
  })
  return chips
})

const unselect = (id: number) => {
  selected.value.delete(id)
}

// 已取消“更多”逻辑

onMounted(reload)
</script>

<style scoped>
.tag-filter-page { padding: 16px; background: var(--el-bg-color-page); }
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
.toolbar-right { margin-left: auto; }
.toolbar-select { width: 120px; }

/* 已选条件 chips 区 */
.chips-bar { display: flex; align-items: center; gap: 12px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-lighter); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; box-shadow: var(--el-box-shadow-light); }
.chips-left { font-weight: 600; color: var(--el-text-color-regular); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }

.group-market-filters table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
.group-row th, .group-row td { background: var(--el-bg-color); }
.group-row th { width: 112px; text-align: right; color: var(--el-text-color-primary); font-weight: 600; padding: 12px 12px; border-radius: 8px 0 0 8px; border: 1px solid var(--el-border-color-lighter); border-right: 0; }
.group-row td { padding: 10px 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 0 8px 8px 0; box-shadow: inset 0 0 0 1px var(--el-fill-color-lighter); }

.primary-filters.one-line { display: grid; grid-template-columns: 100px 1fr; align-items: center; padding: 6px 0; border-bottom: 1px dashed var(--el-border-color-lighter); row-gap: 4px; }
.primary-filters.one-line:last-child { border-bottom: 0; }
.title-container { text-align: right; padding-right: 8px; }
.title .text { font-size: 13px; color: var(--el-text-color-regular); font-weight: 600; }

.filter-content.new { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: flex-start; }
.filter-btn { height: 28px; line-height: 28px; padding: 0 10px; border-radius: 14px; font-size: 13px; margin: 0; vertical-align: top; display: inline-flex; align-items: center; }
.filter-btn .iconify { vertical-align: middle; }
.filter-btn.is-all { color: var(--el-text-color-regular); }
.filter-btn:hover { transform: none; box-shadow: none; }

/* 细化四级按钮尺寸，视觉更齐整 */
.level4 .filter-btn { height: 24px; line-height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; }

.dropdown-menu { 
  padding: 12px 14px; 
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  box-shadow: 0 10px 26px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.08);
}
.dropdown-grid { display: grid; grid-template-columns: 1fr; gap: 10px 8px; max-width: 600px; }
.dropdown-item { padding: 2px 4px; }
.dropdown-menu :deep(.el-dropdown-menu__item) { padding: 6px 8px; border-radius: 6px; }
.dropdown-menu :deep(.el-dropdown-menu__item:hover) { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }

.dropdown-menu.wide { padding: 12px 14px; }
.level34 { display: grid; grid-template-columns: 1fr; gap: 10px; max-width: 600px; }
.level3 { border-left: 2px solid var(--el-border-color); padding-left: 10px; }
.l3-title { margin-bottom: 4px; cursor: pointer; }
.level4 { display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: baseline; }

.more-grid { display: grid; grid-template-columns: 1fr; gap: 12px; max-width: 560px; }
.more-group { border-left: 2px solid var(--el-border-color); padding-left: 12px; }
.more-title { font-weight: 600; color: var(--el-text-color-primary); margin-bottom: 6px; }
.more-items { display: flex; flex-wrap: wrap; gap: 6px 8px; }

/* 已取消“更多”展开块相关样式 */

@media (max-width: 768px) {
  .primary-filters.one-line { grid-template-columns: 88px 1fr; }
}
</style>


