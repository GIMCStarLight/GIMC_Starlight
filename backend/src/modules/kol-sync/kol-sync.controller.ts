import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpStatus,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  KolSyncService,
  SyncResult,
  BatchSyncResult,
  SyncStatus,
} from './kol-sync.service';
import { SingleSyncKolDto, BatchSyncRequestDto, SyncStatsDto } from './dto';

/**
 * 私域达人同步控制器
 *
 * 提供KOL数据与公海达人数据同步的API接口
 */

@ApiTags('KOL数据同步')
@Controller('kol-sync')
export class KolSyncController {
  private readonly logger = new Logger(KolSyncController.name);

  constructor(private readonly kolSyncService: KolSyncService) {}

  @Post('single')
  @ApiOperation({
    summary: '同步单个KOL数据',
    description: '根据KOL ID和抖音账号ID触发单个私域达人与公海达人的数据同步',
  })
  @ApiBody({ type: SingleSyncKolDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '同步任务已触发',
    schema: {
      type: 'object',
      properties: {
        kolId: { type: 'number' },
        accountId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'success', 'failed', 'partial'],
        },
        matchedAuthorId: { type: 'string' },
        errorMessage: { type: 'string' },
        syncedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async syncSingleKol(@Body() syncDto: SingleSyncKolDto): Promise<SyncResult> {
    const startTime = Date.now();
    this.logger.log(
      `🎯 [Controller] 收到同步请求 - KOL ID: ${syncDto.kol_id}, Account ID: ${syncDto.account_id}`,
    );

    try {
      const result = await this.kolSyncService.syncSingleKol(syncDto);
      const duration = Date.now() - startTime;

      this.logger.log(
        `✅ [Controller] 同步完成 - KOL ID: ${syncDto.kol_id}, 状态: ${result.status}, 耗时: ${duration}ms`,
      );

      if (result.status === SyncStatus.FAILED) {
        this.logger.warn(
          `⚠️ [Controller] 同步失败详情 - KOL ID: ${syncDto.kol_id}, 错误: ${result.errorMessage}`,
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `💥 [Controller] 同步异常 - KOL ID: ${syncDto.kol_id}, 耗时: ${duration}ms, 错误:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  @Post('batch')
  @ApiOperation({
    summary: '批量同步KOL数据',
    description:
      '根据KOL ID和抖音账号ID列表批量触发私域达人与公海达人的数据同步',
  })
  @ApiBody({ type: BatchSyncRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量同步完成',
    schema: {
      type: 'object',
      properties: {
        totalCount: { type: 'number' },
        successCount: { type: 'number' },
        failedCount: { type: 'number' },
        partialCount: { type: 'number' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kolId: { type: 'number' },
              accountId: { type: 'string' },
              status: { type: 'string' },
              matchedAuthorId: { type: 'string' },
              errorMessage: { type: 'string' },
              syncedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        crawlJobId: { type: 'string' },
      },
    },
  })
  async syncBatchKols(
    @Body() batchSyncDto: BatchSyncRequestDto,
  ): Promise<BatchSyncResult> {
    const startTime = Date.now();
    let items = batchSyncDto.kols ?? [];

    // 兼容前端仅传 kolIds 的场景：后端根据 ID 查询出 account_id
    if ((!items || items.length === 0) && batchSyncDto.kolIds?.length) {
      items = await this.kolSyncService.buildItemsFromKolIds(
        batchSyncDto.kolIds,
      );
    }

    const kolCount = items.length;
    this.logger.log(
      `🚀 [Controller] 收到批量同步请求 - 数量: ${kolCount}, 前10个KOLs: ${JSON.stringify(items.slice(0, 10))}`,
    );

    try {
      const result = await this.kolSyncService.syncBatchKols({ kols: items });
      const duration = Date.now() - startTime;

      this.logger.log(
        `✅ [Controller] 批量同步完成 - 总数: ${result.totalCount}, 成功: ${result.successCount}, 失败: ${result.failedCount}, 耗时: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `💥 [Controller] 批量同步异常 - 数量: ${kolCount}, 耗时: ${duration}ms, 错误:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  @Post('retry/:id')
  @ApiOperation({
    summary: '重试同步失败的KOL',
    description: '手动重试单个同步失败的KOL数据',
  })
  @ApiParam({ name: 'id', description: 'KOL ID', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '重试完成',
  })
  async retrySyncKol(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SyncResult> {
    this.logger.log(`手动重试KOL同步: ID ${id}`);
    return await this.kolSyncService.retrySyncKol(id);
  }

  @Post('retry-failed')
  @ApiOperation({
    summary: '批量重试所有失败的同步任务',
    description: '自动查找所有同步失败的KOL并重新尝试同步',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量重试完成',
  })
  async retryFailedSyncs(): Promise<BatchSyncResult> {
    this.logger.log('触发批量重试失败任务');
    return await this.kolSyncService.retryFailedSyncs();
  }

  @Get('stats')
  @ApiOperation({
    summary: '获取同步统计信息',
    description: '获取KOL数据同步的整体统计信息，包括匹配率、同步成功率等',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '统计信息',
    type: SyncStatsDto,
  })
  async getSyncStats(): Promise<SyncStatsDto> {
    this.logger.log('获取同步统计信息');
    return await this.kolSyncService.getSyncStats();
  }
}
