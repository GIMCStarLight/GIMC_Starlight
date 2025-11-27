import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import {
  WorkOrder,
  WorkOrderStatus,
} from '../../database/entities/work-order.entity';
import {
  WorkOrderLog,
  WorkOrderLogAction,
} from '../../database/entities/work-order-log.entity';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
  AssignWorkOrderDto,
  QueryWorkOrderDto,
  CreateWorkOrderLogDto,
} from './dto';

@Injectable()
export class WorkOrderService {
  constructor(
    @InjectRepository(WorkOrder, 'postgres')
    private readonly workOrderRepository: Repository<WorkOrder>,
    @InjectRepository(WorkOrderLog, 'postgres')
    private readonly workOrderLogRepository: Repository<WorkOrderLog>,
  ) {}

  /**
   * 创建工单
   */
  async create(
    createDto: CreateWorkOrderDto,
    userId: string,
  ): Promise<WorkOrder> {
    // 创建工单
    const workOrder = this.workOrderRepository.create({
      ...createDto,
      createdBy: userId,
      status: WorkOrderStatus.PENDING,
    });

    const savedWorkOrder = await this.workOrderRepository.save(workOrder);

    // 记录创建日志
    await this.createLog({
      workOrderId: savedWorkOrder.id,
      action: WorkOrderLogAction.CREATE,
      content: '创建工单',
      metadata: { title: savedWorkOrder.title },
      userId,
    });

    return savedWorkOrder;
  }

