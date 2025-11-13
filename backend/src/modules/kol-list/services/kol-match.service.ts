import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, Not } from 'typeorm';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  KolList,
  MatchStatus,
} from '../../../database/entities/kol-list.entity';
import {
  KolPrivateMatches,
  MatchMethod,
  ReviewStatus,
} from '../../../database/entities/kol-private-matches.entity';
import {
  KolMatchLogs,
  MatchOperation,
} from '../../../database/entities/kol-match-logs.entity';
import { QueryMatchesDto } from '../dto/match.dto';
import { PaginatedResponse } from '../dto/response.dto';

export interface MatchCandidate {
  publicAuthorId: string;
  confidence: number;
  method: MatchMethod;
  details: any;
  publicSnapshot?: any;
}

export interface MatchResult {
  privateKolId: number;
  candidates: MatchCandidate[];
  totalCandidates: number;
}

export interface BatchMatchOptions {
  batchSize?: number;
  minConfidence?: number;
  enableCache?: boolean;
  platforms?: string[];
}

@Injectable()
export class KolMatchService {
  private readonly logger = new Logger(KolMatchService.name);
  private readonly CACHE_TTL = 3600; // 1小时缓存
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly MIN_CONFIDENCE = 0.6;

  constructor(
    @InjectRepository(KolList, 'postgres')
    private readonly kolListRepository: Repository<KolList>,
    @InjectRepository(KolPrivateMatches, 'postgres')
    private readonly matchesRepository: Repository<KolPrivateMatches>,
    @InjectRepository(KolMatchLogs, 'postgres')
    private readonly logsRepository: Repository<KolMatchLogs>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectDataSource('postgres')
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 批量匹配私域达人
   */
  async batchMatchPrivateKols(
    options: BatchMatchOptions = {},
  ): Promise<MatchResult[]> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      minConfidence = this.MIN_CONFIDENCE,
      enableCache = true,
      platforms,
    } = options;

    this.logger.log(`开始批量匹配，批次大小: ${batchSize}`);

    // 获取待匹配的私域达人
    const unmatchedKols = await this.getUnmatchedPrivateKols(
      batchSize,
      platforms,
    );

    const results: MatchResult[] = [];

    // 分批处理
    for (let i = 0; i < unmatchedKols.length; i += batchSize) {
      const batch = unmatchedKols.slice(i, i + batchSize);
      const batchResults = await this.processBatch(
        batch,
        minConfidence,
        enableCache,
      );
      results.push(...batchResults);

      // 记录进度
      this.logger.log(
        `已处理 ${Math.min(i + batchSize, unmatchedKols.length)}/${
          unmatchedKols.length
        } 个达人`,
      );
    }

