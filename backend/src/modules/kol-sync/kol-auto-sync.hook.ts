import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { KolSyncService, SyncStatus } from './kol-sync.service';

/**
 * KOL自动同步Hook服务
 *
 * 在KOL创建和更新后自动触发数据同步
 */
@Injectable()
export class KolAutoSyncHook {
  private readonly logger = new Logger(KolAutoSyncHook.name);

  constructor(
    @Inject(forwardRef(() => KolSyncService))
    private readonly kolSyncService: KolSyncService,
  ) {}

  /**
   * KOL创建后钩子
   * 自动触发数据同步（异步，不阻塞主流程）
   */
  onKolCreated(kolId: number): void {
    this.logger.log(`KOL ${kolId} 创建成功，触发自动同步`);

    // 异步执行，不等待结果，避免阻塞主流程
    this.kolSyncService
      .retrySyncKol(kolId)
      .then((result) => {
        this.logger.log(`KOL ${kolId} 自动同步完成，状态: ${result.status}`);
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`KOL ${kolId} 自动同步失败: ${msg}`);
      });
  }

  /**
   * KOL更新后钩子
   * 如果account_id或platform发生变化，触发重新同步
   */
  onKolUpdated(
    kolId: number,
    changes: { platform?: string; account_id?: string },
  ): void {
    // 只有当关键字段变化时才重新同步
    if (changes.platform || changes.account_id) {
      this.logger.log(`KOL ${kolId} 关键字段更新，触发重新同步`);

      // 异步执行
      this.kolSyncService
        .retrySyncKol(kolId)
        .then((result) => {
          this.logger.log(`KOL ${kolId} 重新同步完成，状态: ${result.status}`);
        })
        .catch((error) => {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`KOL ${kolId} 重新同步失败: ${msg}`);
        });
    }
  }

  /**
   * 批量KOL创建后钩子
   */
  onBatchKolsCreated(kolIds: number[]): void {
    if (kolIds.length === 0) return;

    this.logger.log(`批量创建 ${kolIds.length} 个KOL，触发批量同步`);

    // 异步执行批量同步
    Promise.all(kolIds.map((id) => this.kolSyncService.retrySyncKol(id)))
      .then((results) => {
        const successCount = results.filter(
          (r) => r.status === SyncStatus.SUCCESS,
        ).length;
        const failedCount = results.length - successCount;
        this.logger.log(
          `批量同步完成: 成功 ${successCount}, 失败 ${failedCount}`,
        );
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`批量同步失败: ${msg}`);
      });
  }
}
