/**
 * 时间工具类
 * 提供时间格式转换和解析功能
 */
export class TimeUtil {
  /**
   * 将时间字符串转换为秒数
   * @param timeStr 时间字符串 (格式: 数字+单位, 如 "4h", "15m", "7d")
   * @returns 转换后的秒数，默认返回14400秒(4小时)
   * @example
   * TimeUtil.parseTimeToSeconds('30s') // 30
   * TimeUtil.parseTimeToSeconds('15m') // 900
   * TimeUtil.parseTimeToSeconds('4h')  // 14400
   * TimeUtil.parseTimeToSeconds('7d')  // 604800
   */
  static parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 14400; // 默认4小时
    }

    const [, num, unit] = match;
    const value = parseInt(num, 10);

    const units: Record<string, number> = {
      s: 1,       // 秒
      m: 60,      // 分钟
      h: 3600,    // 小时
      d: 86400,   // 天
    };

    return value * (units[unit] || 3600);
  }

  /**
   * 将秒数转换为可读的时间字符串
   * @param seconds 秒数
   * @returns 可读的时间字符串
   * @example
   * TimeUtil.formatSeconds(90)     // "1分30秒"
   * TimeUtil.formatSeconds(3600)   // "1小时"
   * TimeUtil.formatSeconds(86400)  // "1天"
   */
  static formatSeconds(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (secs > 0) parts.push(`${secs}秒`);

    return parts.join('') || '0秒';
  }
}
