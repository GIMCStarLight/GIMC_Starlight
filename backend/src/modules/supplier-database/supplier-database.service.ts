import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as XLSX from 'xlsx';
import { SupplierDatabase } from '../../database/entities/supplier-database.entity';
import {
  CreateSupplierDatabaseDto,
  UpdateSupplierDatabaseDto,
  QuerySupplierDatabaseDto,
  BatchCreateSupplierDatabaseDto,
} from './dto';

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
    data: CreateSupplierDatabaseDto;
    error: string;
  }>;
  createdItems: SupplierDatabase[];
}

@Injectable()
export class SupplierDatabaseService {
  private readonly logger = new Logger(SupplierDatabaseService.name);

  constructor(
    @InjectRepository(SupplierDatabase, 'postgres')
    private readonly supplierRepository: Repository<SupplierDatabase>,
  ) {}

  // 对入参进行轻量清洗/规范化，避免脏数据导致插入失败
  private sanitizeCreateDto(
    createDto: CreateSupplierDatabaseDto,
  ): CreateSupplierDatabaseDto {
    const dto: any = { ...createDto };

    // 字符串字段清洗
    if (dto.supplier_full_name)
      dto.supplier_full_name = String(dto.supplier_full_name).trim();
    if (dto.mcn_name) dto.mcn_name = String(dto.mcn_name).trim();

    return dto as CreateSupplierDatabaseDto;
  }

  /**
   * 创建供应商
   */
  async create(
    createDto: CreateSupplierDatabaseDto,
  ): Promise<SupplierDatabase> {
    try {
      const sanitized = this.sanitizeCreateDto(createDto);

      // 检查是否已存在相同供应商全称的记录
      const existing = await this.supplierRepository.findOne({
        where: {
          supplier_full_name: sanitized.supplier_full_name,
        },
      });

      if (existing) {
        throw new ConflictException(
          `供应商 ${sanitized.supplier_full_name} 已存在`,
        );
      }

      const supplier = this.supplierRepository.create(sanitized);
      const savedSupplier = await this.supplierRepository.save(supplier);

      this.logger.log(
        `创建供应商成功: ${savedSupplier.supplier_full_name} (ID: ${savedSupplier.id})`,
      );
      return savedSupplier;
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const driverErr = error?.driverError || error;
      const code = driverErr?.code ?? driverErr?.errno;
      const sqlMessage =
        driverErr?.sqlMessage ?? driverErr?.message ?? String(driverErr);
      const sql = driverErr?.sql;

      // 尝试从报错信息提取列名，帮助定位具体字段
      let columnHint = '';
      const tooLongMatch = /Data too long for column '(.*?)'/i.exec(sqlMessage);
      const nullMatch = /Column '(.*?)' cannot be null/i.exec(sqlMessage);
      const dupMatch = /Duplicate entry .* for key '(.*?)'/i.exec(sqlMessage);
      if (tooLongMatch) columnHint = `字段超长: ${tooLongMatch[1]}`;
      else if (nullMatch) columnHint = `字段为空: ${nullMatch[1]}`;
      else if (dupMatch) columnHint = `唯一约束冲突: ${dupMatch[1]}`;

      this.logger.error('创建供应商失败: ', {
        code,
        sqlMessage,
        sql,
        data: createDto,
      });
      const detail = [
        code ? `MySQL代码=${code}` : '',
        sqlMessage ? `原因=${sqlMessage}` : '',
        columnHint ? `定位=${columnHint}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
      throw new BadRequestException(`创建供应商失败: ${detail}`);
    }
  }

  /**
   * 批量创建供应商
   */
  async batchCreate(
    batchCreateDto: BatchCreateSupplierDatabaseDto,
  ): Promise<BatchCreateResult> {
    const result: BatchCreateResult = {
      successCount: 0,
      failedCount: 0,
      failedItems: [],
      createdItems: [],
    };

    for (let i = 0; i < batchCreateDto.suppliers.length; i++) {
      const supplierData = batchCreateDto.suppliers[i];
      try {
        const createdSupplier = await this.create(supplierData);
        result.createdItems.push(createdSupplier);
        result.successCount++;
      } catch (error: any) {
        const driverErr = error?.driverError || error;
        const code = driverErr?.code ?? driverErr?.errno;
        const sqlMessage =
          driverErr?.sqlMessage ?? driverErr?.message ?? String(driverErr);
        const tooLongMatch = /Data too long for column '(.*?)'/i.exec(
          sqlMessage,
        );
        const nullMatch = /Column '(.*?)' cannot be null/i.exec(sqlMessage);
        const dupMatch = /Duplicate entry .* for key '(.*?)'/i.exec(sqlMessage);
        let columnHint = '';
        if (tooLongMatch) columnHint = `字段超长: ${tooLongMatch[1]}`;
        else if (nullMatch) columnHint = `字段为空: ${nullMatch[1]}`;
        else if (dupMatch) columnHint = `唯一约束冲突: ${dupMatch[1]}`;
        const detail = [
          code ? `MySQL代码=${code}` : '',
          sqlMessage ? `原因=${sqlMessage}` : '',
          columnHint ? `定位=${columnHint}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        result.failedCount++;
        result.failedItems.push({
          index: i,
          data: supplierData,
          error: detail || error?.message || '创建供应商失败',
        });
        this.logger.warn(
          `批量创建第 ${i + 1} 个供应商失败: ${detail || error?.message || error}`,
        );
      }
    }

    this.logger.log(
      `批量创建完成: 成功 ${result.successCount} 个，失败 ${result.failedCount} 个`,
    );
    return result;
  }