    this.logger.log(`批量匹配完成，共处理 ${unmatchedKols.length} 个达人`);
    return results;
  }

  /**
   * 单个达人匹配
   */
  async matchSingleKol(
    privateKolId: number,
    minConfidence = this.MIN_CONFIDENCE,
  ): Promise<MatchResult> {
    const privateKol = await this.kolListRepository.findOne({
      where: { id: privateKolId },
    });

    if (!privateKol) {
      throw new Error(`私域达人不存在: ${privateKolId}`);
    }

    const candidates = await this.findMatchCandidates(
      privateKol,
      minConfidence,
    );

    return {
      privateKolId,
      candidates,
      totalCandidates: candidates.length,
    };
  }

  /**
   * 确认匹配
   */
  async confirmMatch(
    privateKolId: number,
    publicAuthorId: string,
    userId: number,
    remark?: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新私域达人匹配状态
      await queryRunner.manager.update(
        KolList,
        { id: privateKolId },
        {
          matched_author_id: publicAuthorId,
          match_status: MatchStatus.MATCHED,
          matched_at: new Date(),
          updated_by: userId,
        },
      );

      // 更新匹配记录状态
      await queryRunner.manager.update(
        KolPrivateMatches,
        {
          private_kol_id: privateKolId,
          public_author_id: publicAuthorId,
        },
        {
          review_status: ReviewStatus.APPROVED,
          reviewed_by: userId,
          reviewed_at: new Date(),
          review_remark: remark,
        },
      );

      // 拒绝其他候选匹配
      await queryRunner.manager.update(
        KolPrivateMatches,
        {
          private_kol_id: privateKolId,
          public_author_id: Not(publicAuthorId),
        },
        {
          review_status: ReviewStatus.REJECTED,
          reviewed_by: userId,
          reviewed_at: new Date(),
          review_remark: '其他匹配已确认',
        },
      );

      // 记录操作日志
      await this.logMatchOperation(
        queryRunner,
        privateKolId,
        publicAuthorId,
        MatchOperation.CONFIRM_MATCH,
        userId,
        { remark },
      );

      await queryRunner.commitTransaction();

      // 清除缓存
      await this.clearMatchCache(privateKolId);

      this.logger.log(
        `匹配确认成功: 私域达人${privateKolId} -> 公海达人${publicAuthorId}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('确认匹配失败', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 拒绝匹配
   */
  async rejectMatch(
    privateKolId: number,
    publicAuthorId: string,
    userId: number,
    remark?: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新匹配记录状态
      await queryRunner.manager.update(
        KolPrivateMatches,
        {
          private_kol_id: privateKolId,
          public_author_id: publicAuthorId,
        },
        {
          review_status: ReviewStatus.REJECTED,
          reviewed_by: userId,
          reviewed_at: new Date(),
          review_remark: remark,
        },
      );

      // 记录操作日志
      await this.logMatchOperation(
        queryRunner,
        privateKolId,
        publicAuthorId,
        MatchOperation.REJECT_MATCH,
        userId,
        { remark },
      );

      await queryRunner.commitTransaction();

      // 清除缓存
      await this.clearMatchCache(privateKolId);

      this.logger.log(
        `匹配拒绝成功: 私域达人${privateKolId} -> 公海达人${publicAuthorId}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('拒绝匹配失败', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 获取待匹配的私域达人
   */
  private async getUnmatchedPrivateKols(
    limit: number,
    platforms?: string[],
  ): Promise<KolList[]> {
    const queryBuilder = this.kolListRepository
      .createQueryBuilder('kol')
      .where('kol.match_status = :status', { status: MatchStatus.UNMATCHED })
      .andWhere('kol.deleted_at IS NULL')
      .orderBy('kol.created_at', 'ASC')
      .limit(limit);

    if (platforms && platforms.length > 0) {
      queryBuilder.andWhere('kol.platform IN (:...platforms)', { platforms });
    }

    return queryBuilder.getMany();
  }

  /**
   * 处理批次
   */
  private async processBatch(
    batch: KolList[],
    minConfidence: number,
    enableCache: boolean,
  ): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    for (const privateKol of batch) {
      try {
        const candidates = await this.findMatchCandidates(
          privateKol,
          minConfidence,
          enableCache,
        );

        if (candidates.length > 0) {
          // 保存匹配候选
          await this.saveMatchCandidates(privateKol.id, candidates);

          // 更新私域达人状态为待审核
          await this.kolListRepository.update(privateKol.id, {
            match_status: MatchStatus.PENDING,
          });
        }

        results.push({
          privateKolId: privateKol.id,
          candidates,
          totalCandidates: candidates.length,
        });
      } catch (error) {
        this.logger.error(
          `处理私域达人 ${privateKol.id} 时出错:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return results;
  }

  /**
   * 查找匹配候选
   */
  private async findMatchCandidates(
    privateKol: KolList,
    minConfidence: number,
    enableCache = true,
  ): Promise<MatchCandidate[]> {
    const cacheKey = `match_candidates:${privateKol.id}:${minConfidence}`;

    if (enableCache) {
      const cached = await this.cacheManager.get<MatchCandidate[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const candidates: MatchCandidate[] = [];

    // 1. 精确匹配账号ID
    if (privateKol.account_id) {
      const exactMatches = await this.findExactMatches(privateKol);
      candidates.push(...exactMatches);
    }

    // 2. 精确匹配账号名称
    if (privateKol.account_name) {
      const nameMatches = await this.findNameMatches(privateKol);
      candidates.push(...nameMatches);
    }

    // 3. 模糊匹配
    const fuzzyMatches = await this.findFuzzyMatches(privateKol);
    candidates.push(...fuzzyMatches);

    // 去重并排序
    const uniqueCandidates = this.deduplicateAndSort(candidates);

    // 过滤低置信度候选
    const filteredCandidates = uniqueCandidates.filter(
      (c) => c.confidence >= minConfidence,
    );

    if (enableCache && filteredCandidates.length > 0) {
      await this.cacheManager.set(cacheKey, filteredCandidates, this.CACHE_TTL);
    }

    return filteredCandidates;
  }

  /**
   * 精确匹配账号ID
   */
  private async findExactMatches(
    privateKol: KolList,
  ): Promise<MatchCandidate[]> {
    // 这里需要调用公海达人API进行匹配
    // 暂时返回模拟数据
    await Promise.resolve(); // 避免async警告
    console.log('Processing private KOL:', privateKol.id);
    return [];
  }

  /**
   * 精确匹配账号名称
   */
  private async findNameMatches(
    privateKol: KolList,
  ): Promise<MatchCandidate[]> {
    // 这里需要调用公海达人API进行匹配
    // 暂时返回模拟数据
    await Promise.resolve(); // 避免async警告
    console.log('Processing private KOL:', privateKol.id);
    return [];
  }

  /**
   * 模糊匹配
   */
  private async findFuzzyMatches(
    privateKol: KolList,
  ): Promise<MatchCandidate[]> {
    // 这里需要调用公海达人API进行模糊匹配
    // 暂时返回模拟数据
    await Promise.resolve(); // 避免async警告
    console.log('Processing private KOL:', privateKol.id);
    return [];
  }

  /**
   * 去重并排序
   */
  private deduplicateAndSort(candidates: MatchCandidate[]): MatchCandidate[] {
    const uniqueMap = new Map<string, MatchCandidate>();

    for (const candidate of candidates) {
      const existing = uniqueMap.get(candidate.publicAuthorId);
      if (!existing || candidate.confidence > existing.confidence) {
        uniqueMap.set(candidate.publicAuthorId, candidate);
      }
    }

    return Array.from(uniqueMap.values()).sort(
      (a, b) => b.confidence - a.confidence,
    );
  }

  /**
   * 保存匹配候选
   */
  private async saveMatchCandidates(
    privateKolId: number,
    candidates: MatchCandidate[],
  ): Promise<void> {
    // 删除旧的候选记录
    await this.matchesRepository.delete({ private_kol_id: privateKolId });

    // 保存新的候选记录
    const matchRecords = candidates.map((candidate) => ({
      private_kol_id: privateKolId,
      public_author_id: candidate.publicAuthorId,
      match_confidence: candidate.confidence,
      match_method: candidate.method,
      match_details: candidate.details as Record<string, unknown>,
      public_snapshot: candidate.publicSnapshot as Record<string, unknown>,
      review_status: ReviewStatus.PENDING,
    }));

    await this.matchesRepository.save(matchRecords);
  }

  /**
   * 记录匹配操作日志
   */
  private async logMatchOperation(
    queryRunner: QueryRunner,
    privateKolId: number,
    publicAuthorId: string,
    operation: MatchOperation,
    userId: number,
    details?: any,
  ): Promise<void> {
    await queryRunner.manager.save(KolMatchLogs, {
      private_kol_id: privateKolId,
      public_author_id: publicAuthorId,
      operation,
      operation_details: details as Record<string, unknown>,
      created_by: userId,
    });
  }

  /**
   * 清除匹配缓存
   */
  private async clearMatchCache(privateKolId: number): Promise<void> {
    const pattern = `match:candidates:${privateKolId}`;
    // 简化实现，实际可能需要使用Redis的SCAN命令
    await this.cacheManager.del(pattern);
  }

  /**
   * 查询匹配结果
   */
  async queryMatches(query: QueryMatchesDto): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 20,
      matchStatus,
      reviewStatus,
      platform,
      accountName,
      minConfidence = 0.6,
    } = query;

    try {
      // 构建查询
      const queryBuilder = this.matchesRepository
        .createQueryBuilder('match')
        .leftJoinAndSelect('match.privateKol', 'privateKol')
        .leftJoinAndSelect('match.publicKol', 'publicKol');

      // 应用筛选条件
      if (matchStatus) {
        queryBuilder.andWhere('privateKol.match_status = :matchStatus', {
          matchStatus,
        });
      }

      if (reviewStatus) {
        queryBuilder.andWhere('match.review_status = :reviewStatus', {
          reviewStatus,
        });
      }

      if (platform) {
        queryBuilder.andWhere('privateKol.platform = :platform', {
          platform,
        });
      }

      if (accountName) {
        queryBuilder.andWhere(
          '(privateKol.account_name LIKE :accountName OR publicKol.account_name LIKE :accountName)',
          { accountName: `%${accountName}%` },
        );
      }

      if (minConfidence) {
        queryBuilder.andWhere('match.confidence >= :minConfidence', {
          minConfidence,
        });
      }

      // 排序
      queryBuilder.orderBy('match.created_at', 'DESC');

      // 分页
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // 执行查询
      const [items, total] = await queryBuilder.getManyAndCount();

      return new PaginatedResponse(items, page, limit, total);
    } catch (error: unknown) {
      this.logger.error('查询匹配结果失败', error);
      throw new Error('查询匹配结果失败');
    }
  }
}
