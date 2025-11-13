import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { ResponseUtil } from '../utils/response.util';
import { BusinessErrorType } from '../dto/response.dto';

/**
 * 验证管道配置接口
 */
export interface ValidationPipeOptions {
  /** 是否跳过缺失的属性 */
  skipMissingProperties?: boolean;
  /** 是否跳过null值 */
  skipNullProperties?: boolean;
  /** 是否跳过undefined值 */
  skipUndefinedProperties?: boolean;
  /** 是否去除未知属性 */
  whitelist?: boolean;
  /** 是否禁止未知属性 */
  forbidNonWhitelisted?: boolean;
  /** 是否禁止未知值 */
  forbidUnknownValues?: boolean;
  /** 是否禁用错误消息 */
  disableErrorMessages?: boolean;
  /** 错误消息语言 */
  errorLanguage?: 'zh' | 'en';
  /** 是否启用详细错误 */
  enableDetailedErrors?: boolean;
  /** 是否转换类型 */
  transform?: boolean;
  /** 转换选项 */
  transformOptions?: {
    enableImplicitConversion?: boolean;
    excludeExtraneousValues?: boolean;
    exposeDefaultValues?: boolean;
    exposeUnsetFields?: boolean;
  };
  /** 验证组 */
  groups?: string[];
  /** 是否总是验证 */
  always?: boolean;
  /** 是否严格模式 */
  strictMode?: boolean;
}

/**
 * 全局验证管道
 * 提供请求参数验证、数据转换和错误处理
 */