  /**
   * 分页查询供应商
   */
  async findAll(
    queryDto: QuerySupplierDatabaseDto,
  ): Promise<PaginationResult<SupplierDatabase>> {
    try {
      const {
        page = 1,
        limit = 10,
        sort_by = 'id',
        sort_order = 'DESC',
      } = queryDto;

      const queryBuilder = this.buildQueryBuilder(queryDto);

      // 添加排序
      queryBuilder.orderBy(`supplier.${sort_by}`, sort_order);

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
    } catch (error) {
      // 空库或其他查询异常时，按空列表成功返回
      this.logger.warn('查询供应商列表异常，返回空列表:', error);
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
   * 根据ID查询单个供应商
   */
  async findOne(id: number): Promise<SupplierDatabase> {
    try {
      const supplier = await this.supplierRepository.findOne({ where: { id } });

      if (!supplier) {
        throw new NotFoundException(`ID为 ${id} 的供应商不存在`);
      }

      return supplier;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`查询供应商失败 (ID: ${id}):`, error);
      throw new BadRequestException('查询供应商失败');
    }
  }

  /**
   * 更新供应商
   */
  async update(
    id: number,
    updateDto: UpdateSupplierDatabaseDto,
  ): Promise<SupplierDatabase> {
    try {
      const supplier = await this.findOne(id);

      // 如果更新了供应商全称，需要检查唯一性
      if (updateDto.supplier_full_name) {
        const existing = await this.supplierRepository.findOne({
          where: {
            supplier_full_name: updateDto.supplier_full_name,
          },
        });

        if (existing && existing.id !== id) {
          throw new ConflictException(
            `供应商 ${updateDto.supplier_full_name} 已存在`,
          );
        }
      }

      Object.assign(supplier, updateDto);
      const updatedSupplier = await this.supplierRepository.save(supplier);

      this.logger.log(
        `更新供应商成功: ${updatedSupplier.supplier_full_name} (ID: ${updatedSupplier.id})`,
      );
      return updatedSupplier;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`更新供应商失败 (ID: ${id}):`, error);
      throw new BadRequestException('更新供应商失败');
    }
  }

  /**
   * 删除供应商
   */
  async remove(id: number): Promise<void> {
    try {
      const supplier = await this.findOne(id);
      await this.supplierRepository.remove(supplier);
      this.logger.log(
        `删除供应商成功: ${supplier.supplier_full_name} (ID: ${id})`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`删除供应商失败 (ID: ${id}):`, error);
      throw new BadRequestException('删除供应商失败');
    }
  }

