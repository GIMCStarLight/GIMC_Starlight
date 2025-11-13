import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class QueryTransformPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'query' && value) {
      console.log('QueryTransformPipe - 原始参数:', value);

      // 创建新的对象，避免修改原始对象
      const transformedValue = { ...value };

      // 转换布尔值参数
      if (transformedValue.isActive !== undefined) {
        if (
          transformedValue.isActive === 'true' ||
          transformedValue.isActive === '1'
        ) {
          transformedValue.isActive = true;
        } else if (
          transformedValue.isActive === 'false' ||
          transformedValue.isActive === '0'
        ) {
          transformedValue.isActive = false;
        }
      }

      // 转换数字参数
      if (transformedValue.page !== undefined) {
        transformedValue.page = parseInt(transformedValue.page, 10) || 1;
      }
      if (transformedValue.limit !== undefined) {
        transformedValue.limit = parseInt(transformedValue.limit, 10) || 10;
      }
      if (
        transformedValue.parentId !== undefined &&
        transformedValue.parentId !== ''
      ) {
        transformedValue.parentId = parseInt(transformedValue.parentId, 10);
      }
      if (
        transformedValue.level !== undefined &&
        transformedValue.level !== ''
      ) {
        transformedValue.level = parseInt(transformedValue.level, 10);
      }

      // 转换布尔值参数
      if (transformedValue.includeChildren !== undefined) {
        if (
          transformedValue.includeChildren === 'true' ||
          transformedValue.includeChildren === '1'
        ) {
          transformedValue.includeChildren = true;
        } else if (
          transformedValue.includeChildren === 'false' ||
          transformedValue.includeChildren === '0'
        ) {
          transformedValue.includeChildren = false;
        }
      }
      if (transformedValue.rootOnly !== undefined) {
        if (
          transformedValue.rootOnly === 'true' ||
          transformedValue.rootOnly === '1'
        ) {
          transformedValue.rootOnly = true;
        } else if (
          transformedValue.rootOnly === 'false' ||
          transformedValue.rootOnly === '0'
        ) {
          transformedValue.rootOnly = false;
        }
      }

      // 保留字符串参数（name, platform等）
      if (transformedValue.name !== undefined && transformedValue.name !== '') {
        transformedValue.name = transformedValue.name;
      }
      if (
        transformedValue.platform !== undefined &&
        transformedValue.platform !== ''
      ) {
        transformedValue.platform = transformedValue.platform;
      }

      // 清理空字符串，但保留有效的参数
      Object.keys(transformedValue).forEach((key) => {
        if (transformedValue[key] === '' || transformedValue[key] === null) {
          delete transformedValue[key];
        }
      });

      console.log('QueryTransformPipe - 转换后的参数:', transformedValue);
      return transformedValue;
    }
    return value;
  }
}
