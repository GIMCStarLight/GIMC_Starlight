import { WinstonModuleOptions } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

/**
 * 获取Winston日志配置
 */
export const getLoggerConfig = (
  configService: ConfigService,
): WinstonModuleOptions => {
  const logLevel = configService.get<string>('LOG_LEVEL', 'info');
  const logPath = configService.get<string>('LOG_FILE_PATH', 'logs');
  const maxSize = configService.get<string>('LOG_MAX_SIZE', '20m');
  const maxFiles = configService.get<string>('LOG_MAX_FILES', '14d');
  const datePattern = configService.get<string>(
    'LOG_DATE_PATTERN',
    'YYYY-MM-DD',
  );
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  const transports: winston.transport[] = [];

  // 控制台输出配置
  if (!isProduction) {
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('GimcStar', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    );
  }

  // 错误日志文件配置
  transports.push(
    new DailyRotateFile({
      level: 'error',
      filename: `${logPath}/error-%DATE%.log`,
      datePattern,
      maxSize,
      maxFiles,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  );

  // 应用日志文件配置
  transports.push(
    new DailyRotateFile({
      level: logLevel,
      filename: `${logPath}/application-%DATE%.log`,
      datePattern,
      maxSize,
      maxFiles,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),
  );

  // HTTP请求日志文件配置
  transports.push(
    new DailyRotateFile({
      level: 'http',
      filename: `${logPath}/http-%DATE%.log`,
      datePattern,
      maxSize,
      maxFiles,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
    }),
  );

  return {
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: {
      service: 'gimcstar-system',
      version: configService.get<string>('APP_VERSION', '1.0.0'),
    },
    transports,
    exitOnError: false,
  };
};

/**
 * 日志级别常量
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
} as const;

/**
 * 日志上下文常量
 */
export const LOG_CONTEXTS = {
  APPLICATION: 'Application',
  DATABASE: 'Database',
  REDIS: 'Redis',
  AUTH: 'Authentication',
  SEARCH: 'Search',
  RECOMMENDATION: 'Recommendation',
  HTTP: 'HTTP',
  WEBSOCKET: 'WebSocket',
  SCHEDULER: 'Scheduler',
  EMAIL: 'Email',
} as const;

/**
 * 自定义日志格式化器
 */
export const customLogFormat = winston.format.printf(
  ({ timestamp, level, message, context, trace, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : '';
    const traceString = trace ? `\n${trace}` : '';
    const contextString = context ? `[${context}]` : '';

    return `${timestamp} [${level.toUpperCase()}] ${contextString} ${message}${traceString}${metaString ? `\n${metaString}` : ''}`;
  },
);

/**
 * 日志配置验证
 */
export const validateLoggerConfig = (configService: ConfigService): void => {
  const logLevel = configService.get<string>('LOG_LEVEL');
  const validLevels = Object.values(LOG_LEVELS);

  if (logLevel && !validLevels.includes(logLevel as any)) {
    throw new Error(
      `Invalid LOG_LEVEL: ${logLevel}. Valid levels are: ${validLevels.join(', ')}`,
    );
  }
};
