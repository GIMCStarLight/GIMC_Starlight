/**
 * 达人数据更新逻辑
 * 提取自index-v3.vue,便于复用和测试
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import { createCrawlJob, pollCrawlJobStatus, type CrawlJobStatus, type CrawlJobDetailResponse } from '../../../api/crawler'
import type { Influencer } from '../../../types/influencer'

export function useInfluencerUpdate() {
  /**
   * 更新单个达人数据
   */
  const updateInfluencerData = async (
    influencer: Influencer,
    onRefresh?: () => void | Promise<void>
  ) => {
    // 验证必要字段
    if (!influencer.star_id) {
      ElMessage.error('该达人缺少星图id,无法更新数据')
      return
    }

    // 确认操作
    try {
      await ElMessageBox.confirm(
        `确定要更新达人「${influencer.nick_name}」的数据吗？`,
        '确认更新',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
    } catch (error) {
      // 用户取消操作
      return
    }

    // 设置加载状态
    influencer.updating = true
    influencer.updateProgress = 0
    influencer.updateStatus = '正在启动任务...'

    try {
      log.debug(`[更新] 开始更新达人数据: ${influencer.nick_name} (${influencer.star_id})`)

      // 创建爬虫任务
      const response = await createCrawlJob({
        task_type: 'single_star_id',
        target: {
          star_id: influencer.star_id
        },
        options: {
          cookies_file: 'cookies.txt',
          output_dir: 'task_control/results',
          report_dir: 'reports',
          save_pg: true
        }
      })

      log.debug('[更新] 爬虫任务创建响应:', response)

      if (response.success && response.data?.job_id) {
        const jobId = response.data.job_id
        ElMessage.success(`达人"${influencer.nick_name}"数据更新任务已启动`)

        // 开始轮询任务状态，每2秒查询一次，最多持续5分钟
        try {
          const result = await pollCrawlJobStatus(
            jobId,
            (status: CrawlJobStatus, detail: CrawlJobDetailResponse['data']) => {
              // 实时更新UI进度反馈
              influencer.updateProgress = detail.progress.percentage

              // 根据状态显示不同的提示
              if (status === 'running') {
                influencer.updateStatus = `正在更新: ${detail.progress.percentage.toFixed(0)}%`
                if (detail.progress.current_keyword) {
                  influencer.updateStatus += ` (${detail.progress.current_keyword})`
                }
              } else if (status === 'queued') {
                influencer.updateStatus = '任务排队中...'
              }

              log.debug(`[更新] 任务进度: ${status} - ${detail.progress.percentage}%`, detail)
            },
            2000,  // 每2秒查询一次
            150    // 最多持续5分钟 (150次 * 2秒 = 300秒)
          )

          // 任务完成
          if (result.status === 'completed') {
            influencer.updateStatus = '更新成功'
            ElMessage.success({
              message: `达人"${influencer.nick_name}"数据更新完成`,
              duration: 3000
            })

            // 刷新列表数据
            if (onRefresh) {
              setTimeout(() => {
                onRefresh()
              }, 1000)
            }
          } else if (result.status === 'failed') {
            influencer.updateStatus = '更新失败'
            ElMessage.error(`更新失败: ${result.error_message || '任务执行失败'}`)
          } else if (result.status === 'cancelled') {
            influencer.updateStatus = '已取消'
            ElMessage.warning('任务已取消')
          }
        } catch (pollError) {
          log.error('[更新] 轮询任务状态失败:', pollError)
          influencer.updateStatus = '轮询超时'
          ElMessage.warning('任务执行时间较长，请稍后刷新查看结果')

          // 即使轮询超时，也尝试刷新数据
          if (onRefresh) {
            setTimeout(() => {
              onRefresh()
            }, 2000)
          }
        }
      } else {
        ElMessage.error(`更新失败: ${response.message || '未知错误'}`)
      }
    } catch (error) {
      log.error('[更新] 更新达人数据失败:', error)
      ElMessage.error(`更新失败: ${(error as Error).message || '网络错误'}`)
    } finally {
      // 清除加载状态
      influencer.updating = false
      influencer.updateProgress = 0
      influencer.updateStatus = ''
    }
  }

  /**
   * 批量更新达人数据
   */
  const batchUpdateInfluencers = async (
    influencers: Influencer[],
    onRefresh?: () => void | Promise<void>
  ) => {
    const validInfluencers = influencers.filter(item => item.star_id)

    if (validInfluencers.length === 0) {
      ElMessage.warning('所选达人均缺少星图ID，无法更新')
      return
    }

    if (validInfluencers.length !== influencers.length) {
      ElMessage.warning(
        `${influencers.length - validInfluencers.length} 位达人缺少星图ID，将跳过`
      )
    }

    // 确认批量操作
    try {
      await ElMessageBox.confirm(
        `确定要更新 ${validInfluencers.length} 位达人的数据吗？此操作可能需要较长时间。`,
        '确认批量更新',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
    } catch (error) {
      return
    }

    // 依次更新
    let successCount = 0
    let failCount = 0

    for (const influencer of validInfluencers) {
      try {
        await updateInfluencerData(influencer, onRefresh)
        successCount++
      } catch (error) {
        failCount++
        log.error(`[批量更新] ${influencer.nick_name} 更新失败:`, error)
      }
    }

    ElMessage.success(
      `批量更新完成: 成功 ${successCount} 位, 失败 ${failCount} 位`
    )
  }

  return {
    updateInfluencerData,
    batchUpdateInfluencers,
  }
}