@Injectable()
export class GlobalValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(GlobalValidationPipe.name);

  private readonly defaultOptions: ValidationPipeOptions = {
    skipMissingProperties: false,
    skipNullProperties: false,
    skipUndefinedProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    disableErrorMessages: false,
    errorLanguage: 'zh',
    enableDetailedErrors: process.env.NODE_ENV !== 'production',
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
      excludeExtraneousValues: true,
      exposeDefaultValues: true,
      exposeUnsetFields: false,
    },
    groups: [],
    always: false,
    strictMode: process.env.NODE_ENV === 'production',
  };

  constructor(private readonly options: ValidationPipeOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const { metatype, type, data } = metadata;

    // 跳过基本类型和没有元类型的情况
    if (!metatype || !this.toValidate(metatype)) {
      return this.transformPrimitive(value, metatype);
    }

    try {
      // 数据转换
      const object = this.transformToClass(value, metatype);

      // 数据验证
      const errors = await this.validateObject(object);

      if (errors.length > 0) {
        throw new BadRequestException(
          ResponseUtil.error(
            '请求参数验证失败',
            400,
            BusinessErrorType.VALIDATION_ERROR,
            this.formatValidationErrors(errors),
          ),
        );
      }

      return object;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`验证管道处理失败: ${error.message}`, error.stack);
      throw new BadRequestException(
        ResponseUtil.error(
          '请求参数处理失败',
          400,
          BusinessErrorType.VALIDATION_ERROR,
          this.options.enableDetailedErrors ? error.message : undefined,
        ),
      );
    }
  }

  /**
   * 检查是否需要验证
   */
  private toValidate(metatype: any): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * 转换基本类型
   */
  private transformPrimitive(value: any, metatype?: any): any {
    if (!this.options.transform || !metatype) {
      return value;
    }

    try {
      switch (metatype) {
        case String:
          return value != null ? String(value) : value;
        case Number:
          return value != null ? Number(value) : value;
        case Boolean:
          return value != null ? Boolean(value) : value;
        case Array:
          return Array.isArray(value) ? value : [value];
        default:
          return value;
      }
    } catch (error) {
      this.logger.warn(`基本类型转换失败: ${error.message}`);
      return value;
    }
  }

  /**
   * 转换为类实例
   */
  private transformToClass(value: any, metatype: any): any {
    if (!this.options.transform) {
      return value;
    }

    try {
      // 添加调试日志
      this.logger.debug(`转换前数据: ${JSON.stringify(value)}`);
      this.logger.debug(`目标类型: ${metatype.name}`);

      const transformOptions = {
        enableImplicitConversion:
          this.options.transformOptions?.enableImplicitConversion,
        excludeExtraneousValues:
          this.options.transformOptions?.excludeExtraneousValues,
        exposeDefaultValues: this.options.transformOptions?.exposeDefaultValues,
        exposeUnsetFields: this.options.transformOptions?.exposeUnsetFields,
        groups: this.options.groups,
      };

      this.logger.debug(`转换选项: ${JSON.stringify(transformOptions)}`);

      const result = plainToInstance(metatype, value, transformOptions);

      this.logger.debug(`转换后数据: ${JSON.stringify(result)}`);

      return result;
    } catch (error) {
      this.logger.error(`类转换失败: ${error.message}`, error.stack);
      throw new Error(`数据转换失败: ${error.message}`);
    }
  }

  /**
   * 验证对象
   */
  private async validateObject(object: any): Promise<ValidationError[]> {
    try {
      return await validate(object, {
        skipMissingProperties: this.options.skipMissingProperties,
        skipNullProperties: this.options.skipNullProperties,
        skipUndefinedProperties: this.options.skipUndefinedProperties,
        whitelist: this.options.whitelist,
        forbidNonWhitelisted: this.options.forbidNonWhitelisted,
        forbidUnknownValues: this.options.forbidUnknownValues,
        disableErrorMessages: this.options.disableErrorMessages,
        groups: this.options.groups,
        always: this.options.always,
        strictGroups: this.options.strictMode,
        dismissDefaultMessages: false,
        validationError: {
          target: this.options.enableDetailedErrors,
          value: this.options.enableDetailedErrors,
        },
      });
    } catch (error) {
      this.logger.error(`对象验证失败: ${error.message}`, error.stack);
      throw new Error(`验证处理失败: ${error.message}`);
    }
  }

  /**
   * 格式化验证错误
   */
  private formatValidationErrors(errors: ValidationError[]): any {
    const formatError = (error: ValidationError): any => {
      const result: any = {
        property: error.property,
        value: this.options.enableDetailedErrors ? error.value : undefined,
        constraints: {},
      };

      // 处理约束错误
      if (error.constraints) {
        Object.keys(error.constraints).forEach((key) => {
          result.constraints[key] = this.translateErrorMessage(
            key,
            error.constraints![key],
            error.property,
          );
        });
      }

      // 处理嵌套错误
      if (error.children && error.children.length > 0) {
        result.children = error.children.map((child) => formatError(child));
      }

      return result;
    };

    return errors.map((error) => formatError(error));
  }

  /**
   * 翻译错误消息
   */
  private translateErrorMessage(
    constraintKey: string,
    message: string,
    property: string,
  ): string {
    if (this.options.errorLanguage === 'en') {
      return message;
    }

    // 中文错误消息映射
    const zhMessages: Record<string, string> = {
      isNotEmpty: `${property}不能为空`,
      isString: `${property}必须是字符串`,
      isNumber: `${property}必须是数字`,
      isInt: `${property}必须是整数`,
      isBoolean: `${property}必须是布尔值`,
      isArray: `${property}必须是数组`,
      isObject: `${property}必须是对象`,
      isEmail: `${property}必须是有效的邮箱地址`,
      isUrl: `${property}必须是有效的URL`,
      isUUID: `${property}必须是有效的UUID`,
      isDateString: `${property}必须是有效的日期字符串`,
      isEnum: `${property}必须是有效的枚举值`,
      minLength: `${property}长度不能少于指定值`,
      maxLength: `${property}长度不能超过指定值`,
      min: `${property}不能小于指定值`,
      max: `${property}不能大于指定值`,
      matches: `${property}格式不正确`,
      isOptional: `${property}是可选的`,
      isDefined: `${property}必须定义`,
      isIn: `${property}必须是指定值之一`,
      isNotIn: `${property}不能是指定值之一`,
      arrayMinSize: `${property}数组长度不能少于指定值`,
      arrayMaxSize: `${property}数组长度不能超过指定值`,
      arrayUnique: `${property}数组元素必须唯一`,
      isPositive: `${property}必须是正数`,
      isNegative: `${property}必须是负数`,
      isDivisibleBy: `${property}必须能被指定数整除`,
      isAlpha: `${property}只能包含字母`,
      isAlphanumeric: `${property}只能包含字母和数字`,
      isDecimal: `${property}必须是小数`,
      isHexadecimal: `${property}必须是十六进制`,
      isMobilePhone: `${property}必须是有效的手机号码`,
      isPhoneNumber: `${property}必须是有效的电话号码`,
      isPostalCode: `${property}必须是有效的邮政编码`,
      isCreditCard: `${property}必须是有效的信用卡号`,
      isISBN: `${property}必须是有效的ISBN`,
      isJSON: `${property}必须是有效的JSON字符串`,
      isJWT: `${property}必须是有效的JWT令牌`,
      isBase64: `${property}必须是有效的Base64字符串`,
      isMimeType: `${property}必须是有效的MIME类型`,
      isIP: `${property}必须是有效的IP地址`,
      isPort: `${property}必须是有效的端口号`,
      whitelistValidation: `${property}包含不允许的字符`,
      blacklistValidation: `${property}包含禁止的字符`,
    };

    return zhMessages[constraintKey] || message;
  }
}

/**
 * 创建验证管道工厂函数
 */
export function createValidationPipe(options?: ValidationPipeOptions) {
  return new GlobalValidationPipe(options);
}

/**
 * 预定义的验证管道配置
 */
export const ValidationPipePresets = {
  /** 严格模式 - 生产环境推荐 */
  STRICT: createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    strictMode: true,
    enableDetailedErrors: false,
    errorLanguage: 'zh',
  }),

  /** 宽松模式 - 开发环境推荐 */
  LOOSE: createValidationPipe({
    whitelist: false,
    forbidNonWhitelisted: false,
    forbidUnknownValues: false,
    transform: true,
    strictMode: false,
    enableDetailedErrors: true,
    errorLanguage: 'zh',
  }),

  /** API模式 - API接口推荐 */
  API: createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    enableDetailedErrors: process.env.NODE_ENV !== 'production',
    errorLanguage: 'zh',
    transformOptions: {
      enableImplicitConversion: true,
      excludeExtraneousValues: true,
    },
  }),

  /** 表单模式 - 表单提交推荐 */
  FORM: createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    skipMissingProperties: true,
    errorLanguage: 'zh',
    transformOptions: {
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    },
  }),
};
