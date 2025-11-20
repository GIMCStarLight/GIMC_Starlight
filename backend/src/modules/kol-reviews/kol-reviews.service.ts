import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { KolReviews, KolReviewStatus } from '../../database/entities/kol-reviews.entity';
import { AuthorCoreView } from '../../database/entities/author-core-view.entity';
import { DATABASE_CONNECTIONS } from '../../config/database.config';
import { QueryKolReviewsDto, CreateKolReviewDto, UpdateKolReviewDto } from './dto';

@Injectable()
export class KolReviewsService {
  constructor(
    @InjectRepository(KolReviews, 'postgres')
    private readonly kolReviewsRepository: Repository<KolReviews>,
    @InjectRepository(AuthorCoreView, DATABASE_CONNECTIONS.CRAWLER)
    private readonly authorCoreRepo: Repository<AuthorCoreView>,
  ) {}

  // 查询评论列表，支持分页、筛选、排序
  async findAll(query: QueryKolReviewsDto): Promise<any> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = query;

    // 构建查询条件
    const queryBuilder = this.kolReviewsRepository
      .createQueryBuilder('review')
      .where('review.is_deleted = :isDeleted', { isDeleted: false });

    // 筛选条件
    if (query.authorId) {
      queryBuilder.andWhere('review.author_id = :authorId', { authorId: query.authorId });
    }

    if (query.reviewer) {
      queryBuilder.andWhere('review.reviewer LIKE :reviewer', {
        reviewer: `%${query.reviewer}%`,
      });
    }

    if (query.minScore) {
      queryBuilder.andWhere('review.score >= :minScore', { minScore: query.minScore });
    }

    if (query.maxScore) {
      queryBuilder.andWhere('review.score <= :maxScore', { maxScore: query.maxScore });
    }

