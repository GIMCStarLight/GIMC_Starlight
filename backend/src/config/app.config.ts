import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * 应用配置接口
 */
export interface AppConfig {
  // 应用基础配置
  app: {
    name: string;
    version: string;
    environment: string;
    port: number;
    apiPrefix: string;
    debug: boolean;
    hotReload: boolean;
  };

  // JWT配置
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };

  // 数据库配置
  database: {
    mysql: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
      synchronize: boolean;
      logging: boolean;
    };
    postgres: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
      synchronize: boolean;
      logging: boolean;
    };
  };

  // Redis配置
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
  };

  // 安全配置
  security: {
    corsOrigin: string;
    rateLimitTtl: number;
    rateLimitLimit: number;
    encryptionKey: string;
  };

  // 文件上传配置
  upload: {
    dest: string;
    maxFileSize: number;
    allowedFileTypes: string[];
  };

  // 邮件配置
  mail: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };

  // 第三方API配置
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };

  // 搜索引擎配置
  elasticsearch: {
    node: string;
    username?: string;
    password?: string;
  };

  // 监控配置
  monitoring: {
    healthCheckEnabled: boolean;
    metricsEnabled: boolean;
    prometheusPort: number;
  };

  // API文档配置
  docs: {
    enabled: boolean;
    path: string;
  };
}

/**
 * 获取应用配置
 */
export const getAppConfig = (): AppConfig => {
  const configService = new ConfigService();
  return {
    app: {
      name: configService.get<string>('APP_NAME', '省广星芒系统'),
      version: configService.get<string>('APP_VERSION', '1.0.0'),
      environment: configService.get<string>('NODE_ENV', 'development'),
      port: configService.get<number>('PORT', 3000),
      apiPrefix: configService.get<string>('API_PREFIX', 'api/v1'),
      debug: configService.get<boolean>('DEBUG', false),
      hotReload: configService.get<boolean>('HOT_RELOAD', false),
    },
    jwt: {
      secret: configService.get<string>('JWT_SECRET', 'default-jwt-secret'),
      expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
      refreshSecret: configService.get<string>(
        'JWT_REFRESH_SECRET',
        'default-refresh-secret',
      ),
      refreshExpiresIn: configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '30d',
      ),
    },
    database: {
      mysql: {
        host: configService.get<string>('MYSQL_HOST', 'localhost'),
        port: configService.get<number>('MYSQL_PORT', 3306),
        username: configService.get<string>('MYSQL_USERNAME', 'root'),
        password: configService.get<string>('MYSQL_PASSWORD', ''),
        database: configService.get<string>(
          'MYSQL_DATABASE',
          'gimcstar_system',
        ),
        synchronize: configService.get<boolean>('MYSQL_SYNCHRONIZE', false),
        logging: configService.get<boolean>('MYSQL_LOGGING', false),
      },
      postgres: {
        host: configService.get<string>('POSTGRES_HOST', 'localhost'),
        port: configService.get<number>('POSTGRES_PORT', 5432),
        username: configService.get<string>('POSTGRES_USERNAME', 'postgres'),
        password: configService.get<string>('POSTGRES_PASSWORD', ''),
        database: configService.get<string>(
          'POSTGRES_DATABASE',
          'gimcstar_analytics',
        ),
        synchronize: configService.get<boolean>('POSTGRES_SYNCHRONIZE', false),
        logging: configService.get<boolean>('POSTGRES_LOGGING', false),
      },
    },
    redis: {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: configService.get<number>('REDIS_DB', 0),
      ttl: configService.get<number>('REDIS_TTL', 3600),
    },
    security: {
      corsOrigin: configService.get<string>(
        'CORS_ORIGIN',
        'http://localhost:3001',
      ),
      rateLimitTtl: configService.get<number>('RATE_LIMIT_TTL', 60),
      rateLimitLimit: configService.get<number>('RATE_LIMIT_LIMIT', 100),
      encryptionKey: configService.get<string>(
        'ENCRYPTION_KEY',
        'default-encryption-key',
      ),
    },
    upload: {
      dest: configService.get<string>('UPLOAD_DEST', 'uploads'),
      maxFileSize: configService.get<number>('MAX_FILE_SIZE', 10485760),
      allowedFileTypes: configService
        .get<string>('ALLOWED_FILE_TYPES', 'jpg,jpeg,png,gif,pdf,doc,docx')
        .split(','),
    },
    mail: {
      host: configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: configService.get<number>('MAIL_PORT', 587),
      user: configService.get<string>('MAIL_USER', ''),
      pass: configService.get<string>('MAIL_PASS', ''),
      from: configService.get<string>('MAIL_FROM', 'noreply@gimcstar.com'),
    },
    openai: {
      apiKey: configService.get<string>('OPENAI_API_KEY', ''),
      model: configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo'),
      maxTokens: configService.get<number>('OPENAI_MAX_TOKENS', 1000),
    },
    elasticsearch: {
      node: configService.get<string>(
        'ELASTICSEARCH_NODE',
        'http://localhost:9200',
      ),
      username: configService.get<string>('ELASTICSEARCH_USERNAME'),
      password: configService.get<string>('ELASTICSEARCH_PASSWORD'),
    },
    monitoring: {
      healthCheckEnabled: configService.get<boolean>(
        'HEALTH_CHECK_ENABLED',
        true,
      ),
      metricsEnabled: configService.get<boolean>('METRICS_ENABLED', true),
      prometheusPort: configService.get<number>('PROMETHEUS_PORT', 9090),
    },
    docs: {
      enabled: configService.get<boolean>('API_DOCS_ENABLED', true),
      path: configService.get<string>('SWAGGER_PATH', 'docs'),
    },
  };
};

/**
 * 环境变量验证模式
 */
export const configValidationSchema = Joi.object({
  // 应用配置
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),

  // JWT配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // MySQL配置
  MYSQL_HOST: Joi.string().required(),
  MYSQL_PORT: Joi.number().port().default(3306),
  MYSQL_USERNAME: Joi.string().required(),
  MYSQL_PASSWORD: Joi.string().required(),
  MYSQL_DATABASE: Joi.string().required(),
  MYSQL_SYNCHRONIZE: Joi.boolean().default(false),
  MYSQL_LOGGING: Joi.boolean().default(false),

  // PostgreSQL配置
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().port().default(5432),
  POSTGRES_USERNAME: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DATABASE: Joi.string().required(),
  POSTGRES_SYNCHRONIZE: Joi.boolean().default(false),
  POSTGRES_LOGGING: Joi.boolean().default(false),

  // Redis配置
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_TTL: Joi.number().positive().default(3600),

  // 安全配置
  CORS_ORIGIN: Joi.string().uri().default('http://localhost:3001'),
  RATE_LIMIT_TTL: Joi.number().positive().default(60),
  RATE_LIMIT_LIMIT: Joi.number().positive().default(100),
  ENCRYPTION_KEY: Joi.string().length(32).required(),

  // 其他配置
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  UPLOAD_DEST: Joi.string().default('uploads'),
  MAX_FILE_SIZE: Joi.number().positive().default(10485760),
});
