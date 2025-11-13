import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SourceAccountService } from './source-account.service';
import { PlatformType } from '../../common/enums/platform-type.enum';

@ApiTags('来源账户映射')
@Controller('source-account')
export class SourceAccountController {
  constructor(private readonly sourceAccountService: SourceAccountService) {}

  @Get('platform/:platform/uid/:uid')
  @ApiOperation({ summary: '根据平台UID查找来源账户' })
  @ApiResponse({ status: 200, description: '查找成功' })
  async findByPlatformUid(
    @Param('platform') platform: PlatformType,
    @Param('uid') uid: string,
    @Query('sourceType') sourceType?: string,
  ) {
    const sourceAccount = await this.sourceAccountService.findByPlatformUid(
      platform,
      uid,
      sourceType,
    );

    return {
      success: true,
      data: sourceAccount,
      message: sourceAccount ? '查找成功' : '未找到对应的来源账户',
    };
  }

  @Get('influencer/:influencerId')
  @ApiOperation({ summary: '根据达人ID查找所有来源账户' })
  @ApiResponse({ status: 200, description: '查找成功' })
  async findByInfluencerId(@Param('influencerId') influencerId: string) {
    const sourceAccounts =
      await this.sourceAccountService.findByInfluencerId(influencerId);

    return {
      success: true,
      data: sourceAccounts,
      message: '查找成功',
    };
  }

  @Get('xingtu/:xingtuId/influencer')
  @ApiOperation({ summary: '根据星图ID查找达人ID' })
  @ApiResponse({ status: 200, description: '查找成功' })
  async findInfluencerByXingtuId(@Param('xingtuId') xingtuId: string) {
    const influencerId =
      await this.sourceAccountService.findInfluencerIdByXingtuId(xingtuId);

    return {
      success: true,
      data: { influencerId },
      message: influencerId ? '查找成功' : '未找到对应的达人',
    };
  }

  @Post()
  @ApiOperation({ summary: '创建或更新来源账户映射' })
  @ApiResponse({ status: 201, description: '创建/更新成功' })
  async createOrUpdate(
    @Body()
    data: {
      influencerId: string;
      sourceType: string;
      sourcePlatform: PlatformType;
      platformUid: string;
      extraInfo?: Record<string, any>;
    },
  ) {
    const sourceAccount = await this.sourceAccountService.createOrUpdate(data);

    return {
      success: true,
      data: sourceAccount,
      message: '创建/更新成功',
    };
  }
}