    if (query.startDate) {
      queryBuilder.andWhere('review.created_at >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('review.created_at <= :endDate', {
        endDate: query.endDate,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('review.status = :status', { status: query.status });
    }

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // 排序
    const orderField = this.mapSortField(sortBy);
    queryBuilder.orderBy(orderField, sortOrder);

    // 执行查询
    const [reviews, total] = await queryBuilder.getManyAndCount();

    // 获取所有唯一的author_id
    const authorIds = [...new Set(reviews.map(r => r.authorId).filter(Boolean))];

    // 批量查询达人信息
    let influencersMap = new Map();
    if (authorIds.length > 0) {
      const influencers = await this.authorCoreRepo
        .createQueryBuilder('author')
        .where('author.author_id IN (:...authorIds)', { authorIds })
        .getMany();
      
      influencers.forEach(inf => {
        influencersMap.set(inf.author_id, inf);
      });
    }

    // 组合数据
    const data = reviews.map(review => {
      const influencer = influencersMap.get(review.authorId);
      return {
        id: review.id,
        authorId: review.authorId,
        reviewer: review.reviewer,
        score: review.score,
        content: review.content,
        reviewType: review.reviewType,
        reviewTags: review.reviewTags,
        status: review.status,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        influencerAuthorId: influencer?.author_id || null,
        influencerNickName: influencer?.nick_name || null,
        influencerAvatarUri: influencer?.avatar_uri || null,
        influencerAuthorType: influencer?.author_type || null,
        influencerFollower: influencer?.follower || null,
        influencerGrade: influencer?.grade || null,
        influencerGender: influencer?.gender || null,
        influencerCity: influencer?.city || null,
        influencerProvince: influencer?.province || null,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 映射排序字段
  private mapSortField(sortBy: string): string {
    const fieldMap = {
      created_at: 'review.created_at',
      updated_at: 'review.updated_at',
      score: 'review.score',
      reviewer: 'review.reviewer',
    };
    return fieldMap[sortBy as keyof typeof fieldMap] || 'review.created_at';
  }

  // 获取统计数据
  async getStatistics(): Promise<any> {
    const [totalReviews, avgScore, scoreDistribution] = await Promise.all([
      this.kolReviewsRepository.count({ where: { isDeleted: false } }),
      this.kolReviewsRepository
        .createQueryBuilder('review')
        .select('AVG(review.score)', 'average')
        .where('review.is_deleted = :isDeleted', { isDeleted: false })
        .getRawOne(),
      this.kolReviewsRepository
        .createQueryBuilder('review')
        .select('review.score', 'score')
        .addSelect('COUNT(*)', 'count')
        .where('review.is_deleted = :isDeleted', { isDeleted: false })
        .groupBy('review.score')
        .orderBy('review.score', 'ASC')
        .getRawMany(),
    ]);

    // 获取总达人数
    const uniqueAuthors = await this.kolReviewsRepository
      .createQueryBuilder('review')
      .select('COUNT(DISTINCT review.author_id)', 'count')
      .where('review.is_deleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    // 获取今日新增
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayReviews = await this.kolReviewsRepository
      .createQueryBuilder('review')
      .where('review.created_at >= :today', { today })
      .andWhere('review.is_deleted = :isDeleted', { isDeleted: false })
      .getCount();

    return {
      totalReviews,
      totalInfluencers: parseInt(uniqueAuthors.count),
      averageScore: parseFloat(avgScore.average).toFixed(1),
      todayReviews,
      scoreDistribution: scoreDistribution.map((item) => ({
        score: item.score,
        count: parseInt(item.count),
      })),
    };
  }

  // 创建评论
  async create(dto: CreateKolReviewDto): Promise<KolReviews> {
    // 检查是否已存在相同的评价（同一评价人对同一达人）
    const existing = await this.kolReviewsRepository.findOne({
      where: {
        authorId: dto.authorId,
        reviewer: dto.reviewer,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new BadRequestException('您已经评价过该达人，请勿重复评价');
    }

    const review = this.kolReviewsRepository.create({
      ...dto,
      status: KolReviewStatus.PENDING, // 默认为待审核状态
    });
    return this.kolReviewsRepository.save(review);
  }

  // 根据ID查询评论
  async findOne(id: number): Promise<KolReviews> {
    const review = await this.kolReviewsRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    return review;
  }

  // 更新评论
  async update(id: number, dto: UpdateKolReviewDto): Promise<KolReviews> {
    const review = await this.findOne(id);

    Object.assign(review, dto);
    return this.kolReviewsRepository.save(review);
  }

  // 根据authorId查询评论
  async findByAuthorId(authorId: string): Promise<KolReviews[]> {
    return this.kolReviewsRepository.find({
      where: { authorId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  // 删除评论（软删除）
  async remove(id: number, deletedBy?: string): Promise<void> {
    const review = await this.findOne(id);

    review.isDeleted = true;
    review.deletedAt = new Date();
    review.deletedBy = deletedBy || 'system';

    await this.kolReviewsRepository.save(review);
  }

  // 审核评价
  async audit(id: number, status: 'approved' | 'rejected', auditor: string, comment?: string): Promise<any> {
    const review = await this.findOne(id);
    
    if (review.status !== KolReviewStatus.PENDING) {
      throw new BadRequestException(`评价已${review.status === KolReviewStatus.APPROVED ? '通过' : '拒绝'}审核，无法重复审核`);
    }

    review.status = status === 'approved' ? KolReviewStatus.APPROVED : KolReviewStatus.REJECTED;
    review.auditor = auditor;
    review.auditTime = new Date();
    review.auditComment = comment;

    return this.kolReviewsRepository.save(review);
  }

  // 批量删除
  async batchRemove(ids: number[], deletedBy?: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await this.remove(id, deletedBy);
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }

  // 批量审核
  async batchAudit(
    ids: number[], 
    status: 'approved' | 'rejected', 
    auditor: string, 
    comment?: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await this.audit(id, status, auditor, comment);
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }
}