  /**
   * 查询工单列表（分页）
   */
  async findAll(queryDto: QueryWorkOrderDto): Promise<{
    items: WorkOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      keyword,
      type,
      status,
      priority,
      createdBy,
      assignedTo,
      modules,
      createdAtStart,
      createdAtEnd,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.workOrderRepository
      .createQueryBuilder('workOrder')
      .leftJoinAndSelect('workOrder.creator', 'creator')
      .leftJoinAndSelect('workOrder.assignee', 'assignee')
      .leftJoinAndSelect('creator.profile', 'creatorProfile')
      .leftJoinAndSelect('assignee.profile', 'assigneeProfile');

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(workOrder.title LIKE :keyword OR workOrder.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 按类型筛选
    if (type) {
      queryBuilder.andWhere('workOrder.type = :type', { type });
    }

    // 按状态筛选
    if (status) {
      queryBuilder.andWhere('workOrder.status = :status', { status });
    }

    // 按优先级筛选
    if (priority) {
      queryBuilder.andWhere('workOrder.priority = :priority', { priority });
    }

    // 按创建人筛选
    if (createdBy) {
      queryBuilder.andWhere('workOrder.createdBy = :createdBy', { createdBy });
    }

    // 按处理人筛选
    if (assignedTo) {
      queryBuilder.andWhere('workOrder.assignedTo = :assignedTo', {
        assignedTo,
      });
    }

    // 按功能模块筛选
    if (modules && modules.length > 0) {
      queryBuilder.andWhere('workOrder.modules && :modules', {
        modules: modules,
      });
    }

    // 按创建时间范围筛选
    if (createdAtStart && createdAtEnd) {
      queryBuilder.andWhere(
        'workOrder.createdAt BETWEEN :start AND :end',
        {
          start: createdAtStart,
          end: createdAtEnd,
        },
      );
    } else if (createdAtStart) {
      queryBuilder.andWhere('workOrder.createdAt >= :start', {
        start: createdAtStart,
      });
    } else if (createdAtEnd) {
      queryBuilder.andWhere('workOrder.createdAt <= :end', {
        end: createdAtEnd,
      });
    }

    // 排序
    queryBuilder.orderBy(
      `workOrder.${sortBy}`,
      sortOrder as 'ASC' | 'DESC',
    );

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 根据ID查询工单详情
   */
  async findOne(id: string): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepository.findOne({
      where: { id },
      relations: ['creator', 'creator.profile', 'assignee', 'assignee.profile'],
    });

    if (!workOrder) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    return workOrder;
  }

  /**
   * 更新工单
   */
  async update(
    id: string,
    updateDto: UpdateWorkOrderDto,
    userId: string,
  ): Promise<WorkOrder> {
    const workOrder = await this.findOne(id);

    // 更新工单信息
    Object.assign(workOrder, updateDto);
    const updatedWorkOrder = await this.workOrderRepository.save(workOrder);

    // 记录更新日志
    await this.createLog({
      workOrderId: id,
      action: WorkOrderLogAction.UPDATE,
      content: '更新工单信息',
      metadata: updateDto,
      userId,
    });

    return updatedWorkOrder;
  }

  /**
   * 更新工单状态
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateWorkOrderStatusDto,
    userId: string,
  ): Promise<WorkOrder> {
    const workOrder = await this.findOne(id);
    const oldStatus = workOrder.status;
    const newStatus = updateStatusDto.status;

    // 验证状态转换的合法性
    this.validateStatusTransition(oldStatus, newStatus);

    // 更新状态
    workOrder.status = newStatus;

    // 根据状态更新相应的时间戳
    const now = new Date();
    switch (newStatus) {
      case WorkOrderStatus.RECEIVED:
        workOrder.receivedAt = now;
        break;
      case WorkOrderStatus.IN_PROGRESS:
        workOrder.startedAt = now;
        break;
      case WorkOrderStatus.COMPLETED:
        workOrder.completedAt = now;
        break;
    }

    const updatedWorkOrder = await this.workOrderRepository.save(workOrder);

    // 记录状态变更日志
    await this.createLog({
      workOrderId: id,
      action: WorkOrderLogAction.STATUS_CHANGE,
      content: updateStatusDto.comment || `状态从 ${oldStatus} 变更为 ${newStatus}`,
      metadata: { oldStatus, newStatus },
      userId,
      oldStatus,
      newStatus,
    });

    return updatedWorkOrder;
  }

  /**
   * 分配工单
   */
  async assign(
    id: string,
    assignDto: AssignWorkOrderDto,
    userId: string,
  ): Promise<WorkOrder> {
    const workOrder = await this.findOne(id);
    const oldAssignee = workOrder.assignedTo;
    const newAssignee = assignDto.assignedTo;

    workOrder.assignedTo = newAssignee;
    const updatedWorkOrder = await this.workOrderRepository.save(workOrder);

    // 记录分配日志
    await this.createLog({
      workOrderId: id,
      action: WorkOrderLogAction.ASSIGN,
      content: assignDto.comment || `分配给新的处理人`,
      metadata: { oldAssignee, newAssignee },
      userId,
      oldAssignee,
      newAssignee,
    });

    return updatedWorkOrder;
  }

  /**
   * 删除工单
   */
  async remove(id: string, userId: string): Promise<void> {
    const workOrder = await this.findOne(id);

    // 只有创建人可以删除未接收的工单
    if (
      workOrder.createdBy !== userId &&
      workOrder.status !== WorkOrderStatus.PENDING
    ) {
      throw new BadRequestException('只能删除未接收的自己创建的工单');
    }

    await this.workOrderRepository.remove(workOrder);
  }

  /**
   * 获取工单日志
   */
  async getLogs(workOrderId: string): Promise<WorkOrderLog[]> {
    return this.workOrderLogRepository.find({
      where: { workOrderId },
      relations: ['operator', 'operator.profile'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 获取工单统计信息
   */
  async getStatistics(userId?: string): Promise<{
    total: number;
    pending: number;
    received: number;
    inProgress: number;
    completed: number;
    myCreated: number;
    assignedToMe: number;
  }> {
    const queryBuilder = this.workOrderRepository.createQueryBuilder('workOrder');

    const total = await queryBuilder.getCount();

    const pending = await queryBuilder
      .clone()
      .where('workOrder.status = :status', { status: WorkOrderStatus.PENDING })
      .getCount();

    const received = await queryBuilder
      .clone()
      .where('workOrder.status = :status', { status: WorkOrderStatus.RECEIVED })
      .getCount();

    const inProgress = await queryBuilder
      .clone()
      .where('workOrder.status = :status', {
        status: WorkOrderStatus.IN_PROGRESS,
      })
      .getCount();

    const completed = await queryBuilder
      .clone()
      .where('workOrder.status = :status', {
        status: WorkOrderStatus.COMPLETED,
      })
      .getCount();

    let myCreated = 0;
    let assignedToMe = 0;

    if (userId) {
      myCreated = await queryBuilder
        .clone()
        .where('workOrder.createdBy = :userId', { userId })
        .getCount();

      assignedToMe = await queryBuilder
        .clone()
        .where('workOrder.assignedTo = :userId', { userId })
        .getCount();
    }

    return {
      total,
      pending,
      received,
      inProgress,
      completed,
      myCreated,
      assignedToMe,
    };
  }

  /**
   * 创建工单日志（私有方法）
   */
  private async createLog(logData: {
    workOrderId: string;
    action: WorkOrderLogAction;
    content?: string;
    metadata?: Record<string, any>;
    userId: string;
    oldStatus?: WorkOrderStatus;
    newStatus?: WorkOrderStatus;
    oldAssignee?: string;
    newAssignee?: string;
  }): Promise<WorkOrderLog> {
    const log = this.workOrderLogRepository.create({
      workOrderId: logData.workOrderId,
      action: logData.action,
      content: logData.content,
      metadata: logData.metadata,
      createdBy: logData.userId,
      oldStatus: logData.oldStatus,
      newStatus: logData.newStatus,
      oldAssignee: logData.oldAssignee,
      newAssignee: logData.newAssignee,
    });

    return this.workOrderLogRepository.save(log);
  }

  /**
   * 验证状态转换的合法性
   */
  private validateStatusTransition(
    oldStatus: WorkOrderStatus,
    newStatus: WorkOrderStatus,
  ): void {
    const validTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
      [WorkOrderStatus.PENDING]: [
        WorkOrderStatus.RECEIVED,
        WorkOrderStatus.REJECTED,
        WorkOrderStatus.CANCELLED,
      ],
      [WorkOrderStatus.RECEIVED]: [
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.REJECTED,
        WorkOrderStatus.CANCELLED,
      ],
      [WorkOrderStatus.IN_PROGRESS]: [
        WorkOrderStatus.TESTING,
        WorkOrderStatus.COMPLETED,
        WorkOrderStatus.CANCELLED,
      ],
      [WorkOrderStatus.TESTING]: [
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.COMPLETED,
      ],
      [WorkOrderStatus.COMPLETED]: [],
      [WorkOrderStatus.REJECTED]: [],
      [WorkOrderStatus.CANCELLED]: [],
    };

    const allowedStatuses = validTransitions[oldStatus];
    if (!allowedStatuses || !allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `不能从状态 ${oldStatus} 转换到 ${newStatus}`,
      );
    }
  }
}
