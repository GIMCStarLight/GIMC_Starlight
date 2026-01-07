import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { KolMatchService } from '../services/kol-match.service';
import {
  BatchMatchDto,
  ConfirmMatchDto,
  RejectMatchDto,
  QueryMatchesDto,
  BatchMatchResponseDto,
  MatchResultResponseDto,
  MatchStatisticsDto,
} from '../dto/match.dto';
import {
  ApiResponse as CustomApiResponse,
  PaginatedResponse,
  ValidationErrorResponse,
} from '../dto/response.dto';
import {
  KolNotFoundException,
  MatchNotFoundException,
  KolMatchException,
} from '../exceptions/kol-match.exception';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('KOL匹配管理')
@Controller('kol-match')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class KolMatchController {
  private readonly logger = new Logger(KolMatchController.name);

  constructor(private readonly kolMatchService: KolMatchService) {}

  @Get()
  @Permissions('kol:match:view')
  @ApiOperation({ summary: '查询匹配结果' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询匹配结果成功',
    type: PaginatedResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
    type: ValidationErrorResponse,
  })
  async queryMatches(
    @Query() queryDto: QueryMatchesDto,
    @Request() req: { headers: Record<string, string> },
  ): Promise<CustomApiResponse<PaginatedResponse<any>>> {
    const requestId = req.headers['x-request-id'] || `query-${Date.now()}`;

    try {
      this.logger.log(
        `查询匹配结果，请求ID: ${requestId}，参数: ${JSON.stringify(queryDto)}`,
      );

      const result = await this.kolMatchService.queryMatches(queryDto);

      return CustomApiResponse.success(result, '查询匹配结果成功', requestId);
    } catch (error) {
      this.logger.error('查询匹配结果失败', error);
      throw new KolMatchException(
        error instanceof Error ? error.message : '查询匹配结果失败',
      );
    }
  }

  @Post('batch')
  @Permissions('kol:match:operate')
  @ApiOperation({ summary: '批量匹配私域达人' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量匹配成功',
    type: BatchMatchResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
    type: ValidationErrorResponse,
  })
  async batchMatch(
    @Body() batchMatchDto: BatchMatchDto,
    @Request() req: { headers: Record<string, string> },
  ): Promise<CustomApiResponse<BatchMatchResponseDto>> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `batch-${Date.now()}`;

    try {
      this.logger.log(`开始批量匹配，请求ID: ${requestId}`);

      const results = await this.kolMatchService.batchMatchPrivateKols({
        batchSize: batchMatchDto.batchSize,
        minConfidence: batchMatchDto.minConfidence,
        enableCache: batchMatchDto.enableCache,
        platforms: batchMatchDto.platforms,
      });

      const processingTime = Date.now() - startTime;
      const successMatched = results.filter(
        (r) => r.totalCandidates > 0,
      ).length;

      const response: BatchMatchResponseDto = {
        results,
        totalProcessed: results.length,
        successMatched,
        processingTime,
      };

      this.logger.log(
        `批量匹配完成，处理${results.length}个达人，成功匹配${successMatched}个，耗时${processingTime}ms`,
      );

      return CustomApiResponse.success(response, '批量匹配完成', requestId);
    } catch (error) {
      this.logger.error('批量匹配失败', error);
      throw new KolMatchException(
        error instanceof Error ? error.message : '批量匹配失败',
      );
    }
  }

  @Get(':privateKolId/candidates')
  @Permissions('kol:match:view')
  @ApiOperation({ summary: '获取单个达人的匹配候选' })
  @ApiParam({ name: 'privateKolId', description: '私域达人ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取匹配候选成功',
    type: MatchResultResponseDto,
  })
  async getMatchCandidates(
    @Param('privateKolId') privateKolId: number,
    @Request() req: { headers: Record<string, string> },
    @Query('minConfidence') minConfidence?: number,
  ): Promise<CustomApiResponse<MatchResultResponseDto>> {
    const requestId = req.headers['x-request-id'] || `candidates-${Date.now()}`;

    try {
      const result = await this.kolMatchService.matchSingleKol(
        privateKolId,
        minConfidence,
      );

      return CustomApiResponse.success(result, '获取匹配候选成功', requestId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw new KolNotFoundException(privateKolId);
      }
      throw new KolMatchException(
        error instanceof Error ? error.message : '获取匹配候选失败',
      );
    }
  }

  @Put(':privateKolId/confirm')
  @Permissions('kol:match:operate')
  @ApiOperation({ summary: '确认匹配' })
  @ApiParam({ name: 'privateKolId', description: '私域达人ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '确认匹配成功',
  })
  async confirmMatch(
    @Param('privateKolId') privateKolId: number,
    @Body() confirmMatchDto: ConfirmMatchDto,
    @Request() req: { headers: Record<string, string>; user?: { id: number } },
  ): Promise<CustomApiResponse<null>> {
    const requestId = req.headers['x-request-id'] || `confirm-${Date.now()}`;
    const userId = req.user?.id;

    if (!userId) {
      throw new KolMatchException('用户信息不存在', HttpStatus.UNAUTHORIZED);
    }

    try {
      await this.kolMatchService.confirmMatch(
        privateKolId,
        confirmMatchDto.publicAuthorId,
        userId,
        confirmMatchDto.remark,
      );

      return CustomApiResponse.success(null, '确认匹配成功', requestId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw new MatchNotFoundException(
          privateKolId,
          confirmMatchDto.publicAuthorId,
        );
      }
      throw new KolMatchException(
        error instanceof Error ? error.message : '确认匹配失败',
      );
    }
  }

  @Put(':privateKolId/reject')
  @Permissions('kol:match:operate')
  @ApiOperation({ summary: '拒绝匹配' })
  @ApiParam({ name: 'privateKolId', description: '私域达人ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '拒绝匹配成功',
  })
  async rejectMatch(
    @Param('privateKolId') privateKolId: number,
    @Body() rejectMatchDto: RejectMatchDto,
    @Request() req: { headers: Record<string, string>; user?: { id: number } },
  ): Promise<CustomApiResponse<null>> {
    const requestId = req.headers['x-request-id'] || `reject-${Date.now()}`;
    const userId = req.user?.id;

    if (!userId) {
      throw new KolMatchException('用户信息不存在', HttpStatus.UNAUTHORIZED);
    }

    try {
      await this.kolMatchService.rejectMatch(
        privateKolId,
        rejectMatchDto.publicAuthorId,
        userId,
        rejectMatchDto.remark,
      );

      return CustomApiResponse.success(null, '拒绝匹配成功', requestId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw new MatchNotFoundException(
          privateKolId,
          rejectMatchDto.publicAuthorId,
        );
      }
      throw new KolMatchException(
        error instanceof Error ? error.message : '拒绝匹配失败',
      );
    }
  }

  @Get('list')
  @Permissions('kol:match:view')
  @ApiOperation({ summary: '获取匹配列表' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取匹配列表成功',
  })
  async getMatchList(
    @Query() queryDto: QueryMatchesDto,
    @Request() req: { headers: Record<string, string> },
  ): Promise<CustomApiResponse<PaginatedResponse<any>>> {
    const requestId = req.headers['x-request-id'] || `list-${Date.now()}`;

    try {
      // 这里需要实现获取匹配列表的逻辑
      // 暂时返回空数据
      await Promise.resolve(); // 避免async警告
      const result = new PaginatedResponse(
        [],
        queryDto.page || 1,
        queryDto.limit || 20,
        0,
      );

      return CustomApiResponse.success(result, '获取匹配列表成功', requestId);
    } catch (error) {
      throw new KolMatchException(
        error instanceof Error ? error.message : '获取匹配列表失败',
      );
    }
  }

  @Get('statistics')
  @Permissions('kol:match:view')
  @ApiOperation({ 
    summary: '获取匹配统计信息',
    description: '获取私域达人与公海达人的匹配统计数据，包括匹配率、平台分布等',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取统计信息成功',
    type: MatchStatisticsDto,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: '服务器内部错误',
  })
  async getMatchStatistics(
    @Request() req: { headers: Record<string, string> },
  ): Promise<CustomApiResponse<MatchStatisticsDto>> {
    const requestId = req.headers['x-request-id'] || `stats-${Date.now()}`;

    try {
      // 这里需要实现获取统计信息的逻辑
      // 暂时返回模拟数据
      await Promise.resolve(); // 避免async警告
      const statistics: MatchStatisticsDto = {
        totalPrivateKols: 0,
        matchedCount: 0,
        pendingCount: 0,
        unmatchedCount: 0,
        matchRate: 0,
      };

      return CustomApiResponse.success(
        statistics,
        '获取统计信息成功',
        requestId,
      );
    } catch (error) {
      throw new KolMatchException(
        error instanceof Error ? error.message : '获取统计信息失败',
      );
    }
  }
}
