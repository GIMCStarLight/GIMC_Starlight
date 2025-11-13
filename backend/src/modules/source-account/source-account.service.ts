import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourceAccount } from '../../database/entities/source-account.entity';
import { PlatformType } from '../../common/enums/platform-type.enum';

@Injectable()
export class SourceAccountService {
  constructor(
    @InjectRepository(SourceAccount, 'postgres')
    private sourceAccountRepository: Repository<SourceAccount>,
  ) {}

  /**
   * 根据平台UID查找来源账户
   */
  async findByPlatformUid(
    sourcePlatform: PlatformType,
    platformUid: string,
    sourceType?: string,
  ): Promise<SourceAccount | null> {
    const query = this.sourceAccountRepository
      .createQueryBuilder('sa')
      .where('sa.source_platform = :sourcePlatform', { sourcePlatform })
      .andWhere('sa.platform_uid = :platformUid', { platformUid });

    if (sourceType) {
      query.andWhere('sa.source_type = :sourceType', { sourceType });
    }

    return query.getOne();
  }

  /**
   * 根据达人ID查找所有来源账户
   */
  async findByInfluencerId(influencerId: string): Promise<SourceAccount[]> {
    return this.sourceAccountRepository.find({
      where: { influencer_id: influencerId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 创建或更新来源账户映射
   */
  async createOrUpdate(data: {
    influencerId: string;
    sourceType: string;
    sourcePlatform: PlatformType;
    platformUid: string;
    extraInfo?: Record<string, any>;
  }): Promise<SourceAccount> {
    const existing = await this.findByPlatformUid(
      data.sourcePlatform,
      data.platformUid,
      data.sourceType,
    );

    if (existing) {
      // 更新现有记录
      existing.influencer_id = data.influencerId;
      existing.extra_info = data.extraInfo || existing.extra_info;
      existing.last_seen_at = new Date();
      return this.sourceAccountRepository.save(existing);
    } else {
      // 创建新记录
      const sourceAccount = this.sourceAccountRepository.create({
        influencer_id: data.influencerId,
        source_type: data.sourceType,
        source_platform: data.sourcePlatform,
        platform_uid: data.platformUid,
        extra_info: data.extraInfo,
        first_seen_at: new Date(),
        last_seen_at: new Date(),
      });
      return this.sourceAccountRepository.save(sourceAccount);
    }
  }

  /**
   * 根据星图ID查找达人ID
   */
  async findInfluencerIdByXingtuId(xingtuId: string): Promise<string | null> {
    const sourceAccount = await this.findByPlatformUid(
      PlatformType.DOUYIN,
      xingtuId,
      'data_platform',
    );
    return sourceAccount?.influencer_id || null;
  }
}
