import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { KolList } from '../../database/entities/kol-list.entity';
import {
  CreateKolListDto,
  UpdateKolListDto,
  QueryKolListDto,
  BatchCreateKolListDto,
} from './dto';
import { SqlErrorUtil } from '../../common/utils/sql-error.util';

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BatchCreateResult {
  successCount: number;
  failedCount: number;
  failedItems: Array<{
    index: number;
    data: CreateKolListDto;
    error: string;
  }>;
  createdItems: KolList[];
}

// 结构化数据库错误信息，避免对 any 的依赖
interface SqlLikeError {
  driverError?: SqlLikeError;
  code?: string | number;
  errno?: string | number;
  sqlMessage?: unknown;
  message?: unknown;
  sql?: unknown;
}

@Injectable()
export class KolListService {
  private readonly logger = new Logger(KolListService.name);

  constructor(
    @InjectRepository(KolList, 'postgres')
    private readonly kolRepository: Repository<KolList>,
  ) {}

  // 对入参进行轻量清洗/规范化，避免脏数据导致插入失败
  private sanitizeCreateDto(createDto: CreateKolListDto): CreateKolListDto {
    const dto: CreateKolListDto = { ...createDto };
    if (dto.home_link) {
      dto.home_link = String(dto.home_link)
        .trim()
        .replace(/^`+|`+$/g, '')
        .replace(/^"+|"+$/g, '')
        .replace(/\s+/g, '');
    }
    if (dto.followers_w !== undefined && dto.followers_w !== null) {
      const n = Number(dto.followers_w);
      if (!Number.isNaN(n)) {
        dto.followers_w = Number(n.toFixed(2));
      }
    }
    if (dto.platform) dto.platform = String(dto.platform).trim();
    if (dto.account_name) dto.account_name = String(dto.account_name).trim();
    if (dto.account_id) dto.account_id = String(dto.account_id).trim();
    if (dto.org_name) dto.org_name = String(dto.org_name).trim();
    if (dto.category) dto.category = String(dto.category).trim();
    if (dto.rebate_range) dto.rebate_range = String(dto.rebate_range).trim();
    if (dto.policy_level)
      dto.policy_level = String(dto.policy_level).trim().toUpperCase();
    if (dto.rebate_period) dto.rebate_period = String(dto.rebate_period).trim();
    if (dto.pay_period) dto.pay_period = String(dto.pay_period).trim();
    if (dto.remark) dto.remark = String(dto.remark).trim();
    return dto as CreateKolListDto;
  }

  private toSqlError(e: unknown): SqlLikeError {
    return typeof e === 'object' && e !== null ? (e as SqlLikeError) : {};
  }

