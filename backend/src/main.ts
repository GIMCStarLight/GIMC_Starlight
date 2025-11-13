import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // 配置cookie解析器
  app.use(cookieParser());

  // 配置body parser以支持URL编码数据
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // 配置静态文件服务（用于SQLBot嵌入式脚本）
  app.use('/xpack_static', express.static('public/xpack_static'));

  // 注意：全局验证管道已在CommonModule中配置，这里不需要重复配置
  // 如果需要覆盖，请修改CommonModule中的配置

  // 设置全局API前缀
  app.setGlobalPrefix('api');

  // 启用CORS（允许携带凭证，用于Cookie刷新令牌等）
  const frontendOrigin =
    configService.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5777';
  app.enableCors({
    origin: (origin, callback) => {
      // 允许本地开发、内网IP和未提供origin的同源请求
      const isLocal =
        !origin ||
        /^(http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+|http:\/\/192\.168\.\d+\.\d+(:\d+)?)$/.test(
          origin,
        );
      if (isLocal || origin === frontendOrigin) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    exposedHeaders: [
      'X-Trace-Id',
      'X-Response-Time',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 配置Swagger文档
  const config = new DocumentBuilder()
    .setTitle('智能达人推荐系统 API')
    .setDescription(
      '智能达人推荐系统后端接口文档，包含用户管理、权限控制、推荐算法等功能模块',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '请输入JWT令牌',
        in: 'header',
      },
      'JWT-auth', // 这个名字用于在控制器中引用
    )
    .addTag('认证管理', '用户登录、注册、令牌刷新等认证相关接口')
    .addTag('用户管理', '用户信息的增删改查操作')
    .addTag('角色管理', '系统角色的管理和权限分配')
    .addTag('权限管理', '系统权限的管理和控制')
    .addTag('推荐系统', '智能推荐算法和推荐结果管理')
    .addTag('系统管理', '系统配置、监控、日志等管理功能')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 保持授权状态
      tagsSorter: 'alpha', // 按字母顺序排序标签
      operationsSorter: 'alpha', // 按字母顺序排序操作
      docExpansion: 'none', // 默认不展开文档
      filter: true, // 启用过滤功能
      showRequestDuration: true, // 显示请求持续时间
    },
    customSiteTitle: '智能达人推荐系统 API 文档',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  // 获取端口
  const port = configService.get('PORT', 3000);

  // 启动应用
  await app.listen(port);

  logger.log(`省广星芒系统已启动，监听端口: ${port}`);
  logger.log(`健康检查: http://localhost:${port}/api/health`);
  logger.log(`API文档地址: http://localhost:${port}/api/docs`);
}

bootstrap();
