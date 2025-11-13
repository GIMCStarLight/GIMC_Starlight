import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const username = configService.get('elasticsearch.username');
        const password = configService.get('elasticsearch.password');

        const config: any = {
          node: configService.get('elasticsearch.node'),
        };

        if (username && password) {
          config.auth = {
            username,
            password,
          };
        }

        return config;
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
