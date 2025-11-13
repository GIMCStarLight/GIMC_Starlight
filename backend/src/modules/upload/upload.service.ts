import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';
import { parse as parseCsvSync } from 'csv-parse/sync';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { KolList, CooperationDegree, ResourceAttribute } from '../../database/entities/kol-list.entity';
import { ImportHistory, ImportStatus } from '../../database/entities/import-history.entity';
import type { Express } from 'express';
import {
  DataType,
  ValidationResult,
  ImportResult,
  ParseResult,
  ValidationError,
} from './dto/upload.dto';
import {
  ImportTask,
  ImportTaskStatus,
  FailedRecord,
  StartImportResponse,
  ImportProgressResponse,
} from './dto/import-task.dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly fileCache = new Map<string, CsvRow[]>();
  private readonly BATCH_SIZE = 500; // 每批处理500条
  private readonly TASK_EXPIRE_TIME = 3600; // 任务缓存1小时

  // CSV 行类型定义（支持字符串/数字/空值），带可选 _rowIndex
  private static isValue(v: unknown): v is string | number | null | undefined {
    return (
      typeof v === 'string' ||
      typeof v === 'number' ||
      v === null ||
      v === undefined
    );
  }

  private static toCsvValue(v: unknown): string | number | null | undefined {
    if (UploadService.isValue(v)) return v;
    if (v === undefined || v === null) return undefined;
    return String(v);
  }

  constructor(
    @InjectRepository(KolList, 'postgres')
    private readonly kolListRepository: Repository<KolList>,
    @InjectRepository(ImportHistory, 'postgres')
    private readonly importHistoryRepository: Repository<ImportHistory>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  /**
   * 解析Excel文件
   */
  async parseExcelFile(file: Express.Multer.File): Promise<ParseResult> {
    try {
      const fileId = uuidv4();

      // 读取文件内容
      const fileBuffer = await fs.readFile(file.path);

      let parsedData: CsvRow[] = [];

      if (file.originalname.toLowerCase().endsWith('.csv')) {
        // CSV 文件解析
        const fileContent = fileBuffer.toString('utf-8');
        parsedData = this.parseCSV(fileContent);
      } else if (
        file.originalname.toLowerCase().endsWith('.xlsx') ||
        file.originalname.toLowerCase().endsWith('.xls')
      ) {
        // Excel 文件解析
        parsedData = this.parseExcel(fileBuffer);
      } else {
        throw new BadRequestException(
          '不支持的文件格式，请上传 .xlsx、.xls 或 .csv 格式的文件',
        );
      }

      // 缓存解析后的数据
      this.fileCache.set(fileId, parsedData);

      // 设置缓存过期时间（1小时）
      setTimeout(
        () => {
          this.fileCache.delete(fileId);
        },
        60 * 60 * 1000,
      );

      // 清理临时文件
      try {
        await fs.unlink(file.path);
      } catch (unlinkError: unknown) {
        const msg = unlinkError instanceof Error ? unlinkError.message : String(unlinkError);
        this.logger.warn(`清理临时文件失败: ${file.path} - ${msg}`);
      }

      return {
        fileId,
        rowCount: parsedData.length,
        preview: parsedData.slice(0, 5),
        data: parsedData,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`解析文件失败: ${message}`, stack);
      throw new BadRequestException(`文件解析失败: ${message}`);
    }
  }

  private parseExcel(fileBuffer: Buffer): CsvRow[] {
    try {
      // 使用 XLSX 库解析 Excel 文件
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // 获取第一个工作表
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 将工作表转换为 JSON 数组
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown as Array<Array<string | number | null | undefined>>;

      if (jsonData.length === 0) {
        return [];
      }

      // 获取表头
      const headers = (jsonData[0] || []).map((h) => (h === null || h === undefined ? '' : String(h)));

      // 解析数据行
      const data: CsvRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] || [];
        const rowData: CsvRow = { _rowIndex: i + 1 };

        headers.forEach((header, index) => {
          rowData[header] = UploadService.toCsvValue(row[index]);
        });

        data.push(rowData);
      }

      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Excel 文件解析失败: ${message}`);
      throw new BadRequestException(`Excel 文件解析失败: ${message}`);
    }
  }

  private parseCSV(content: string): CsvRow[] {
    try {
      // 预清洗：去除 BOM、统一换行、移除反引号，避免 URL 或备注中的反引号破坏引号结构
      const normalized = content
        .replace(/^\uFEFF/, '')
        .replace(/\r\n/g, '\n')
        .replace(/`/g, '');

      // 猜测分隔符：统计出现次数，优先选择出现最多的
      const commaCount = (normalized.match(/,/g) || []).length;
      const tabCount = (normalized.match(/\t/g) || []).length;
      const semiCount = (normalized.match(/;/g) || []).length;

      const candidates = [
        { delim: ',', count: commaCount },
        { delim: '\t', count: tabCount },
        { delim: ';', count: semiCount },
      ]
        .sort((a, b) => b.count - a.count)
        .map((c) => c.delim);

      // 确保至少尝试常见分隔符
      const tryDelimiters = Array.from(
        new Set([
          ...candidates,
          ',',
          '\t',
          ';',
        ]),
      );

      let parsed: CsvRow[] = [];
      let usedDelimiter = ',';

      for (const delim of tryDelimiters) {
        try {
          const records: Record<string, unknown>[] = parseCsvSync(normalized, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
            relax_quotes: true,
            quote: '"',
            escape: '\\',
            delimiter: delim,
            bom: true,
          });
          if (records && records.length > 0) {
            parsed = records.map((row, idx) => {
              const out: CsvRow = {};
              for (const [k, v] of Object.entries(row)) {
                out[k] = UploadService.toCsvValue(v);
              }
              out._rowIndex = idx + 2;
              return out;
            });
            usedDelimiter = delim;
            break;
          }
        } catch (_e) {
          // 尝试下一个分隔符
        }
      }

      // 如果仍为空，尝试对转义方案做一次放宽（处理 \"）
      if (parsed.length === 0) {
        for (const delim of tryDelimiters) {
          try {
            const relaxed = normalized.replace(/\\"/g, '""');
            const records2: Record<string, unknown>[] = parseCsvSync(relaxed, {
              columns: true,
              skip_empty_lines: true,
              trim: true,
              relax_column_count: true,
              relax_quotes: true,
              quote: '"',
              escape: '"',
              delimiter: delim,
              bom: true,
            });
            if (records2 && records2.length > 0) {
              parsed = records2.map((row, idx) => {
                const out: CsvRow = {};
                for (const [k, v] of Object.entries(row)) {
                  out[k] = UploadService.toCsvValue(v);
                }
                out._rowIndex = idx + 2;
                return out;
              });
              usedDelimiter = delim;
              break;
            }
          } catch (_e2) {
            // 尝试下一个分隔符
          }
        }
      }

      this.logger.debug(
        `CSV 解析结果：rows=${parsed.length}, delimiter="${usedDelimiter}" (first 3) ${JSON.stringify(
          parsed.slice(0, 3),
        )}`,
      );

      return parsed;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`CSV 文件解析失败: ${message}`);
      throw new BadRequestException(`CSV 文件解析失败: ${message}`);
    }
  }

  /**
   * 验证导入数据
   */
  async validateImportData(
    fileId: string,
    type: DataType = DataType.PRIVATE,
  ): Promise<ValidationResult> {
    const data = this.fileCache.get(fileId);
    if (!data) {
      throw new BadRequestException('文件数据不存在或已过期');
    }

    return this.validateData(data, type);
  }

  /**
   * 验证数据
   */
  private async validateData(
    data: CsvRow[],
    type: DataType = DataType.PRIVATE,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let validCount = 0;

    // 对于大批量数据，使用采样验证策略
    const LARGE_DATASET_THRESHOLD = 1000;
    const SAMPLE_SIZE = 500; // 验证前500条 + 采样500条
    let dataToValidate = data;
    let isSampled = false;

    if (data.length > LARGE_DATASET_THRESHOLD) {
      isSampled = true;
      // 验证前500条
      const firstBatch = data.slice(0, SAMPLE_SIZE);
      // 从剩余数据中采样500条
      const remaining = data.slice(SAMPLE_SIZE);
      const sampleInterval = Math.floor(remaining.length / SAMPLE_SIZE);
      const sampledData: CsvRow[] = [];
      for (let i = 0; i < SAMPLE_SIZE && i * sampleInterval < remaining.length; i++) {
        sampledData.push(remaining[i * sampleInterval]);
      }
      dataToValidate = [...firstBatch, ...sampledData];
      this.logger.log(
        `大批量数据验证：总数${data.length}条，采样验证${dataToValidate.length}条`,
      );
    }

    // 定义必填字段映射 - 支持中英文字段名
    const requiredFieldsMapping = {
      account_name: ['account_name', '达人昵称'],
      platform: ['platform', '平台'],
      followers_w: ['followers_w', '粉丝数(万)', '粉丝数'],
    };

    // 定义支持的平台及其别名映射
    const platformMapping = {
      抖音: ['抖音', 'douyin', 'dy', 'tiktok', '抖音短视频'],
      小红书: ['小红书', 'xiaohongshu', 'xhs', 'redbook', '小红书app'],
      快手: ['快手', 'kuaishou', 'ks', 'kwai'],
      微博: ['微博', 'weibo', 'wb', '新浪微博'],
      B站: ['B站', 'bilibili', 'bili', 'b站', '哔哩哔哩'],
      视频号: ['视频号', 'shipiinhao', 'sph', '微信视频号', '视频号小程序'],
    };

    for (let i = 0; i < dataToValidate.length; i++) {
      const row = dataToValidate[i];
      const rowNumber = (row._rowIndex as number) || i + 1;
      let hasError = false;

      // 检查必填字段 - 支持中英文字段名
      for (const [englishField, fieldNames] of Object.entries(
        requiredFieldsMapping,
      )) {
        let fieldValue: string | null = null;

        // 尝试从多个可能的字段名中获取值
        for (const fieldName of fieldNames) {
          const v = row[fieldName];
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            fieldValue = String(v);
            break;
          }
        }

        if (!fieldValue) {
          errors.push({
            row: rowNumber,
            field: englishField,
            message: `${this.getFieldDisplayName(englishField)}不能为空`,
            data: { value: fieldValue },
          });
          hasError = true;
        } else {
          // 将找到的值映射到标准英文字段名，便于后续验证
          row[englishField] = fieldValue;
        }
      }

      // 智能匹配平台
      if (row.platform) {
        const normalizedPlatform = this.normalizePlatform(
          String(row.platform),
          platformMapping,
        );
        if (normalizedPlatform) {
          // 更新为标准平台名称
          row.platform = normalizedPlatform;
        } else {
          // 非支持平台归类为"其他"
          row.platform = '其他';
          warnings.push({
            row: rowNumber,
            field: 'platform',
            message: `平台"${row.platform}"不在支持列表中，已自动归类为"其他"`,
            data: { value: row.platform },
          });
        }
      }

      // 验证粉丝数
      if (row.followers_w !== null && row.followers_w !== undefined) {
        const followers = parseFloat(String(row.followers_w));
        if (isNaN(followers) || followers < 0) {
          errors.push({
            row: rowNumber,
            field: 'followers_w',
            message: '粉丝数必须是有效的数字',
            data: { value: row.followers_w },
          });
          hasError = true;
        } else if (followers > 10000) {
          warnings.push({
            row: rowNumber,
            field: 'followers_w',
            message: '粉丝数异常高，请确认数据准确性',
            data: { value: row.followers_w },
          });
        } else if (followers < 0.1) {
          warnings.push({
            row: rowNumber,
            field: 'followers_w',
            message: '粉丝数较低，请确认数据准确性',
            data: { value: row.followers_w },
          });
        }
      }

      // 验证主页链接格式（如果提供）
      if (row.home_link && String(row.home_link).trim()) {
        if (!this.isValidUrl(String(row.home_link))) {
          warnings.push({
            row: rowNumber,
            field: 'home_link',
            message: '主页链接格式可能不正确，请检查',
            data: { value: row.home_link },
          });
        }
      }

      // 验证报价合理性
      if (row.star_quote_21_60s) {
        const quote = parseFloat(String(row.star_quote_21_60s));
        if (!isNaN(quote)) {
          if (quote < 100) {
            warnings.push({
              row: rowNumber,
              field: 'star_quote_21_60s',
              message: '星图报价较低，请确认数据准确性',
              data: { value: row.star_quote_21_60s },
            });
          } else if (quote > 1000000) {
            warnings.push({
              row: rowNumber,
              field: 'star_quote_21_60s',
              message: '星图报价异常高，请确认数据准确性',
              data: { value: row.star_quote_21_60s },
            });
          }
        }
      }

      // 验证返点区间格式（私域达人）
      if (
        type === DataType.PRIVATE &&
        row.rebate_range &&
        String(row.rebate_range).trim()
      ) {
        if (!this.isValidRebateRange(String(row.rebate_range))) {
          warnings.push({
            row: rowNumber,
            field: 'rebate_range',
            message: '返点区间格式建议使用"10%-15%"的格式',
            data: { value: row.rebate_range },
          });
        }
      }

      if (!hasError) {
        validCount++;
      }
    }

    // 批量检查账号重复（优化性能）
    const accountsToCheck = dataToValidate
      .filter(row => row.account_name || row.account_id)
      .map(row => ({
        platform: String(row.platform),
        account_id: row.account_id ? String(row.account_id) : null,
        account_name: row.account_name ? String(row.account_name) : null,
        rowIndex: row._rowIndex,
      }));

    if (accountsToCheck.length > 0) {
      // 批量查询所有可能重复的账号
      const accountIds = accountsToCheck
        .filter(a => a.account_id)
        .map(a => a.account_id);
      const accountNames = accountsToCheck
        .filter(a => !a.account_id && a.account_name)
        .map(a => a.account_name);

      const existingKols = await this.kolListRepository.find({
        where: [
          ...(accountIds.length > 0 ? [{ account_id: In(accountIds) }] : []),
          ...(accountNames.length > 0 ? [{ account_name: In(accountNames) }] : []),
        ],
        select: ['id', 'account_name', 'platform', 'account_id'],
      });

      // 创建查找映射
      const existingMap = new Map<string, any>();
      existingKols.forEach(kol => {
        if (kol.account_id) {
          existingMap.set(`${kol.platform}:${kol.account_id}`, kol);
        }
        if (kol.account_name) {
          existingMap.set(`${kol.platform}:${kol.account_name}`, kol);
        }
      });

      // 检查每个账号是否存在
      accountsToCheck.forEach(account => {
        const key = account.account_id
          ? `${account.platform}:${account.account_id}`
          : `${account.platform}:${account.account_name}`;
        
        if (existingMap.has(key)) {
          warnings.push({
            row: account.rowIndex as number,
            field: account.account_id ? 'account_id' : 'account_name',
            message: '该账号已存在，导入时将更新现有数据',
            data: { value: account.account_id || account.account_name },
          });
        }
      });
    }

    // 如果是采样验证，按比例估算总有效数
    const estimatedValidCount = isSampled
      ? Math.round((validCount / dataToValidate.length) * data.length)
      : validCount;

    return {
      valid: errors.length === 0,
      validCount: estimatedValidCount,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings,
      isSampled,
      totalRows: data.length,
      validatedRows: dataToValidate.length,
      preview: data.slice(0, 10).map((row) => {
        const status = errors.some((e) => e.row === ((row._rowIndex as number) || 0))
          ? 'error'
          : warnings.some((w) => w.row === ((row._rowIndex as number) || 0))
            ? 'warning'
            : 'valid';
        const out: CsvRow & { _status: 'error' | 'warning' | 'valid' } = {} as any;
        for (const [k, v] of Object.entries(row)) {
          out[k] = v as any;
        }
        (out as any)._status = status;
        return out as any;
      }),
    };
  }

  /**
   * 映射 CSV 字段到数据库字段
   */
  private mapCsvToDbFields(csvRow: CsvRow): MappedKolRow {
    this.logger.debug(`Mapping CSV row to DB fields: ${JSON.stringify(csvRow)}`);
    // 清洗函数：去空格、去包裹引号/反引号
    const cleanString = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      return String(v)
        .trim()
        .replace(/^`+|`+$/g, '')
        .replace(/^"+|"+$/g, '')
        .replace(/\s+/g, ' ');
    };

    // 处理粉丝数 - CSV中的粉丝数已经是以万为单位
    const followersValue =
      csvRow['粉丝数(万)'] || csvRow['粉丝数'] || csvRow['followers_w'] || null;
    const followers_w = this.parseNumber(followersValue as any);

    return {
      // 基础字段
      account_name: cleanString(
        csvRow['达人昵称'] || csvRow['account_name'] || ''
      ),
      platform: cleanString(csvRow['平台'] || csvRow['platform'] || ''),
      account_id: cleanString(
        csvRow['账号'] || csvRow['account_id'] || csvRow['达人昵称'] || ''
      ),
      home_link: cleanString(csvRow['主页链接'] || csvRow['home_link'] || ''),
      followers_w: followers_w,

      // 机构和类目信息
      org_name: cleanString(csvRow['机构名称'] || csvRow['org_name'] || ''),
      category: cleanString(csvRow['类目'] || csvRow['category'] || ''),

      // 报价信息
      star_quote_21_60s: this.parseNumber(
        (csvRow['星图报价21-60s'] ||
          csvRow['报价'] ||
          csvRow['star_quote_21_60s'] ||
          null) as any,
      ),
      star_quote_60s_plus: this.parseNumber(
        (csvRow['星图报价60s+'] || csvRow['star_quote_60s_plus'] || null) as any,
      ),

      // 私域达人特有字段
      is_exclusive: this.parseIsExclusive(
        (csvRow['是否独家'] || csvRow['is_exclusive']) as any,
      ),
      rebate_policy: cleanString(
        csvRow['返点政策'] || csvRow['rebate_policy'] || ''
      ),
      // 修复：CSV中是'返点范围'，不是'返点区间'
      rebate_range: cleanString(
        csvRow['返点范围'] ||
          csvRow['返点区间'] ||
          csvRow['rebate_range'] ||
          ''
      ),
      policy_level: cleanString(
        csvRow['政策等级'] || csvRow['policy_level'] || ''
      ),
      // 修复：CSV中是'返点周期'，不是'返点账期'
      rebate_period: cleanString(
        csvRow['返点周期'] ||
          csvRow['返点账期'] ||
          csvRow['rebate_period'] ||
          ''
      ),
      // 修复：CSV中是'结算周期'，不是'支付账期'
      pay_period: cleanString(
        csvRow['结算周期'] || csvRow['支付账期'] || csvRow['pay_period'] || ''
      ),
      remark: cleanString(csvRow['备注'] || csvRow['remark'] || ''),
      cooperation_intro: cleanString(
        csvRow['合作简介'] || csvRow['cooperation_intro'] || ''
      ),
      annual_contract_org: cleanString(
        csvRow['年框机构'] ||
          csvRow['年度框架'] ||
          csvRow['annual_contract_org'] ||
          ''
      ),

      // 配合度映射
      cooperation_degree: this.mapCooperationDegree(
        cleanString(csvRow['配合度'] || csvRow['cooperation_degree'])
      ),

      // 资源属性映射
      resource_attribute: this.mapResourceAttribute(
        cleanString(csvRow['资源属性'] || csvRow['resource_attribute'])
      ),
      source: cleanString(csvRow['source'] || ''),
    };
  }

  /**
   * 解析数字字符串
   */
  private parseNumber(value: string | number | null): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const s = String(value).trim();
    if (!s) return null;
    const numStr = s.replace(/[^\d.]/g, '');
    const n = parseFloat(numStr);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * 解析布尔值
   */
  private parseBoolean(value: string | number | boolean): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const str = String(value).trim().toLowerCase();

    // 处理中文
    if (str === '是' || str === '有' || str === '启用' || str === '开启') {
      return 1;
    }
    if (str === '否' || str === '无' || str === '禁用' || str === '关闭') {
      return 0;
    }

    // 处理英文
    if (str === 'true' || str === 'yes' || str === 'on' || str === 'enabled') {
      return 1;
    }
    if (
      str === 'false' ||
      str === 'no' ||
      str === 'off' ||
      str === 'disabled'
    ) {
      return 0;
    }

    // 处理数字 - 扩展支持更多数字格式
    const num = Number(str);
    if (!isNaN(num)) {
      // 对于数字，任何大于0的值都视为true(1)，0及负数视为false(0)
      return num > 0 ? 1 : 0;
    }

    // 默认返回0
    return 0;
  }

  /**
   * 解析是否独家字段，只接受"是"或"否"
   */
  private parseIsExclusive(value: string | number | boolean): number {
    // 使用统一布尔解析，兼容更多变体
    return this.parseBoolean(value);
  }

  /**
   * 映射配合度枚举值
   */
  private mapCooperationDegree(value: string): CooperationDegree {
    if (!value) return CooperationDegree.MEDIUM;
    const str = String(value).toLowerCase().trim();
    const mapping: Record<string, CooperationDegree> = {
      高: CooperationDegree.HIGH,
      中: CooperationDegree.MEDIUM,
      低: CooperationDegree.LOW,
      high: CooperationDegree.HIGH,
      medium: CooperationDegree.MEDIUM,
      low: CooperationDegree.LOW,
    };
    return mapping[str] || CooperationDegree.MEDIUM;
  }

  /**
   * 映射资源属性枚举值
   */
  private mapResourceAttribute(value: string): ResourceAttribute {
    if (!value) return ResourceAttribute.OTHER;
    const str = String(value).toLowerCase().trim();
    const mapping: Record<string, ResourceAttribute> = {
      上广项目: ResourceAttribute.SGXM,
      独家: ResourceAttribute.EXCLUSIVE,
      其他: ResourceAttribute.OTHER,
      sgxm: ResourceAttribute.SGXM,
      exclusive: ResourceAttribute.EXCLUSIVE,
      other: ResourceAttribute.OTHER,
    };
    return mapping[str] || ResourceAttribute.OTHER;
  }

  /**
   * 验证URL格式
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlPattern =
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w.-]*)*\/?$/;
      return (
        urlPattern.test(url.trim()) ||
        url.includes('douyin.com') ||
        url.includes('xiaohongshu.com') ||
        url.includes('bilibili.com')
      );
    } catch {
      return false;
    }
  }

  /**
   * 智能匹配平台名称
   */
  private normalizePlatform(
    inputPlatform: string,
    platformMapping: Record<string, string[]>,
  ): string | null {
    if (!inputPlatform) return null;

    const input = inputPlatform.toString().trim().toLowerCase();

    // 遍历平台映射，查找匹配的别名
    for (const [standardName, aliases] of Object.entries(platformMapping)) {
      for (const alias of aliases) {
        if (alias.toLowerCase() === input) {
          return standardName;
        }
      }
    }

    return null;
  }

  /**
   * 验证返点区间格式
   */
  private isValidRebateRange(range: string): boolean {
    // 支持格式：10%-15%, 10%~15%, 10-15%, 等
    const rangePattern = /^\d+(\.\d+)?%?[-~]\d+(\.\d+)?%?$/;
    return rangePattern.test(range.trim());
  }

  /**
   * 导入数据到数据库
   */
  async importData(
    fileId: string,
    _type: DataType = DataType.PRIVATE,
  ): Promise<ImportResult> {
    const data = this.fileCache.get(fileId);
    if (!data) {
      throw new BadRequestException('文件数据不存在或已过期');
    }

    const startTime = Date.now();
    let successCount = 0;
    let failedCount = 0;
    const failedRecords: any[] = [];

    try {
      for (const row of data) {
        try {
          // 映射 CSV 字段到数据库字段
          const mappedData = this.mapCsvToDbFields(row);

          // 验证必填字段
          if (!mappedData.account_name || !mappedData.account_name.trim()) {
            throw new Error('达人昵称不能为空');
          }
          if (!mappedData.platform || !mappedData.platform.trim()) {
            throw new Error('平台不能为空');
          }

          // 查找是否已存在相同账号（优先使用 platform+account_id，其次 platform+account_name）
          const existingKol = await this.kolListRepository.findOne({
            where: mappedData.account_id
              ? {
                  platform: mappedData.platform,
                  account_id: mappedData.account_id,
                }
              : {
                  platform: mappedData.platform,
                  account_name: mappedData.account_name,
                },
            select: ['id', 'account_name', 'platform', 'account_id'],
          });

          if (existingKol) {
            // 更新现有记录 - 包含所有私域达人字段
            await this.kolListRepository.update(existingKol.id, {
              platform: mappedData.platform,
              followers_w: mappedData.followers_w ?? 0,
              org_name: mappedData.org_name,
              category: mappedData.category,
              account_id: mappedData.account_id,
              home_link: mappedData.home_link,
              star_quote_21_60s: mappedData.star_quote_21_60s ?? 0,
              star_quote_60s_plus: mappedData.star_quote_60s_plus ?? 0,
              is_exclusive: mappedData.is_exclusive,
              rebate_policy: mappedData.rebate_policy,
              rebate_range: mappedData.rebate_range,
              policy_level: mappedData.policy_level,
              rebate_period: mappedData.rebate_period,
              pay_period: mappedData.pay_period,
              remark: mappedData.remark,
              cooperation_intro: mappedData.cooperation_intro,
              annual_contract_org: mappedData.annual_contract_org,
              cooperation_degree: mappedData.cooperation_degree,
              resource_attribute: mappedData.resource_attribute,
              updated_at: new Date(),
            });
          } else {
            // 创建新记录 - 包含所有私域达人字段
            await this.kolListRepository.query(
              `
               INSERT INTO kol_list (
                 account_name, platform, account_id, home_link, followers_w, 
                 org_name, category, star_quote_21_60s, star_quote_60s_plus,
                 is_exclusive, rebate_policy, rebate_range, policy_level,
                 rebate_period, pay_period, remark, cooperation_intro,
                 annual_contract_org, cooperation_degree, resource_attribute,
                 source, created_at, updated_at
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'import', NOW(), NOW())
             `,
              [
                mappedData.account_name,
                mappedData.platform,
                mappedData.account_id,
                mappedData.home_link || '',
                mappedData.followers_w,
                mappedData.org_name || '',
                mappedData.category || '',
                mappedData.star_quote_21_60s || null,
                mappedData.star_quote_60s_plus || null,
                mappedData.is_exclusive || 0,
                mappedData.rebate_policy || '',
                mappedData.rebate_range || '',
                mappedData.policy_level || '',
                mappedData.rebate_period || '',
                mappedData.pay_period || '',
                mappedData.remark || '',
                mappedData.cooperation_intro || '',
                mappedData.annual_contract_org || '',
                mappedData.cooperation_degree || 'medium',
                mappedData.resource_attribute || 'other',
              ],
            );
          }
          successCount++;
        } catch (error: unknown) {
          failedCount++;
          failedRecords.push({
            row: row._rowIndex,
            data: row,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 导入成功后不立即清理缓存，让缓存自然过期
      // 这样用户可以重新导入而不会遇到"文件数据不存在或已过期"错误
      // this.fileCache.delete(fileId);

      const duration = Date.now() - startTime;
      return {
        isSuccess: failedCount === 0,
        message: `导入完成，成功${successCount}条，失败${failedCount}条`,
        total: data.length,
        successCount,
        failedCount,
        duration,
        failedRecords: failedCount > 0 ? failedRecords : undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`数据导入失败: ${message}`, stack);
      throw new BadRequestException(`数据导入失败: ${message}`);
    }
  }

  /**
   * 获取字段显示名称
   */
  /**
   * 异步导入数据（推荐用于大批量数据）
   */
  async importDataAsync(
    fileId: string,
    type: DataType = DataType.PRIVATE,
    fileName?: string,
  ): Promise<StartImportResponse> {
    const data = this.fileCache.get(fileId);
    if (!data) {
      throw new BadRequestException('文件数据不存在或已过期');
    }

    const taskId = uuidv4();
    const totalRows = data.length;
    const startTime = new Date();

    // 初始化任务状态
    const task: ImportTask = {
      taskId,
      status: ImportTaskStatus.PENDING,
      totalRows,
      processedRows: 0,
      successCount: 0,
      failedCount: 0,
      progress: 0,
      startTime: startTime.getTime(),
    };

    await this.redis.set(
      `import:task:${taskId}`,
      JSON.stringify(task),
      'EX',
      this.TASK_EXPIRE_TIME,
    );

    // 保存到数据库历史记录
    await this.importHistoryRepository.save({
      task_id: taskId,
      file_name: fileName || 'unknown.csv',
      data_type: type,
      total_rows: totalRows,
      status: ImportStatus.PENDING,
      start_time: startTime,
    });

    // 异步执行导入（不阻塞响应）
    this.executeImportAsync(taskId, data, type).catch((err) => {
      this.logger.error(`Import task ${taskId} failed:`, err);
      this.updateTaskStatus(taskId, {
        status: ImportTaskStatus.FAILED,
        errorMessage: err.message,
      }).catch((e) => this.logger.error('Failed to update task status:', e));
    });

    // 预估耗时：每条数据约0.1秒
    const estimatedDuration = Math.ceil(totalRows * 0.1);

    return {
      taskId,
      totalRows,
      estimatedDuration,
    };
  }

  /**
   * 获取导入进度
   */
  async getImportProgress(taskId: string): Promise<ImportProgressResponse> {
    const taskData = await this.redis.get(`import:task:${taskId}`);
    if (!taskData) {
      throw new NotFoundException('任务不存在或已过期');
    }

    const task: ImportTask = JSON.parse(taskData);

    return {
      taskId: task.taskId,
      status: task.status,
      totalRows: task.totalRows,
      processedRows: task.processedRows,
      successCount: task.successCount,
      failedCount: task.failedCount,
      progress: task.progress,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.duration,
      failedRecords: task.failedRecords,
      errorMessage: task.errorMessage,
    };
  }

  /**
   * 执行异步导入
   */
  private async executeImportAsync(
    taskId: string,
    data: CsvRow[],
    type: DataType,
  ): Promise<void> {
    let processedRows = 0;
    let successCount = 0;
    let failedCount = 0;
    const failedRecords: FailedRecord[] = [];

    try {
      // 更新状态为处理中
      await this.updateTaskStatus(taskId, {
        status: ImportTaskStatus.PROCESSING,
      });

      // 分批处理
      for (let i = 0; i < data.length; i += this.BATCH_SIZE) {
        const batch = data.slice(i, i + this.BATCH_SIZE);

        for (const row of batch) {
          try {
            // 映射 CSV 字段到数据库字段
            const mappedData = this.mapCsvToDbFields(row);

            // 验证必填字段
            if (!mappedData.account_name || !mappedData.account_name.trim()) {
              throw new Error('达人昵称不能为空');
            }
            if (!mappedData.platform || !mappedData.platform.trim()) {
              throw new Error('平台不能为空');
            }

            // 执行导入
            await this.importSingleRow(mappedData);
            successCount++;
          } catch (error: unknown) {
            failedCount++;
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            failedRecords.push({
              row: (row._rowIndex as number) || processedRows + 1,
              data: row,
              error: errorMessage,
            });
          }

          processedRows++;
        }

        // 每批次完成后更新进度
        const progress = Math.round((processedRows / data.length) * 100);
        await this.updateTaskStatus(taskId, {
          processedRows,
          successCount,
          failedCount,
          progress,
        });

        this.logger.log(
          `Import task ${taskId}: ${processedRows}/${data.length} (${progress}%)`,
        );
      }

      // 完成后更新最终状态
      const endTime = Date.now();
      const task = await this.getTaskFromRedis(taskId);
      const duration = task ? endTime - task.startTime : 0;

      await this.updateTaskStatus(taskId, {
        status: ImportTaskStatus.COMPLETED,
        processedRows,
        successCount,
        failedCount,
        progress: 100,
        endTime,
        duration,
        failedRecords: failedCount > 0 ? failedRecords : undefined,
      });

      // 更新数据库历史记录
      await this.importHistoryRepository.update(
        { task_id: taskId },
        {
          status: ImportStatus.COMPLETED,
          processed_rows: processedRows,
          success_count: successCount,
          failed_count: failedCount,
          progress: 100,
          end_time: new Date(endTime),
          duration,
          failed_records: failedCount > 0 ? (failedRecords as any) : null,
        },
      );

      this.logger.log(
        `Import task ${taskId} completed: ${successCount} success, ${failedCount} failed, ${duration}ms`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Import task ${taskId} error:`, error);

      await this.updateTaskStatus(taskId, {
        status: ImportTaskStatus.FAILED,
        processedRows,
        successCount,
        failedCount,
        errorMessage,
        failedRecords: failedCount > 0 ? failedRecords : undefined,
      });

      // 更新数据库历史记录
      await this.importHistoryRepository.update(
        { task_id: taskId },
        {
          status: ImportStatus.FAILED,
          processed_rows: processedRows,
          success_count: successCount,
          failed_count: failedCount,
          error_message: errorMessage,
          failed_records: failedCount > 0 ? (failedRecords as any) : null,
        },
      );

      throw error;
    }
  }

  /**
   * 导入单行数据
   */
  private async importSingleRow(mappedData: MappedKolRow): Promise<void> {
    // 查找是否已存在相同账号
    const existingKol = await this.kolListRepository.findOne({
      where: mappedData.account_id
        ? {
            platform: mappedData.platform,
            account_id: mappedData.account_id,
          }
        : {
            platform: mappedData.platform,
            account_name: mappedData.account_name,
          },
      select: ['id'],
    });

    if (existingKol) {
      // 更新现有记录
      await this.kolListRepository.update(existingKol.id, {
        platform: mappedData.platform,
        followers_w: mappedData.followers_w ?? 0,
        org_name: mappedData.org_name,
        category: mappedData.category,
        account_id: mappedData.account_id,
        home_link: mappedData.home_link,
        star_quote_21_60s: mappedData.star_quote_21_60s ?? 0,
        star_quote_60s_plus: mappedData.star_quote_60s_plus ?? 0,
        is_exclusive: mappedData.is_exclusive,
        rebate_policy: mappedData.rebate_policy || '',
        rebate_range: mappedData.rebate_range,
        policy_level: mappedData.policy_level,
        rebate_period: mappedData.rebate_period,
        pay_period: mappedData.pay_period,
        remark: mappedData.remark,
        cooperation_intro: mappedData.cooperation_intro,
        annual_contract_org: mappedData.annual_contract_org,
        cooperation_degree: mappedData.cooperation_degree,
        resource_attribute: mappedData.resource_attribute,
        updated_at: new Date(),
      });
    } else {
      // 创建新记录
      await this.kolListRepository.query(
        `
         INSERT INTO kol_list (
           account_name, platform, account_id, home_link, followers_w, 
           org_name, category, star_quote_21_60s, star_quote_60s_plus,
           is_exclusive, rebate_policy, rebate_range, policy_level,
           rebate_period, pay_period, remark, cooperation_intro,
           annual_contract_org, cooperation_degree, resource_attribute,
           source, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'import', NOW(), NOW())
       `,
        [
          mappedData.account_name,
          mappedData.platform,
          mappedData.account_id,
          mappedData.home_link || '',
          mappedData.followers_w,
          mappedData.org_name || '',
          mappedData.category || '',
          mappedData.star_quote_21_60s || null,
          mappedData.star_quote_60s_plus || null,
          mappedData.is_exclusive || 0,
          mappedData.rebate_policy || '',
          mappedData.rebate_range || '',
          mappedData.policy_level || '',
          mappedData.rebate_period || '',
          mappedData.pay_period || '',
          mappedData.remark || '',
          mappedData.cooperation_intro || '',
          mappedData.annual_contract_org || '',
          mappedData.cooperation_degree || 'medium',
          mappedData.resource_attribute || 'other',
        ],
      );
    }
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(
    taskId: string,
    updates: Partial<ImportTask>,
  ): Promise<void> {
    const task = await this.getTaskFromRedis(taskId);
    if (!task) {
      this.logger.warn(`Task ${taskId} not found in Redis`);
      return;
    }

    const updatedTask = { ...task, ...updates };

    await this.redis.set(
      `import:task:${taskId}`,
      JSON.stringify(updatedTask),
      'EX',
      this.TASK_EXPIRE_TIME,
    );
  }

  /**
   * 从Redis获取任务
   */
  private async getTaskFromRedis(taskId: string): Promise<ImportTask | null> {
    const taskData = await this.redis.get(`import:task:${taskId}`);
    if (!taskData) {
      return null;
    }
    return JSON.parse(taskData);
  }

  /**
   * 获取导入历史列表
   */
  async getImportHistory(page: number = 1, pageSize: number = 20) {
    const [items, total] = await this.importHistoryRepository.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取单个导入历史详情
   */
  async getImportHistoryDetail(taskId: string) {
    const history = await this.importHistoryRepository.findOne({
      where: { task_id: taskId },
    });

    if (!history) {
      throw new NotFoundException('导入记录不存在');
    }

    return history;
  }

  private getFieldDisplayName(field: string): string {
    const fieldMap: Record<string, string> = {
      account_name: '账号名称',
      platform: '平台',
      followers_w: '粉丝数(万)',
      org_name: '机构名称',
      category: '分类',
      account_url: '账号链接',
    };
    return fieldMap[field] || field;
  }
}

// 类型定义区域
type CsvRow = {
  [key: string]: string | number | null | undefined;
  _rowIndex?: number;
};

type MappedKolRow = {
  account_name: string;
  platform: string;
  account_id: string;
  home_link: string;
  followers_w: number | null;
  org_name: string;
  category: string;
  star_quote_21_60s: number | null;
  star_quote_60s_plus: number | null;
  is_exclusive: number;
  rebate_policy: string;
  rebate_range: string;
  policy_level: string;
  rebate_period: string;
  pay_period: string;
  remark: string;
  cooperation_intro: string;
  annual_contract_org: string;
  cooperation_degree: CooperationDegree;
  resource_attribute: ResourceAttribute;
  source?: string;
};
