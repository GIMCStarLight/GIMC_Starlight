import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StarmediaInfluencer } from '../../../database/entities/starmedia-influencer.entity';

@Injectable()
export class StarmediaInfluencerService {
  constructor(
    @InjectRepository(StarmediaInfluencer, 'crawler')
    private readonly starmediaRepository: Repository<StarmediaInfluencer>,
  ) {}

  async findAll(page = 1, limit = 20) {
    // 使用 QueryBuilder 来确保使用正确的数据库列名
    const queryBuilder = this.starmediaRepository.createQueryBuilder('starmedia');
    
    const [data, total] = await queryBuilder
      .orderBy('starmedia.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    return await this.starmediaRepository.findOne({ where: { id } });
  }

  async update(id: number, updateData: Partial<StarmediaInfluencer>) {
    // 数据校验
    if (updateData.nickname !== undefined && !updateData.nickname?.trim()) {
      throw new Error('昵称不能为空');
    }

    if (updateData.totalFans !== undefined && updateData.totalFans < 0) {
      throw new Error('粉丝量不能为负数');
    }

    if (updateData.contractRebateRate !== undefined && 
        (updateData.contractRebateRate < 0 || updateData.contractRebateRate > 100)) {
      throw new Error('签约返点必须在0-100之间');
    }

    await this.starmediaRepository.update(id, updateData);
    return await this.findOne(id);
  }

  async delete(id: number) {
    const result = await this.starmediaRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
