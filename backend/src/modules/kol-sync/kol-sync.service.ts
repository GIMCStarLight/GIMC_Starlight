import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { KolList, MatchStatus } from '../../database/entities/kol-list.entity';
import { AuthorCoreView } from '../../database/entities/author-core-view.entity';
import { HttpService } from '@nestjs/axios';
import { BatchSyncKolDto, KolSyncItemDto, SingleSyncKolDto } from './dto';

/**
 * Enum for synchronization status.
 */
export enum SyncStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * Interface for a single synchronization result.
 */
export interface SyncResult {
  kolId: number;
  accountId: string;
  status: SyncStatus;
  errorMessage?: string;
  matchedAuthorId?: string;
  syncedAt?: Date;
}

/**
 * Interface for batch synchronization result.
 */
export interface BatchSyncResult {
  totalCount: number;
  successCount: number;
  failedCount: number;
  partialCount: number;
  results: SyncResult[];
  crawlJobId?: string;
}

/**
 * Interface for the status of a crawl job.
 */
interface CrawlJobStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: {
    percentage: number;
  };
  stats: {
    authors_total?: number;
    authors_found?: number;
    authors_not_found?: number;
    total_authors_found?: number;
    successful_requests?: number;
    failed_requests?: number;
  };
}

@Injectable()
export class KolSyncService {
  private readonly logger = new Logger(KolSyncService.name);
  private readonly BATCH_SIZE = 100;
  private readonly MAX_POLL_ATTEMPTS = 60;
  private readonly POLL_INTERVAL = 5000; // 5 seconds

  constructor(
    @InjectRepository(KolList, 'postgres')
    private readonly kolRepository: Repository<KolList>,
    @InjectRepository(AuthorCoreView, 'crawler')
    private readonly authorRepository: Repository<AuthorCoreView>,
    private readonly httpClient: HttpService,
  ) {}

  /**
   * Syncs a batch of KOLs.
   */
  async syncBatchKols(dto: BatchSyncKolDto): Promise<BatchSyncResult> {
    const { kols } = dto;
    this.logger.log('====== [syncBatchKols] Start batch sync ======');
    this.logger.log(`[syncBatchKols] Batch size: ${kols.length}`);

    if (kols.length === 0) {
      this.logger.warn('[syncBatchKols] Batch list is empty, skipping sync');
      return {
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
        partialCount: 0,
        results: [],
      };
    }

    const results: SyncResult[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < kols.length; i += this.BATCH_SIZE) {
      const batchItems = kols.slice(i, i + this.BATCH_SIZE);
      this.logger.log(
        `[syncBatchKols] Processing batch: ${
          i / this.BATCH_SIZE + 1
        }, size: ${batchItems.length}`,
      );

      const batchResult = await this.processBatch(batchItems);
      results.push(...batchResult.results);
      totalSuccess += batchResult.successCount;
      totalFailed += batchResult.failedCount;
    }

    this.logger.log('====== [syncBatchKols] Batch sync finished ======');
    return {
      totalCount: kols.length,
      successCount: totalSuccess,
      failedCount: totalFailed,
      partialCount: 0, // In this simplified model, we don't calculate partial success
      results,
    };
  }

  /**
   * 根据 KOL ID 列表构建同步项（填充 account_id），并过滤不满足同步条件的项。
   */
  async buildItemsFromKolIds(kolIds: number[]): Promise<KolSyncItemDto[]> {
    if (!kolIds || kolIds.length === 0) {
      return [];
    }

    const kols = await this.kolRepository.find({ where: { id: In(kolIds) } });
    const items = kols
      .filter((kol) => this.shouldSync(kol))
      .map((kol) => ({ kol_id: kol.id, account_id: kol.account_id }));

    return items;
  }

