import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository, ObjectLiteral } from 'typeorm';

/**
 * 双写服务基类
 * 用于MySQL到PostgreSQL迁移期间的数据双写
 * 
 * 使用方法：
 * 1. 在具体服务中继承此类
 * 2. 调用enableDualWrite()启用双写
 * 3. 使用dualWriteCreate/dualWriteUpdate等方法进行双写操作
 */
@Injectable()
export abstract class DualWriteService<T extends ObjectLiteral> {
  protected readonly logger: Logger;
  private dualWriteEnabled: boolean = false;

  constructor(
    protected readonly mysqlRepo: Repository<T>,
    protected readonly postgresRepo: Repository<T>,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
    
    // 从环境变量读取双写开关
    this.dualWriteEnabled = process.env.ENABLE_DUAL_WRITE === 'true';
    
    if (this.dualWriteEnabled) {
      this.logger.log('双写模式已启用');
    }
  }

  /**
   * 启用双写
   */
  enableDualWrite(): void {
    this.dualWriteEnabled = true;
    this.logger.log('双写模式已手动启用');
  }

  /**
   * 禁用双写
   */
  disableDualWrite(): void {
    this.dualWriteEnabled = false;
    this.logger.log('双写模式已禁用');
  }

  /**
   * 检查双写是否启用
   */
  isDualWriteEnabled(): boolean {
    return this.dualWriteEnabled;
  }

  /**
   * 双写创建
   * @param data 要创建的数据
   * @param transform 数据转换函数（可选）
   * @returns 创建的实体
   */
  protected async dualWriteCreate(
    data: Partial<T>,
    transform?: (entity: T) => any,
  ): Promise<T> {
    // 1. 写入MySQL（主库）
    const mysqlEntity = await this.mysqlRepo.save(data as any);

    // 2. 异步写入PostgreSQL（从库）
    if (this.dualWriteEnabled) {
      this.syncToPostgres('create', mysqlEntity, transform).catch(error => {
        this.logger.error(`PostgreSQL同步失败: ${error.message}`, error.stack);
      });
    }

    return mysqlEntity;
  }

  /**
   * 双写更新
   * @param id 实体ID
   * @param data 更新数据
   * @param transform 数据转换函数（可选）
   */
  protected async dualWriteUpdate(
    id: number | string,
    data: Partial<T>,
    transform?: (entity: Partial<T>) => any,
  ): Promise<void> {
    // 1. 更新MySQL（主库）
    await this.mysqlRepo.update(id, data as any);

    // 2. 异步更新PostgreSQL（从库）
    if (this.dualWriteEnabled) {
      const updateData = transform ? transform(data) : data;
      
      this.postgresRepo
        .update(id, updateData as any)
        .catch(error => {
          this.logger.error(`PostgreSQL更新同步失败 (ID: ${id}): ${error.message}`);
        });
    }
  }

  /**
   * 双写删除
   * @param id 实体ID
   */
  protected async dualWriteDelete(id: number | string): Promise<void> {
    // 1. 删除MySQL（主库）
    await this.mysqlRepo.delete(id);

    // 2. 异步删除PostgreSQL（从库）
    if (this.dualWriteEnabled) {
      this.postgresRepo
        .delete(id)
        .catch(error => {
          this.logger.error(`PostgreSQL删除同步失败 (ID: ${id}): ${error.message}`);
        });
    }
  }

  /**
   * 批量双写创建
   * @param dataArray 要创建的数据数组
   * @param transform 数据转换函数（可选）
   */
  protected async dualWriteBatchCreate(
    dataArray: Partial<T>[],
    transform?: (entity: T) => any,
  ): Promise<T[]> {
    // 1. 批量写入MySQL
    const mysqlEntities = await this.mysqlRepo.save(dataArray as any);

    // 2. 异步批量写入PostgreSQL
    if (this.dualWriteEnabled) {
      const pgData = transform 
        ? mysqlEntities.map(transform)
        : mysqlEntities;

      this.postgresRepo
        .save(pgData)
        .catch(error => {
          this.logger.error(`PostgreSQL批量同步失败: ${error.message}`);
        });
    }

    return mysqlEntities;
  }

  /**
   * 同步数据到PostgreSQL
   * @param operation 操作类型
   * @param data 数据
   * @param transform 转换函数
   */
  private async syncToPostgres(
    operation: 'create' | 'update' | 'delete',
    data: T | Partial<T>,
    transform?: (entity: any) => any,
  ): Promise<void> {
    try {
      const pgData = transform ? transform(data) : data;

      switch (operation) {
        case 'create':
          await this.postgresRepo.save(pgData as any);
          this.logger.debug(`PostgreSQL创建成功`);
          break;
        case 'update':
          await this.postgresRepo.save(pgData as any);
          this.logger.debug(`PostgreSQL更新成功`);
          break;
        case 'delete':
          await this.postgresRepo.remove(pgData as any);
          this.logger.debug(`PostgreSQL删除成功`);
          break;
      }
    } catch (error) {
      this.logger.error(
        `PostgreSQL同步失败 [${operation}]: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * 数据一致性校验
   * @param id 实体ID
   * @returns 是否一致
   */
  protected async verifyConsistency(id: number | string): Promise<boolean> {
    if (!this.dualWriteEnabled) {
      return true;
    }

    try {
      const mysqlEntity = await this.mysqlRepo.findOne({ where: { id } as any });
      const postgresEntity = await this.postgresRepo.findOne({ where: { id } as any });

      if (!mysqlEntity && !postgresEntity) {
        return true; // 两边都不存在
      }

      if (!mysqlEntity || !postgresEntity) {
        this.logger.warn(`数据不一致 (ID: ${id}): 一侧数据缺失`);
        return false;
      }

      // 简单比较（可根据需要自定义）
      const mysqlJson = JSON.stringify(mysqlEntity);
      const postgresJson = JSON.stringify(postgresEntity);

      if (mysqlJson !== postgresJson) {
        this.logger.warn(`数据不一致 (ID: ${id})`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`一致性校验失败 (ID: ${id}): ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * 手动同步单条数据到PostgreSQL
   * @param id 实体ID
   */
  protected async manualSyncToPostgres(id: number | string): Promise<void> {
    const mysqlEntity = await this.mysqlRepo.findOne({ where: { id } as any });
    
    if (!mysqlEntity) {
      throw new Error(`MySQL中未找到ID为${id}的记录`);
    }

    await this.postgresRepo.save(mysqlEntity);
    this.logger.log(`手动同步成功 (ID: ${id})`);
  }
}
