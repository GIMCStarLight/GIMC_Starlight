import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../common/guards/auth.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { WorkOrderService } from './work-order.service';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
  AssignWorkOrderDto,
  QueryWorkOrderDto,
} from './dto';
import { ResponseUtil } from '../../common/utils/response.util';

@ApiTags('工单管理')
@Controller('work-orders')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  /**
   * 创建工单
   */
  @Post()
  @Permissions('work-order:create')
  @ApiOperation({ summary: '创建工单', description: '用户创建新的工单' })
  @ApiResponse({ status: 201, description: '工单创建成功' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateWorkOrderDto, @Req() req: any) {
    const userId = req.user.userId;
    const workOrder = await this.workOrderService.create(createDto, userId);
    return ResponseUtil.success(workOrder, '工单创建成功');
  }

  /**
   * 查询工单列表
   */
  @Get()
  @Permissions('work-order:view')
  @ApiOperation({
    summary: '查询工单列表',
    description: '分页查询工单列表，支持多条件筛选',
  })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findAll(@Query() queryDto: QueryWorkOrderDto) {
    const result = await this.workOrderService.findAll(queryDto);
    return ResponseUtil.success(result, '查询成功');
  }

  /**
   * 获取我创建的工单
   */
  @Get('my-created')
  @Permissions('work-order:view')
  @ApiOperation({ summary: '获取我创建的工单' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getMyCreated(@Query() queryDto: QueryWorkOrderDto, @Req() req: any) {
    const userId = req.user.userId;
    queryDto.createdBy = userId;
    const result = await this.workOrderService.findAll(queryDto);
    return ResponseUtil.success(result, '查询成功');
  }

  /**
   * 获取分配给我的工单
   */
  @Get('assigned-to-me')
  @Permissions('work-order:view')
  @ApiOperation({ summary: '获取分配给我的工单' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getAssignedToMe(@Query() queryDto: QueryWorkOrderDto, @Req() req: any) {
    const userId = req.user.userId;
    queryDto.assignedTo = userId;
    const result = await this.workOrderService.findAll(queryDto);
    return ResponseUtil.success(result, '查询成功');
  }

  /**
   * 获取工单统计信息
   */
  @Get('statistics')
  @Permissions('work-order:view')
  @ApiOperation({ summary: '获取工单统计信息' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getStatistics(@Req() req: any) {
    const userId = req.user.userId;
    const statistics = await this.workOrderService.getStatistics(userId);
    return ResponseUtil.success(statistics, '查询成功');
  }

  /**
   * 根据ID查询工单详情
   */
  @Get(':id')
  @Permissions('work-order:view')
  @ApiOperation({ summary: '查询工单详情' })
  @ApiParam({ name: 'id', description: '工单ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findOne(@Param('id') id: string) {
    const workOrder = await this.workOrderService.findOne(id);
    return ResponseUtil.success(workOrder, '查询成功');
  }

  /**
   * 更新工单
   */
  @Put(':id')
  @Permissions('work-order:update')
  @ApiOperation({ summary: '更新工单', description: '更新工单基本信息' })
  @ApiParam({ name: 'id', description: '工单ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkOrderDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const workOrder = await this.workOrderService.update(id, updateDto, userId);
    return ResponseUtil.success(workOrder, '更新成功');
  }

  /**
   * 更新工单状态
   */
  @Put(':id/status')
  @Permissions('work-order:update-status')
  @ApiOperation({ summary: '更新工单状态' })
  @ApiParam({ name: 'id', description: '工单ID' })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateWorkOrderStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const workOrder = await this.workOrderService.updateStatus(
      id,
      updateStatusDto,
      userId,
    );
    return ResponseUtil.success(workOrder, '状态更新成功');
  }

  /**
   * 分配工单
   */
  @Put(':id/assign')
  @Permissions('work-order:assign')
  @ApiOperation({ summary: '分配工单', description: '将工单分配给指定处理人' })
  @ApiParam({ name: 'id', description: '工单ID' })
  @ApiResponse({ status: 200, description: '分配成功' })
  async assign(
    @Param('id') id: string,
    @Body() assignDto: AssignWorkOrderDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const workOrder = await this.workOrderService.assign(id, assignDto, userId);
    return ResponseUtil.success(workOrder, '分配成功');
  }

  /**
   * 删除工单
   */
  @Delete(':id')
  @Permissions('work-order:delete')
  @ApiOperation({ summary: '删除工单' })
  @ApiParam({ name: 'id', description: '工单ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    await this.workOrderService.remove(id, userId);
    return ResponseUtil.success(null, '删除成功');
  }

  /**
   * 获取工单日志
   */
  @Get(':id/logs')
  @Permissions('work-order:view')
  @ApiOperation({ summary: '获取工单日志', description: '获取工单的所有操作日志' })
  @ApiParam({ name: 'id', description: '工单ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getLogs(@Param('id') id: string) {
    const logs = await this.workOrderService.getLogs(id);
    return ResponseUtil.success(logs, '查询成功');
  }
}
