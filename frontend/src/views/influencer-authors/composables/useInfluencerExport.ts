/**
 * 达人导出逻辑
 * 提取自index-v3.vue,便于复用和测试
 */
import { ElMessage } from 'element-plus'
import type { Influencer } from '../../../types/influencer'

export function useInfluencerExport() {
  /**
   * 导出选中的达人数据为CSV
   */
  const exportInfluencers = async (selectedIds: Set<string>) => {
    if (selectedIds.size === 0) {
      ElMessage.warning('请先选中要导出的达人')
      return
    }

    try {
      ElMessage.info(`正在获取 ${selectedIds.size} 位达人的完整数据...`)

      // 调用后端API批量获取完整原始数据
      const response = await fetch('/api/influencer-authors/batch-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authorIds: Array.from(selectedIds) }),
      })

      log.debug('API响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        log.error('API错误响应:', errorText)
        throw new Error(`API请求失败: ${response.statusText}`)
      }

      const result = await response.json()
      log.debug('API返回结果:', result)

      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        log.warn('数据为空或格式错误:', result)
        ElMessage.warning('未获取到达人数据')
        return
      }

      const fullData = result.data
      log.debug('完整数据数组长度:', fullData.length)
      log.debug('第一条数据样例:', fullData[0])

      // 检查第一条数据是否有效
      if (!fullData[0] || typeof fullData[0] !== 'object') {
        log.error('第一条数据无效:', fullData[0])
        throw new Error('数据格式错误：第一条数据无效')
      }

      // 下载为CSV
      downloadAsCSV(fullData)

      ElMessage.success(
        `已导出 ${fullData.length} 位达人的完整数据（包含 ${Object.keys(fullData[0]).length} 个字段）`,
      )
    } catch (error) {
      log.error('导出失败:', error)
      ElMessage.error('导出失败: ' + ((error as Error).message || '未知错误'))
    }
  }

  /**
   * 将数据转换为CSV格式并下载
   */
  const downloadAsCSV = (data: Influencer[]) => {
    // 获取所有字段名（从第一条数据）
    const allFields = Object.keys(data[0])
    log.debug('字段总数:', allFields.length)
    log.debug('字段列表:', allFields)

    // 创建CSV内容（包含所有字段）
    const headers = allFields
    const rows = data.map((item) =>
      allFields.map((field) => {
        const value = item[field as keyof Influencer]
        // 处理不同类型的值
        if (value === null || value === undefined) {
          return '-'
        } else if (Array.isArray(value)) {
          return value.join(';
import { log } from '#/utils/logger'; ')
        } else if (typeof value === 'object') {
          return JSON.stringify(value)
        } else {
          return String(value)
        }
      }),
    )

    // 创建 CSV 内容
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n')

    // 创建 Blob 并下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    link.href = url
    link.download = `达人完整数据_${data.length}位_${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    exportInfluencers,
  }
}
