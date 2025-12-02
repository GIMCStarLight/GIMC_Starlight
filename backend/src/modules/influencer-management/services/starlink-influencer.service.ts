import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StarlinkInfluencer } from '../../../database/entities/starlink-influencer.entity';

@Injectable()
export class StarlinkInfluencerService {
  constructor(
    @InjectRepository(StarlinkInfluencer, 'crawler')
    private readonly starlinkRepository: Repository<StarlinkInfluencer>,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.starlinkRepository.findAndCount({
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    return await this.starlinkRepository.findOne({ where: { id } });
  }

  async update(id: number, updateData: Partial<StarlinkInfluencer>) {
    // 数据校验
    if (updateData.nickname !== undefined && !updateData.nickname?.trim()) {
      throw new Error('昵称不能为空');
    }

    if (updateData.fansCount !== undefined && updateData.fansCount < 0) {
      throw new Error('粉丝量不能为负数');
    }

    if (updateData.minRebateRate !== undefined && 
        (updateData.minRebateRate < 0 || updateData.minRebateRate > 100)) {
      throw new Error('返点比例必须在0-100之间');
    }

    if (updateData.maxRebateRate !== undefined && 
        (updateData.maxRebateRate < 0 || updateData.maxRebateRate > 100)) {
      throw new Error('返点比例必须在0-100之间');
    }

    await this.starlinkRepository.update(id, updateData);
    return await this.findOne(id);
  }

  async delete(id: number) {
    const result = await this.starlinkRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
