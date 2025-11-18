/**
 * SQL错误处理工具类
 * 统一处理PostgreSQL和MySQL的数据库错误
 */

// SQL错误接口定义
interface SqlLikeError {
  driverError?: SqlLikeError;
  code?: string | number;
  errno?: string | number;
  sqlMessage?: unknown;
  message?: unknown;
  sql?: unknown;
}

// 解析后的错误信息
export interface ParsedSqlError {
  code: string;
  message: string;
  columnHint: string;
  sql?: string;
}

/**
 * SQL错误处理工具类
 */
export class SqlErrorUtil {
  /**
   * 将未知错误转换为SQL错误对象
   * @param error 原始错误对象
   * @returns SQL错误对象
   */
  private static toSqlError(error: unknown): SqlLikeError {
    return typeof error === 'object' && error !== null
      ? (error as SqlLikeError)
      : {};
  }

  /**
   * 解析PostgreSQL/MySQL错误
   * @param error 原始错误对象
   * @returns 解析后的错误信息
   */
  static parseSqlError(error: unknown): ParsedSqlError {
    const err = this.toSqlError(error);
    const driverErr = err.driverError ?? err;
    
    // 提取错误代码
    const code = String(driverErr.code ?? driverErr.errno ?? '');
    
    // 提取错误消息
    const sqlMessageRaw = driverErr.sqlMessage ?? driverErr.message;
    const message = sqlMessageRaw ? String(sqlMessageRaw) : '';
    
    // 提取SQL语句
    const sql = driverErr.sql ? String(driverErr.sql) : undefined;
    
    // 解析列名提示
    const columnHint = this.parseColumnHint(message);

    return {
      code,
      message,
      columnHint,
      sql,
    };
  }

  /**
   * 从错误消息中解析列名提示
   * @param message SQL错误消息
   * @returns 列名提示字符串
   */
  private static parseColumnHint(message: string): string {
    // 数据超长错误: Data too long for column 'xxx'
    const tooLongMatch = /Data too long for column '(.*?)'/i.exec(message);
    if (tooLongMatch) {
      return `字段超长: ${tooLongMatch[1]}`;
    }

    // 字段不能为空: Column 'xxx' cannot be null
    const nullMatch = /Column '(.*?)' cannot be null/i.exec(message);
    if (nullMatch) {
      return `字段为空: ${nullMatch[1]}`;
    }

    // 唯一约束冲突: Duplicate entry '...' for key 'xxx'
    const dupMatch = /Duplicate entry .* for key '(.*?)'/i.exec(message);
    if (dupMatch) {
      return `唯一约束冲突: ${dupMatch[1]}`;
    }

    // 外键约束: Cannot add or update a child row: a foreign key constraint fails
    if (/foreign key constraint fails/i.test(message)) {
      return '外键约束失败';
    }

    // PostgreSQL 唯一约束: duplicate key value violates unique constraint "xxx"
    const pgDupMatch = /duplicate key value violates unique constraint "(.+?)"/i.exec(message);
    if (pgDupMatch) {
      return `唯一约束冲突: ${pgDupMatch[1]}`;
    }

    return '';
  }

  /**
   * 格式化错误信息为用户友好的字符串
   * @param error 原始错误对象
   * @returns 格式化后的错误信息
   */
  static formatErrorMessage(error: unknown): string {
    const parsed = this.parseSqlError(error);
    
    const parts: string[] = [];
    
    if (parsed.code) {
      parts.push(`错误代码=${parsed.code}`);
    }
    
    if (parsed.message) {
      parts.push(`原因=${parsed.message}`);
    }
    
    if (parsed.columnHint) {
      parts.push(`定位=${parsed.columnHint}`);
    }

    return parts.filter(Boolean).join(' | ') || '数据库操作失败';
  }

  /**
   * 判断是否为唯一约束冲突错误
   * @param error 错误对象
   * @returns 是否为唯一约束冲突
   */
  static isDuplicateError(error: unknown): boolean {
    const parsed = this.parseSqlError(error);
    return (
      parsed.code === '23505' || // PostgreSQL unique violation
      parsed.code === 'ER_DUP_ENTRY' || // MySQL duplicate entry
      /duplicate/i.test(parsed.message) ||
      /唯一约束冲突/.test(parsed.columnHint)
    );
  }

  /**
   * 判断是否为外键约束错误
   * @param error 错误对象
   * @returns 是否为外键约束错误
   */
  static isForeignKeyError(error: unknown): boolean {
    const parsed = this.parseSqlError(error);
    return (
      parsed.code === '23503' || // PostgreSQL foreign key violation
      /foreign key constraint/i.test(parsed.message)
    );
  }
}
