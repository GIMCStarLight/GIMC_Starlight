import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SqlbotConfig } from './entities/sqlbot-config.entity';
import {
  CreateSqlbotConfigDto,
  UpdateSqlbotConfigDto,
  SqlbotConfigResponseDto,
} from './dto/sqlbot-config.dto';

import { createHash, createHmac } from 'crypto';

@Injectable()
export class SqlbotService {
  constructor(
    @InjectRepository(SqlbotConfig, 'postgres')
    private readonly sqlbotConfigRepository: Repository<SqlbotConfig>,
  ) {}

  /**
   * 创建SQLBot配置
   */
  async createConfig(
    createDto: CreateSqlbotConfigDto,
  ): Promise<SqlbotConfigResponseDto> {
    const config = this.sqlbotConfigRepository.create(createDto);
    const savedConfig = await this.sqlbotConfigRepository.save(config);
    return this.mapToResponseDto(savedConfig);
  }

  /**
   * 获取SQLBot配置
   */
  async getConfig(): Promise<SqlbotConfigResponseDto | null> {
    const config = await this.sqlbotConfigRepository.findOne({
      where: { enabled: true },
      order: { createdAt: 'DESC' },
    });

    if (!config) {
      return null;
    }

    return this.mapToResponseDto(config);
  }

  /**
   * 更新SQLBot配置
   */
  async updateConfig(
    id: string,
    updateDto: UpdateSqlbotConfigDto,
  ): Promise<SqlbotConfigResponseDto> {
    const config = await this.sqlbotConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('SQLBot配置不存在');
    }

    Object.assign(config, updateDto);
    const updatedConfig = await this.sqlbotConfigRepository.save(config);
    return this.mapToResponseDto(updatedConfig);
  }

  /**
   * 删除SQLBot配置
   */
  async deleteConfig(id: string): Promise<void> {
    const result = await this.sqlbotConfigRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('SQLBot配置不存在');
    }
  }

  /**
   * 获取数据源信息（用于SQLBot高级应用）
   */
  getDatasources(): any[] {
    // 根据SQLBot文档要求返回数据源信息
    const datasources = [
      {
        name: 'gimcstar-influencer-db',
        type: 'pg',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        dataBase: process.env.POSTGRES_DATABASE || 'gimcstar',
        user: process.env.POSTGRES_USERNAME || 'postgres',
        password: this.encryptPassword(
          process.env.POSTGRES_PASSWORD || 'password',
        ),
        schema: 'public',
        comment: 'GIMCStarLightSystem达人数据库',
        tables: [
          {
            name: 'influencer_current',
            comment: '当前达人数据表',
            fields: [
              {
                name: 'id',
                type: 'uuid',
                comment: '主键ID',
              },
              {
                name: 'star_id',
                type: 'varchar',
                comment: '达人唯一标识',
              },
              {
                name: 'nick_name',
                type: 'varchar',
                comment: '昵称',
              },
              {
                name: 'platform',
                type: 'varchar',
                comment: '平台类型',
              },
              {
                name: 'gender',
                type: 'varchar',
                comment: '性别',
              },
              {
                name: 'city',
                type: 'varchar',
                comment: '城市',
              },
              {
                name: 'province',
                type: 'varchar',
                comment: '省份',
              },
              {
                name: 'author_type',
                type: 'varchar',
                comment: '作者类型',
              },
              {
                name: 'account_status',
                type: 'varchar',
                comment: '账号状态',
              },
              {
                name: 'follower',
                type: 'bigint',
                comment: '粉丝数',
              },
              {
                name: 'avg_play_count',
                type: 'bigint',
                comment: '平均播放量',
              },
              {
                name: 'avg_like_count',
                type: 'bigint',
                comment: '平均点赞数',
              },
              {
                name: 'created_at',
                type: 'timestamp',
                comment: '创建时间',
              },
              {
                name: 'updated_at',
                type: 'timestamp',
                comment: '更新时间',
              },
            ],
          },
          {
            name: 'tags',
            comment: '标签表',
            fields: [
              {
                name: 'id',
                type: 'integer',
                comment: '标签ID',
              },
              {
                name: 'name',
                type: 'varchar',
                comment: '标签名称',
              },
              {
                name: 'parent_id',
                type: 'integer',
                comment: '父级标签ID',
              },
              {
                name: 'level',
                type: 'integer',
                comment: '标签层级',
              },
              {
                name: 'sort',
                type: 'integer',
                comment: '排序',
              },
            ],
          },
        ],
      },
    ];

    return datasources;
  }

  /**
   * AES加密密码（如果启用）
   */
  private encryptPassword(password: string): string {
    // 简单的加密处理，实际项目中应该使用更安全的加密方式
    return createHash('md5').update(password).digest('hex');
  }

  /**
   * 映射到响应DTO
   */
  private mapToResponseDto(config: SqlbotConfig): SqlbotConfigResponseDto {
    return {
      id: config.id,
      domain: config.domain,
      baseAssistantId: config.baseAssistantId,
      advancedAssistantId: config.advancedAssistantId,
      embeddedAppId: config.embeddedAppId,
      embeddedAppSecret: config.embeddedAppSecret,
      aesEnable: config.aesEnable,
      aesKey: config.aesKey,
      enabled: config.enabled,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * 生成用于SQLBot嵌入认证的JWT
   */
  async generateEmbeddedToken(account: string = 'admin'): Promise<{
    token: string;
    appId: string;
    expiresIn: number;
  }> {
    const config = await this.sqlbotConfigRepository.findOne({
      where: { enabled: true },
      order: { createdAt: 'DESC' },
    });

    if (!config || !config.embeddedAppId || !config.embeddedAppSecret) {
      throw new NotFoundException('未找到有效的SQLBot嵌入配置或缺少凭证');
    }

    const header = { alg: 'HS256', typ: 'JWT' } as const;
    const exp = Math.floor(Date.now() / 1000) + 60 * 60; // 1小时
    const payload = {
      appId: config.embeddedAppId,
      account: account || 'admin',
      exp,
    } as const;

    const encodedHeader = this.base64url(JSON.stringify(header));
    const encodedPayload = this.base64url(JSON.stringify(payload));
    const signature = createHmac('sha256', config.embeddedAppSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64');
    const encodedSignature = this.base64url(signature);
    const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

    return { token, appId: config.embeddedAppId, expiresIn: 3600 };
  }

  private base64url(input: string | Buffer): string {
    return Buffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
