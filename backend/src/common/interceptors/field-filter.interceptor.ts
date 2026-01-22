import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  FIELD_FILTER_KEY, 
  SKIP_FIELD_FILTER_KEY 
} from '../decorators/field-filter.decorator';
import {
  getAllowedFields,
  getFieldPermissionsByResource,
} from '../config/field-permissions.config';

/**
 * 字段级权限过滤拦截器
 * 根据用户权限自动过滤返回数据中的字段
 */
@Injectable()
export class FieldFilterInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FieldFilterInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否跳过字段过滤
    const skipFilter = this.reflector.getAllAndOverride<boolean>(
      SKIP_FIELD_FILTER_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    if (skipFilter) {
      return next.handle();
    }

    // 获取资源类型
    const resource = this.reflector.getAllAndOverride<'influencer' | 'kol'>(
      FIELD_FILTER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!resource) {
      return next.handle();
    }

    // 获取用户权限
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return next.handle();
    }

    // 获取用户的所有权限代码
    const userPermissions: string[] = this.extractUserPermissions(user);
    
    // 检查是否是超级管理员（拥有所有权限）
    if (this.isSuperAdmin(user, userPermissions)) {
      return next.handle();
    }

    // 获取允许的字段
    const allowedFields = getAllowedFields(userPermissions, resource);
    
    this.logger.debug(`用户 ${user.username || user.id} 对 ${resource} 资源允许访问的字段: ${allowedFields.length}个`);

    return next.handle().pipe(
      map(data => this.filterResponseFields(data, allowedFields, resource)),
    );
  }

  /**
   * 提取用户权限列表
   */
  private extractUserPermissions(user: any): string[] {
    const permissions: string[] = [];
    
    // 从用户对象中提取权限
    if (user.permissions && Array.isArray(user.permissions)) {
      user.permissions.forEach((p: any) => {
        if (typeof p === 'string') {
          permissions.push(p);
        } else if (p.code) {
          permissions.push(p.code);
        }
      });
    }
    
    // 从角色中提取权限
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach((role: any) => {
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach((p: any) => {
            if (typeof p === 'string') {
              permissions.push(p);
            } else if (p.code) {
              permissions.push(p.code);
            }
          });
        }
      });
    }
    
    return [...new Set(permissions)]; // 去重
  }

  /**
   * 检查是否是超级管理员
   */
  private isSuperAdmin(user: any, permissions: string[]): boolean {
    // 检查角色
    if (user.roles && Array.isArray(user.roles)) {
      const isSuperRole = user.roles.some((role: any) => 
        role.code === 'SUPER_ADMIN' || 
        role.name === '超级管理员' ||
        role.id === 1
      );
      if (isSuperRole) return true;
    }
    
    // 检查是否有通配符权限
    if (permissions.includes('*') || permissions.includes('*:*')) {
      return true;
    }
    
    return false;
  }

  /**
   * 过滤响应数据中的字段
   */
  private filterResponseFields(
    data: any,
    allowedFields: string[],
    resource: string,
  ): any {
    if (!data) return data;

    // 处理标准响应格式 { code, message, data }
    if (data.data !== undefined) {
      return {
        ...data,
        data: this.filterData(data.data, allowedFields, resource),
      };
    }

    // 处理分页响应格式 { items, total, page, ... }
    if (data.items !== undefined && Array.isArray(data.items)) {
      return {
        ...data,
        items: data.items.map((item: any) => 
          this.filterSingleObject(item, allowedFields)
        ),
      };
    }

    // 处理纯数组
    if (Array.isArray(data)) {
      return data.map(item => this.filterSingleObject(item, allowedFields));
    }

    // 处理单个对象
    return this.filterSingleObject(data, allowedFields);
  }

  /**
   * 过滤数据（支持数组和对象）
   */
  private filterData(data: any, allowedFields: string[], resource: string): any {
    if (!data) return data;

    // 处理分页数据
    if (data.items !== undefined && Array.isArray(data.items)) {
      return {
        ...data,
        items: data.items.map((item: any) => 
          this.filterSingleObject(item, allowedFields)
        ),
      };
    }

    // 处理数组
    if (Array.isArray(data)) {
      return data.map(item => this.filterSingleObject(item, allowedFields));
    }

    // 处理单个对象
    return this.filterSingleObject(data, allowedFields);
  }

  /**
   * 过滤单个对象的字段
   */
  private filterSingleObject(obj: any, allowedFields: string[]): any {
    if (!obj || typeof obj !== 'object') return obj;

    const filtered: any = {};
    const allowedSet = new Set(allowedFields.map(f => f.toLowerCase()));

    for (const [key, value] of Object.entries(obj)) {
      // 将驼峰和下划线格式都转为小写进行比较
      const keyLower = key.toLowerCase();
      const snakeKey = this.camelToSnake(key).toLowerCase();
      const camelKey = this.snakeToCamel(key).toLowerCase();
      
      // 检查字段是否允许
      if (
        allowedSet.has(keyLower) ||
        allowedSet.has(snakeKey) ||
        allowedSet.has(camelKey) ||
        this.isSystemField(key)
      ) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * 检查是否是系统字段（总是允许的字段）
   */
  private isSystemField(field: string): boolean {
    const systemFields = [
      'id', 'createdAt', 'created_at', 'updatedAt', 'updated_at',
      '_id', 'total', 'page', 'pageSize', 'limit', 'offset',
      'success', 'code', 'message', 'timestamp',
    ];
    return systemFields.includes(field);
  }

  /**
   * 驼峰转下划线
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 下划线转驼峰
   */
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