  private errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  /**
   * 创建KOL
   */
  async create(createDto: CreateKolListDto): Promise<KolList> {
    try {
      const sanitized = this.sanitizeCreateDto(createDto);

      // 检查是否已存在相同平台和账号ID的记录
      const existing = await this.kolRepository.findOne({
        where: {
          platform: sanitized.platform,
          account_id: sanitized.account_id,
        },
      });

      if (existing) {
        throw new ConflictException(
          `平台 ${sanitized.platform} 上的账号 ${sanitized.account_id} 已存在`,
        );
      }

      const kol = this.kolRepository.create(sanitized);
      const savedKol = await this.kolRepository.save(kol);

      this.logger.log(
        `创建KOL成功: ${savedKol.account_name} (ID: ${savedKol.id})`,
      );
      return savedKol;
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }

      // 使用统一的SQL错误处理工具
      const errorMessage = SqlErrorUtil.formatErrorMessage(error);
      this.logger.error('创建KOL失败:', { error, data: createDto });
      throw new BadRequestException(`创建KOL失败: ${errorMessage}`);
    }
  }

  /**
   * 批量创建KOL
   */
  async batchCreate(
    batchCreateDto: BatchCreateKolListDto,
  ): Promise<BatchCreateResult> {
    const result: BatchCreateResult = {
      successCount: 0,
      failedCount: 0,
      failedItems: [],
      createdItems: [],
    };

    for (let i = 0; i < batchCreateDto.kols.length; i++) {
      const kolData = batchCreateDto.kols[i];
      try {
        const createdKol = await this.create(kolData);
        result.createdItems.push(createdKol);
        result.successCount++;
      } catch (error: unknown) {
        // 使用统一的SQL错误处理工具
        const errorMessage = SqlErrorUtil.formatErrorMessage(error);
        
        result.failedCount++;
        result.failedItems.push({
          index: i,
          data: kolData,
          error:
            errorMessage ||
            (error instanceof Error ? error.message : undefined) ||
            '创建KOL失败',
        });
        this.logger.warn(
          `批量创建第 ${i + 1} 个KOL失败: ${errorMessage || this.errMsg(error)}`,
        );
      }
    }

    this.logger.log(
      `批量创建完成: 成功 ${result.successCount} 个，失败 ${result.failedCount} 个`,
    );
    return result;
  }

  /**
   * 分页查询KOL
   */
  async findAll(queryDto: QueryKolListDto): Promise<PaginationResult<KolList>> {
    try {
      const {
        page = 1,
        limit = 10,
        sort_by = 'id',
        sort_order = 'DESC',
      } = queryDto;

      const queryBuilder = this.buildQueryBuilder(queryDto);

      // 添加排序
      queryBuilder.orderBy(`kol.${sort_by}`, sort_order);

      // 分页
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error: unknown) {
      // 空库或其他查询异常时，按空列表成功返回
      this.logger.warn('查询KOL列表异常，返回空列表:', this.errMsg(error));
      const { page = 1, limit = 10 } = queryDto;
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasNext: false,
        hasPrev: page > 1,
      };
    }
  }

  /**
   * 根据ID查询单个KOL
   */
  async findOne(id: number): Promise<KolList> {
    try {
      const kol = await this.kolRepository.findOne({ where: { id } });

      if (!kol) {
        throw new NotFoundException(`ID为 ${id} 的KOL不存在`);
      }

      return kol;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`查询KOL失败 (ID: ${id}):`, this.errMsg(error));
      throw new BadRequestException('查询KOL失败');
    }
  }

  /**
   * 更新KOL
   */
  async update(id: number, updateDto: UpdateKolListDto): Promise<KolList> {
    try {
      const kol = await this.findOne(id);

      // 如果更新了平台或账号ID，需要检查唯一性
      if (updateDto.platform || updateDto.account_id) {
        const platform = updateDto.platform || kol.platform;
        const account_id = updateDto.account_id || kol.account_id;

        const existing = await this.kolRepository.findOne({
          where: {
            platform,
            account_id,
          },
        });

        if (existing && existing.id !== id) {
          throw new ConflictException(
            `平台 ${platform} 上的账号 ${account_id} 已存在`,
          );
        }
      }

      Object.assign(kol, updateDto);
      const updatedKol = await this.kolRepository.save(kol);

      this.logger.log(
        `更新KOL成功: ${updatedKol.account_name} (ID: ${updatedKol.id})`,
      );
      return updatedKol;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`更新KOL失败 (ID: ${id}):`, this.errMsg(error));
      throw new BadRequestException('更新KOL失败');
    }
  }

  /**
   * 删除KOL
   */
  async remove(id: number): Promise<void> {
    try {
      const kol = await this.findOne(id);
      await this.kolRepository.remove(kol);
      this.logger.log(`删除KOL成功: ${kol.account_name} (ID: ${id})`);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`删除KOL失败 (ID: ${id}):`, this.errMsg(error));
      throw new BadRequestException('删除KOL失败');
    }
  }

  /**
   * 批量删除KOL
   */
  async removeBatch(
    ids: number[],
  ): Promise<{ deletedCount: number; failedIds: number[] }> {
    const result = {
      deletedCount: 0,
      failedIds: [] as number[],
    };

    for (const id of ids) {
      try {
        await this.remove(id);
        result.deletedCount++;
      } catch (error: unknown) {
        result.failedIds.push(id);
        this.logger.warn(`批量删除KOL失败 (ID: ${id}): ${this.errMsg(error)}`);
      }
    }

    this.logger.log(
      `批量删除完成: 成功 ${result.deletedCount} 个，失败 ${result.failedIds.length} 个`,
    );
    return result;
  }

  /**
   * 构建查询构建器
   */
  private buildQueryBuilder(
    queryDto: QueryKolListDto,
  ): SelectQueryBuilder<KolList> {
    const queryBuilder = this.kolRepository.createQueryBuilder('kol');

    // 平台筛选
    if (queryDto.platform) {
      queryBuilder.andWhere('kol.platform = :platform', {
        platform: queryDto.platform,
      });
    }

    // 账号名称搜索
    if (queryDto.account_name) {
      queryBuilder.andWhere('kol.account_name LIKE :account_name', {
        account_name: `%${queryDto.account_name}%`,
      });
    }

    // 账号ID搜索
    if (queryDto.account_id) {
      queryBuilder.andWhere('kol.account_id LIKE :account_id', {
        account_id: `%${queryDto.account_id}%`,
      });
    }

    // 机构名筛选
    if (queryDto.org_name) {
      queryBuilder.andWhere('kol.org_name LIKE :org_name', {
        org_name: `%${queryDto.org_name}%`,
      });
    }

    // 账号类型筛选
    if (queryDto.category) {
      queryBuilder.andWhere('kol.category = :category', {
        category: queryDto.category,
      });
    }

    // 粉丝量范围筛选
    if (queryDto.min_followers_w !== undefined) {
      queryBuilder.andWhere('kol.followers_w >= :min_followers_w', {
        min_followers_w: queryDto.min_followers_w,
      });
    }

    if (queryDto.max_followers_w !== undefined) {
      queryBuilder.andWhere('kol.followers_w <= :max_followers_w', {
        max_followers_w: queryDto.max_followers_w,
      });
    }

    // 是否独家筛选
    if (queryDto.is_exclusive !== undefined) {
      queryBuilder.andWhere('kol.is_exclusive = :is_exclusive', {
        is_exclusive: queryDto.is_exclusive,
      });
    }

    // 返点政策筛选
    if (queryDto.rebate_policy !== undefined) {
      queryBuilder.andWhere('kol.rebate_policy = :rebate_policy', {
        rebate_policy: queryDto.rebate_policy,
      });
    }

    // 政策等级筛选
    if (queryDto.policy_level) {
      queryBuilder.andWhere('kol.policy_level = :policy_level', {
        policy_level: queryDto.policy_level,
      });
    }

    // 匹配作者筛选（精确或列表）
    if (queryDto.matched_author_id) {
      queryBuilder.andWhere('kol.matched_author_id = :matched_author_id', {
        matched_author_id: queryDto.matched_author_id,
      });
    }

    if (
      queryDto.matched_author_ids &&
      Array.isArray(queryDto.matched_author_ids) &&
      queryDto.matched_author_ids.length > 0
    ) {
      queryBuilder.andWhere(
        'kol.matched_author_id IN (:...matched_author_ids)',
        { matched_author_ids: queryDto.matched_author_ids },
      );
    }

    // 匹配状态筛选
    if (queryDto.match_status) {
      queryBuilder.andWhere('kol.match_status = :match_status', {
        match_status: queryDto.match_status,
      });
    }

    // 仅展示已匹配达人
    if (queryDto.matched_only) {
      queryBuilder.andWhere(
        "kol.matched_author_id IS NOT NULL AND kol.matched_author_id <> ''",
      );
    }

    return queryBuilder;
  }

  /**
   * 获取平台列表（去重）
   */
  async getPlatforms(): Promise<string[]> {
    const rows = await this.kolRepository
      .createQueryBuilder('kol')
      .select('kol.platform', 'platform')
      .where('kol.platform IS NOT NULL')
      .andWhere("kol.platform <> ''")
      .distinct(true)
      .orderBy('kol.platform', 'ASC')
      .getRawMany<{ platform: string }>();
    return rows.map((r) => r.platform);
  }

  /**
   * 获取分类列表（去重）
   */
  async getCategories(): Promise<string[]> {
    const rows = await this.kolRepository
      .createQueryBuilder('kol')
      .select('kol.category', 'category')
      .where('kol.category IS NOT NULL')
      .andWhere("kol.category <> ''")
      .distinct(true)
      .orderBy('kol.category', 'ASC')
      .getRawMany<{ category: string }>();
    return rows.map((r) => r.category);
  }

  /**
   * 获取机构列表（去重）
   */
  async getOrganizations(): Promise<string[]> {
    const rows = await this.kolRepository
      .createQueryBuilder('kol')
      .select('kol.org_name', 'org_name')
      .where('kol.org_name IS NOT NULL')
      .andWhere("kol.org_name <> ''")
      .distinct(true)
      .orderBy('kol.org_name', 'ASC')
      .getRawMany<{ org_name: string }>();
    return rows.map((r) => r.org_name);
  }
}