  /**
   * 批量删除供应商
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
      } catch (error) {
        result.failedIds.push(id);
        this.logger.warn(`批量删除供应商失败 (ID: ${id}): ${error.message}`);
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
    queryDto: QuerySupplierDatabaseDto,
  ): SelectQueryBuilder<SupplierDatabase> {
    const queryBuilder = this.supplierRepository.createQueryBuilder('supplier');

    // 通用搜索（供应商名称或机构名）
    if (queryDto.search) {
      queryBuilder.andWhere(
        '(supplier.supplier_full_name LIKE :search OR supplier.agency_name LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    // 供应商全称搜索
    if (queryDto.supplier_full_name) {
      queryBuilder.andWhere(
        'supplier.supplier_full_name LIKE :supplier_full_name',
        {
          supplier_full_name: `%${queryDto.supplier_full_name}%`,
        },
      );
    }

    // 供应商性质筛选（使用supplier_type字段）
    if (queryDto.supplier_type) {
      queryBuilder.andWhere('supplier.supplier_type = :supplier_type', {
        supplier_type: queryDto.supplier_type,
      });
    }

    // 资源类型筛选（模糊匹配）
    if (queryDto.resource_type) {
      queryBuilder.andWhere('supplier.resource_type LIKE :resource_type', {
        resource_type: `%${queryDto.resource_type}%`,
      });
    }

    // 合同状态筛选（模糊匹配）
    if (queryDto.contract_status) {
      queryBuilder.andWhere('supplier.contract_status LIKE :contract_status', {
        contract_status: `%${queryDto.contract_status}%`,
      });
    }

    // 是否代下单筛选
    if (queryDto.is_proxy_order !== undefined) {
      queryBuilder.andWhere('supplier.is_proxy_order = :is_proxy_order', {
        is_proxy_order: queryDto.is_proxy_order,
      });
    }

    // 当前政策梯度筛选
    if (queryDto.current_policy_gradient) {
      queryBuilder.andWhere(
        'supplier.current_policy_gradient = :current_policy_gradient',
        {
          current_policy_gradient: queryDto.current_policy_gradient,
        },
      );
    }

    // 24年全年累量金额范围筛选
    if (queryDto.min_total_amount_24 !== undefined) {
      queryBuilder.andWhere(
        'supplier.total_amount_24 >= :min_total_amount_24',
        {
          min_total_amount_24: queryDto.min_total_amount_24,
        },
      );
    }

    if (queryDto.max_total_amount_24 !== undefined) {
      queryBuilder.andWhere(
        'supplier.total_amount_24 <= :max_total_amount_24',
        {
          max_total_amount_24: queryDto.max_total_amount_24,
        },
      );
    }

    // 25年全年累量金额范围筛选
    if (queryDto.min_total_amount_25 !== undefined) {
      queryBuilder.andWhere(
        'supplier.total_amount_25 >= :min_total_amount_25',
        {
          min_total_amount_25: queryDto.min_total_amount_25,
        },
      );
    }

    if (queryDto.max_total_amount_25 !== undefined) {
      queryBuilder.andWhere(
        'supplier.total_amount_25 <= :max_total_amount_25',
        {
          max_total_amount_25: queryDto.max_total_amount_25,
        },
      );
    }

    // 一级对接人姓名搜索
    if (queryDto.primary_contact_name) {
      queryBuilder.andWhere(
        'supplier.primary_contact_name LIKE :primary_contact_name',
        {
          primary_contact_name: `%${queryDto.primary_contact_name}%`,
        },
      );
    }

    // 年框合同跟进人搜索
    if (queryDto.contract_follow_up_person) {
      queryBuilder.andWhere(
        'supplier.contract_follow_up_person LIKE :contract_follow_up_person',
        {
          contract_follow_up_person: `%${queryDto.contract_follow_up_person}%`,
        },
      );
    }

    // 合同时间范围筛选
    if (queryDto.contract_start_from) {
      queryBuilder.andWhere('supplier.contract_start >= :contract_start_from', {
        contract_start_from: queryDto.contract_start_from,
      });
    }

    if (queryDto.contract_start_to) {
      queryBuilder.andWhere('supplier.contract_start <= :contract_start_to', {
        contract_start_to: queryDto.contract_start_to,
      });
    }

    if (queryDto.contract_end_from) {
      queryBuilder.andWhere('supplier.contract_end >= :contract_end_from', {
        contract_end_from: queryDto.contract_end_from,
      });
    }

    if (queryDto.contract_end_to) {
      queryBuilder.andWhere('supplier.contract_end <= :contract_end_to', {
        contract_end_to: queryDto.contract_end_to,
      });
    }

    // 可合作平台筛选
    const platformFields = [
      'can_cooperate_douyin',
      'can_cooperate_xiaohongshu',
      'can_cooperate_wechat_mp',
      'can_cooperate_wechat_video',
      'can_cooperate_weibo',
      'can_cooperate_bilibili',
      'can_cooperate_zhihu',
      'can_cooperate_kuaishou',
      'can_cooperate_dongchedi',
    ];

    platformFields.forEach((field) => {
      if ((queryDto as any)[field] !== undefined) {
        queryBuilder.andWhere(`supplier.${field} = :${field}`, {
          [field]: (queryDto as any)[field],
        });
      }
    });

    return queryBuilder;
  }

  /**
   * 生成供应商导入模板Excel文件
   */
  async generateImportTemplate(): Promise<Buffer> {
    this.logger.log('生成供应商导入模板');

    // 定义字段映射：数据库字段名 -> 中文字段名
    const fieldMapping = {
      supplier_full_name: '供应商全称',
      agency_name: '代理商名称',
      supplier_type: '供应商类型',
      supplier_nature: '供应商性质',
      current_policy_gradient: '当前政策梯度',
      current_policy_details: '当前政策详情',
      financial_settlement_method: '财务结算方式',
      financial_settlement_cycle: '财务结算周期',
      policy_gradient_24: '2024年政策梯度',
      policy_details_24: '2024年政策详情',
      total_amount_24: '2024年累量金额',
      cooperation_status_24: '2024年合作状态',
      policy_gradient_25: '2025年政策梯度',
      policy_details_25: '2025年政策详情',
      total_amount_25: '2025年累量金额',
      cooperation_status_25: '2025年合作状态',
      primary_contact_name: '一级对接人姓名',
      primary_contact_phone: '一级对接人电话',
      primary_contact_wechat: '一级对接人微信',
      secondary_contact_name: '二级对接人姓名',
      secondary_contact_phone: '二级对接人电话',
      secondary_contact_wechat: '二级对接人微信',
      is_agent_order: '是否代下单',
      is_dual_signed: '是否双盖合同',
      contract_follow_up_person: '合同跟进人',
      contract_start_date: '合同开始时间',
      contract_end_date: '合同结束时间',
      contract_status: '合同状态',
      resource_type: '资源类型',
      resource_details: '资源详情',
      can_cooperate_douyin: '可合作抖音',
      can_cooperate_xiaohongshu: '可合作小红书',
      can_cooperate_wechat_mp: '可合作微信公众号',
      can_cooperate_wechat_video: '可合作微信视频号',
      can_cooperate_weibo: '可合作微博',
      can_cooperate_bilibili: '可合作B站',
      can_cooperate_zhihu: '可合作知乎',
      can_cooperate_kuaishou: '可合作快手',
      can_cooperate_dongchedi: '可合作懂车帝',
      can_cooperate_other: '可合作其他平台',
      supplier_intro: '供应商介绍',
    };

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 创建表头数据
    const headers = Object.values(fieldMapping);
    const worksheetData = [headers];

    // 添加示例数据行
    const exampleRow = [
      '示例供应商有限公司', // 供应商全称
      '示例代理商', // 代理商名称
      'MCN', // 供应商类型
      '企业', // 供应商性质
      'A级', // 当前政策梯度
      '优质合作伙伴政策', // 当前政策详情
      '月结', // 财务结算方式
      '30天', // 财务结算周期
      'A级', // 2024年政策梯度
      '2024年优质合作政策', // 2024年政策详情
      '1000000', // 2024年累量金额
      '正常合作', // 2024年合作状态
      'S级', // 2025年政策梯度
      '2025年战略合作政策', // 2025年政策详情
      '2000000', // 2025年累量金额
      '战略合作', // 2025年合作状态
      '张三', // 一级对接人姓名
      '13800138000', // 一级对接人电话
      'zhangsan_wechat', // 一级对接人微信
      '李四', // 二级对接人姓名
      '13900139000', // 二级对接人电话
      'lisi_wechat', // 二级对接人微信
      '是', // 是否代下单
      '否', // 是否双盖合同
      '王五', // 合同跟进人
      '2024-01-01', // 合同开始时间
      '2024-12-31', // 合同结束时间
      '有效', // 合同状态
      'KOL资源', // 资源类型
      '拥有优质KOL资源', // 资源详情
      '是', // 可合作抖音
      '是', // 可合作小红书
      '否', // 可合作微信公众号
      '是', // 可合作微信视频号
      '否', // 可合作微博
      '是', // 可合作B站
      '否', // 可合作知乎
      '是', // 可合作快手
      '否', // 可合作懂车帝
      '否', // 可合作其他平台
      '专业的MCN机构，拥有丰富的KOL资源', // 供应商介绍
    ];

    worksheetData.push(exampleRow);

    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // 设置列宽
    const columnWidths = headers.map(() => ({ wch: 15 }));
    worksheet['!cols'] = columnWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '供应商导入模板');

    // 生成Excel文件的Buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return excelBuffer;
  }
}
