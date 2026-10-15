/**
 * 将历史品牌名称转换为对外展示名称。
 *
 * 仅用于 UI 渲染；数据库字段、筛选参数与接口载荷必须继续使用原始值，
 * 否则会破坏已有机构数据的查询匹配。
 */
export function sanitizeBrandText(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value)
    .replace(/省广星芒/g, '星芒')
    .replace(/省广星媒/g, '星媒机构')
    .replace(/省广/g, '');
}