  /**
   * Retries a single failed KOL sync.
   */
  async retrySyncKol(kolId: number): Promise<SyncResult> {
    this.logger.log(`[retrySyncKol] Start retrying KOL ID: ${kolId}`);
    const kol = await this.kolRepository.findOne({ where: { id: kolId } });
    if (!kol) {
      this.logger.error(`[retrySyncKol] KOL does not exist - ID: ${kolId}`);
      throw new HttpException('KOL does not exist', HttpStatus.NOT_FOUND);
    }
    if (!kol.account_id) {
      this.logger.error(
        `[retrySyncKol] KOL account_id is empty - ID: ${kolId}`,
      );
      throw new HttpException(
        'KOL account_id is empty',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.syncSingleKol({ kol_id: kolId, account_id: kol.account_id });
  }

  /**
   * Retries all failed KOL syncs.
   */
  async retryFailedSyncs(): Promise<BatchSyncResult> {
    const failedKols = await this.kolRepository.find({
      where: [
        { match_status: MatchStatus.REJECTED },
        { match_status: MatchStatus.PENDING },
      ],
    });

    const itemsToSync = failedKols
      .filter((kol) => this.shouldSync(kol))
      .map((kol) => ({ kol_id: kol.id, account_id: kol.account_id }));

    if (itemsToSync.length === 0) {
      this.logger.log('No failed tasks to retry');
      return {
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
        partialCount: 0,
        results: [],
      };
    }

    this.logger.log(`Found ${itemsToSync.length} tasks to retry`);
    return this.syncBatchKols({ kols: itemsToSync });
  }

  /**
   * Gets synchronization statistics.
   */
  async getSyncStats(): Promise<{
    total: number;
    unmatched: number;
    pending: number;
    matched: number;
    rejected: number;
  }> {
    this.logger.log('Getting sync stats');
    const statsStartTime = Date.now();

    try {
      // Use raw SQL query to avoid TypeORM enum type issues
      const stats = await this.kolRepository.query(
        `
        SELECT 
          COUNT(*)::INTEGER as total,
          COUNT(CASE WHEN match_status = $1 THEN 1 END)::INTEGER as unmatched,
          COUNT(CASE WHEN match_status = $2 THEN 1 END)::INTEGER as pending,
          COUNT(CASE WHEN match_status = $3 THEN 1 END)::INTEGER as matched,
          COUNT(CASE WHEN match_status = $4 THEN 1 END)::INTEGER as rejected
        FROM kol_list
        WHERE deleted_at IS NULL
        `,
        [
          MatchStatus.UNMATCHED,
          MatchStatus.PENDING,
          MatchStatus.MATCHED,
          MatchStatus.REJECTED,
        ],
      );

      const result = stats[0];
      const statsResult = {
        total: result.total || 0,
        unmatched: result.unmatched || 0,
        pending: result.pending || 0,
        matched: result.matched || 0,
        rejected: result.rejected || 0,
      };

      const statsDuration = Date.now() - statsStartTime;
      this.logger.log(`Stats retrieval complete, duration: ${statsDuration}ms`);
      this.logger.log(
        `Stats result: total=${statsResult.total}, unmatched=${statsResult.unmatched}, pending=${statsResult.pending}, matched=${statsResult.matched}, rejected=${statsResult.rejected}`,
      );

      return statsResult;
    } catch (error) {
      const statsDuration = Date.now() - statsStartTime;
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get stats, duration: ${statsDuration}ms: ${errMsg}`,
      );
      throw new HttpException(
        'Failed to get stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Triggers a crawler job.
   */
  private async triggerCrawlJob(accountIds: string[]): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpClient.post<{
          data?: { job_id: string };
        }>('/crawl-jobs', {
          task_type: 'batch_handles',
          target: {
            handles: accountIds,
            dedup: true,
          },
          options: {
            save_pg: true,
          },
        }),
      );

      const job_id = response.data?.data?.job_id;
      if (!job_id) {
        throw new Error('Crawler API did not return job_id');
      }
      return job_id;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to trigger crawler job: ${errMsg}`);
      throw new HttpException(
        'Failed to trigger crawler job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Polls the status of a crawler job.
   */
  private async pollCrawlJobStatus(jobId: string): Promise<CrawlJobStatus> {
    for (let i = 0; i < this.MAX_POLL_ATTEMPTS; i++) {
      try {
        const response = await firstValueFrom(
          this.httpClient.get<{
            // 详情接口返回包含 progress 与 stats 的完整信息
            data?: CrawlJobStatus;
          }>(`/crawl-jobs/${jobId}`),
        );
        const jobStatus = response.data?.data;

        if (!jobStatus) {
          throw new Error('Could not get job status');
        }

        this.logger.debug(
          `[pollCrawlJobStatus] Job ${jobId} status: ${jobStatus.status}, progress: ${jobStatus.progress?.percentage}%`,
        );

        if (['completed', 'failed', 'cancelled'].includes(jobStatus.status)) {
          return jobStatus;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to poll job status (attempt ${i + 1}/${
            this.MAX_POLL_ATTEMPTS
          }): ${errorMessage}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, this.POLL_INTERVAL));
    }
    throw new Error(`Polling job status timed out: ${jobId}`);
  }

  /**
   * 获取指定抖音号（handle）的最新 run_id。
   * 来自 crawler_db.author_square_runs 的 second_label 精确匹配。
   */
  private async getRunIdForHandle(handle: string): Promise<number | null> {
    try {
      const rows: Array<{ id: number }> = await this.authorRepository.query(
        'SELECT id FROM author_square_runs WHERE second_label = $1 ORDER BY id DESC LIMIT 1',
        [handle],
      );
      const runId = rows?.[0]?.id ?? null;
      this.logger.log(
        `[getRunIdForHandle] handle=${handle} -> run_id=${runId}`,
      );
      return runId;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[getRunIdForHandle] Failed to query run_id: ${errMsg}`);
      return null;
    }
  }

  /**
   * 根据 run_id 查询作者候选（author_square_authors）。
   */
  private async getAuthorsByRunId(
    runId: number,
  ): Promise<Array<{ author_id: string; star_id: string; nick_name: string }>> {
    try {
      const rows: Array<{
        author_id: string;
        star_id: string;
        nick_name: string;
      }> = await this.authorRepository.query(
        'SELECT author_id, star_id, nick_name FROM author_square_authors WHERE run_id = $1',
        [runId],
      );
      this.logger.log(
        `[getAuthorsByRunId] run_id=${runId} -> candidates=${rows.length}`,
      );
      return rows ?? [];
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[getAuthorsByRunId] Failed to query candidates by run_id=${runId}: ${errMsg}`,
      );
      return [];
    }
  }

  /**
   * 尝试用候选记录在 v_authors_core 中找到完整作者。
   */
  private async findAuthorCoreByCandidate(cand: {
    author_id: string;
    star_id: string;
    nick_name: string;
  }): Promise<AuthorCoreView | null> {
    // 先尝试按 author_id
    try {
      const byAuthorId = await this.authorRepository.findOne({
        where: { author_id: cand.author_id },
      });
      if (byAuthorId) {
        return byAuthorId;
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[findAuthorCoreByCandidate] find by author_id failed: ${errMsg}`,
      );
    }

    // 再尝试按 star_id
    try {
      if (cand.star_id) {
        const byStarId = await this.authorRepository.findOne({
          where: { star_id: cand.star_id },
        });
        if (byStarId) {
          return byStarId;
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[findAuthorCoreByCandidate] find by star_id failed: ${errMsg}`,
      );
    }

    return null;
  }

  /**
   * 回退匹配：按 author_id / star_id 精确，或按昵称模糊匹配（优先粉丝数）。
   */
  private async findAuthorFallback(
    accountId: string,
    accountName?: string,
  ): Promise<AuthorCoreView | null> {
    // 精确匹配 author_id
    try {
      const byAuthorId = await this.authorRepository.findOne({
        where: { author_id: accountId },
      });
      if (byAuthorId) return byAuthorId;
    } catch (error) {
      this.logger.warn(
        `[findAuthorFallback] exact author_id match failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 精确匹配 star_id
    try {
      const byStarId = await this.authorRepository.findOne({
        where: { star_id: accountId },
      });
      if (byStarId) return byStarId;
    } catch (error) {
      this.logger.warn(
        `[findAuthorFallback] exact star_id match failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 昵称模糊匹配，按粉丝数倒序取一个
    if (accountName && accountName.trim().length > 0) {
      try {
        const qb = this.authorRepository
          .createQueryBuilder('influencer')
          .where('influencer.nick_name ILIKE :name', {
            name: `%${accountName}%`,
          })
          .orderBy('influencer.follower', 'DESC')
          .limit(1);
        const fuzzy = await qb.getOne();
        if (fuzzy) return fuzzy;
      } catch (error) {
        this.logger.warn(
          `[findAuthorFallback] fuzzy nick_name match failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return null;
  }

  /**
   * Finds an author with retries.
   */
  private async findAuthorWithRetry(
    accountId: string,
    retries = 3,
    delay = 1000,
  ): Promise<AuthorCoreView | null> {
    for (let i = 0; i < retries; i++) {
      try {
        // 优先按 author_id 查找；失败则按 star_id 再试
        const author =
          (await this.authorRepository.findOne({
            where: { author_id: accountId },
          })) ||
          (await this.authorRepository.findOne({
            where: { star_id: accountId },
          }));
        if (author) {
          return author;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to find author (attempt ${i + 1}/${retries}): ${errorMessage}`,
        );
        if (i === retries - 1) {
          throw new Error(errorMessage);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  /**
   * Links a KOL to an Author.
   */
  private async linkKolToAuthor(
    kol: KolList,
    author: AuthorCoreView,
  ): Promise<void> {
    kol.matched_author_id = author.author_id;
    kol.match_status = MatchStatus.MATCHED;
    kol.matched_at = new Date();
    const snapshot = { ...author };
    kol.matched_snapshot = snapshot;
    kol.match_confidence = 1.0; // Confidence is 1.0 as it's a direct find from the crawler

    await this.kolRepository.save(kol);
    this.logger.log(
      `[linkKolToAuthor] KOL ${kol.id} linked to Author ${author.author_id} successfully`,
    );
  }

  /**
   * Updates the sync status of a KOL.
   */
  private async updateSyncStatus(
    kolId: number,
    status: MatchStatus,
  ): Promise<void> {
    await this.kolRepository.update(kolId, { match_status: status });
    this.logger.log(
      `[updateSyncStatus] KOL ${kolId} status updated to ${status}`,
    );
  }

  /**
   * Determines if a KOL should be synced.
   */
  private shouldSync(kol: KolList): boolean {
    if (kol.platform !== '抖音') {
      this.logger.warn(
        `[shouldSync] KOL ${kol.id} platform is not '抖音', but '${kol.platform}', skipping.`,
      );
      return false;
    }
    if (!kol.account_id) {
      return false;
    }
    if (kol.match_status === MatchStatus.MATCHED && kol.matched_at) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (kol.matched_at > sevenDaysAgo) {
        this.logger.log(
          `[shouldSync] KOL ${kol.id} was successfully synced within the last 7 days, skipping`,
        );
        return false;
      }
    }
    return true;
  }

  // =====================
  // 调整同步主流程（单个与批量），优先使用 run_id 关联作者；失败则回退。
  // =====================
  async syncSingleKol(dto: SingleSyncKolDto): Promise<SyncResult> {
    const { kol_id: kolId, account_id: accountId } = dto;
    this.logger.log(
      `====== [syncSingleKol] Start sync for KOL ID: ${kolId} ======`,
    );

    try {
      const kol = await this.kolRepository.findOne({ where: { id: kolId } });
      if (!kol) {
        throw new HttpException('KOL does not exist', HttpStatus.NOT_FOUND);
      }

      if (!this.shouldSync(kol)) {
        this.logger.log(
          `[syncSingleKol] KOL ${kolId} does not meet sync criteria, skipping`,
        );
        return {
          kolId,
          accountId,
          status: SyncStatus.FAILED,
          errorMessage: 'Does not meet sync criteria',
        };
      }

      await this.updateSyncStatus(kolId, MatchStatus.PENDING);
      this.logger.log(
        `[syncSingleKol] Triggering crawler job for account: ${accountId}`,
      );
      const crawlJobId = await this.triggerCrawlJob([accountId]);
      this.logger.log(
        `[syncSingleKol] Crawler job created successfully: ${crawlJobId}`,
      );

      this.logger.log(
        `[syncSingleKol] Start polling job status: ${crawlJobId}`,
      );
      const jobResult = await this.pollCrawlJobStatus(crawlJobId);
      this.logger.log(
        `[syncSingleKol] Job finished, status: ${jobResult.status}, stats: ${JSON.stringify(jobResult.stats)}`,
      );

      if (
        jobResult.status === 'completed' &&
        ((jobResult.stats?.authors_total ?? 0) > 0 || 
         (jobResult.stats?.authors_found ?? 0) > 0 || 
         (jobResult.stats?.total_authors_found ?? 0) > 0)
      ) {
        // 优先：按 handle 查 run_id，再按 run_id 取候选并关联
        const runId = await this.getRunIdForHandle(accountId);
        let author: AuthorCoreView | null = null;

        if (runId) {
          const candidates = await this.getAuthorsByRunId(runId);
          for (const cand of candidates) {
            author = await this.findAuthorCoreByCandidate(cand);
            if (author) {
              this.logger.log(
                `[syncSingleKol] Found matched author by run_id=${runId}: ${author.author_id}`,
              );
              break;
            }
          }
        } else {
          this.logger.warn(
            `[syncSingleKol] No run_id found for handle ${accountId}, will fallback match`,
          );
        }

        // 回退：按 accountId 与昵称尝试匹配
        if (!author) {
          author = await this.findAuthorFallback(accountId, kol.account_name);
        }

        if (author) {
          await this.linkKolToAuthor(kol, author);
          this.logger.log(
            `====== [syncSingleKol] Sync for KOL ID: ${kolId} successful ======`,
          );
          return {
            kolId,
            accountId,
            status: SyncStatus.SUCCESS,
            matchedAuthorId: author.author_id,
            syncedAt: new Date(),
          };
        } else {
          throw new Error('Matched author not found after successful crawl');
        }
      } else {
        throw new Error(
          `Crawler job did not succeed or did not find any authors (status: ${jobResult.status})`,
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[syncSingleKol] Sync failed for KOL ID: ${kolId}: ${errMsg}`,
      );
      await this.updateSyncStatus(kolId, MatchStatus.REJECTED);
      this.logger.log(
        `====== [syncSingleKol] Sync for KOL ID: ${kolId} failed ======`,
      );

      return {
        kolId,
        accountId,
        status: SyncStatus.FAILED,
        errorMessage: errMsg,
      };
    }
  }

  async processBatch(items: KolSyncItemDto[]): Promise<BatchSyncResult> {
    const batchStartTime = Date.now();
    const batchResult: BatchSyncResult = {
      totalCount: items.length,
      successCount: 0,
      failedCount: 0,
      partialCount: 0,
      results: [],
    };

    if (items.length === 0) {
      this.logger.warn('[processBatch] No items to process');
      return batchResult;
    }

    // 触发批量爬虫任务
    try {
      const kolIds = items.map((i) => i.kol_id);
      const accountIds = items.map((i) => i.account_id);
      this.logger.log(
        `[processBatch] Triggering crawler job for ${accountIds.length} accounts`,
      );
      const crawlJobId = await this.triggerCrawlJob(accountIds);
      batchResult.crawlJobId = crawlJobId;
      this.logger.log(
        `[processBatch] Crawler job created successfully: ${crawlJobId}`,
      );

      this.logger.log(`[processBatch] Start polling job status: ${crawlJobId}`);
      const jobResult = await this.pollCrawlJobStatus(crawlJobId);
      const authorsTotal = jobResult.stats?.authors_total;
      this.logger.log(
        `[processBatch] Job finished, status: ${jobResult.status}, authors_total=${
          authorsTotal ?? 'n/a'
        }`,
      );

      if (jobResult.status === 'completed') {
        this.logger.log(
          `[processBatch] Start processing match results for ${items.length} KOLs`,
        );

        const kols = await this.kolRepository.find({
          where: { id: In(kolIds) },
        });
        const kolMap = new Map(kols.map((k) => [k.id, k]));

        for (const item of items) {
          const { kol_id: kolId, account_id: accountId } = item;
          const kol = kolMap.get(kolId);
          try {
            if (!kol) {
              this.logger.warn(
                `[processBatch] KOL ${kolId} not found in db, skipping`,
              );
              batchResult.results.push({
                kolId,
                accountId,
                status: SyncStatus.FAILED,
                errorMessage: 'KOL entity not found',
              });
              batchResult.failedCount++;
              continue;
            }

            // run_id 优先匹配
            const runId = await this.getRunIdForHandle(accountId);
            let author: AuthorCoreView | null = null;
            if (runId) {
              const candidates = await this.getAuthorsByRunId(runId);
              for (const cand of candidates) {
                author = await this.findAuthorCoreByCandidate(cand);
                if (author) {
                  this.logger.log(
                    `[processBatch] KOL ${kolId} matched by run_id=${runId}: ${author.author_id}`,
                  );
                  break;
                }
              }
            }

            // 回退匹配
            if (!author) {
              author = await this.findAuthorFallback(
                accountId,
                kol.account_name,
              );
            }

            if (author) {
              await this.linkKolToAuthor(kol, author);
              batchResult.results.push({
                kolId,
                accountId,
                status: SyncStatus.SUCCESS,
                matchedAuthorId: author.author_id,
                syncedAt: new Date(),
              });
              batchResult.successCount++;
            } else {
              this.logger.warn(
                `[processBatch] KOL ${kolId} did not find matched author`,
              );
              await this.updateSyncStatus(kolId, MatchStatus.REJECTED);
              batchResult.results.push({
                kolId,
                accountId,
                status: SyncStatus.FAILED,
                errorMessage: 'Matched author not found',
              });
              batchResult.failedCount++;
            }
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              `[processBatch] Failed to process KOL ${item.kol_id}: ${errMsg}`,
            );
            await this.updateSyncStatus(item.kol_id, MatchStatus.REJECTED);
            batchResult.results.push({
              kolId: item.kol_id,
              accountId: item.account_id,
              status: SyncStatus.FAILED,
              errorMessage: errMsg,
            });
            batchResult.failedCount++;
          }
        }
      } else {
        throw new Error(
          `Crawler job did not succeed (status: ${jobResult.status})`,
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[processBatch] Batch processing failed: ${errMsg}`);
      // 异常情况下，尝试逐项回退匹配，而不是全部标记失败
      try {
        const kolIds = items.map((i) => i.kol_id);
        const kols = await this.kolRepository.find({
          where: { id: In(kolIds) },
        });
        const kolMap = new Map(kols.map((k) => [k.id, k]));

        for (const item of items) {
          const { kol_id: kolId, account_id: accountId } = item;
          const kol = kolMap.get(kolId);
          if (!kol) {
            this.logger.warn(
              `[processBatch] (fallback) KOL ${kolId} not found in db, skipping`,
            );
            batchResult.results.push({
              kolId,
              accountId,
              status: SyncStatus.FAILED,
              errorMessage: 'KOL entity not found',
            });
            batchResult.failedCount++;
            continue;
          }

          try {
            const author = await this.findAuthorFallback(
              accountId,
              kol.account_name,
            );

            if (author) {
              await this.linkKolToAuthor(kol, author);
              batchResult.results.push({
                kolId,
                accountId,
                status: SyncStatus.SUCCESS,
                matchedAuthorId: author.author_id,
                syncedAt: new Date(),
              });
              batchResult.successCount++;
            } else {
              await this.updateSyncStatus(kolId, MatchStatus.REJECTED);
              batchResult.results.push({
                kolId,
                accountId,
                status: SyncStatus.FAILED,
                errorMessage: 'Matched author not found (fallback)',
              });
              batchResult.failedCount++;
            }
          } catch (innerError) {
            const innerMsg =
              innerError instanceof Error
                ? innerError.message
                : String(innerError);
            this.logger.error(
              `[processBatch] (fallback) Failed to process KOL ${kolId}: ${innerMsg}`,
            );
            await this.updateSyncStatus(kolId, MatchStatus.REJECTED);
            batchResult.results.push({
              kolId,
              accountId,
              status: SyncStatus.FAILED,
              errorMessage: innerMsg,
            });
            batchResult.failedCount++;
          }
        }
      } catch (outerError) {
        const outerMsg =
          outerError instanceof Error ? outerError.message : String(outerError);
        this.logger.error(
          `[processBatch] (fallback) Batch processing failed entirely: ${outerMsg}`,
        );
        // 最后兜底：全部标记失败
        for (const item of items) {
          await this.updateSyncStatus(item.kol_id, MatchStatus.REJECTED);
          batchResult.results.push({
            kolId: item.kol_id,
            accountId: item.account_id,
            status: SyncStatus.FAILED,
            errorMessage: errMsg,
          });
        }
        batchResult.failedCount = items.length;
      }
    }

    const duration = Date.now() - batchStartTime;
    this.logger.log(`[processBatch] Completed, duration=${duration}ms`);
    return batchResult;
  }
}
