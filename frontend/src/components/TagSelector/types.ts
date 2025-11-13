export interface TagSelectorProps {
  /** 默认选中的标签 */
  modelValue?: Tag[]
  /** 默认平台 */
  defaultPlatform?: string
  /** 是否多选 */
  multiple?: boolean
  /** 最大选择数量 */
  maxCount?: number
  /** 是否显示平台选择器 */
  showPlatformSelector?: boolean
}

export interface TagSelectorEmits {
  (e: 'update:modelValue', value: Tag[]): void
  (e: 'change', value: Tag[]): void
  (e: 'confirm', value: Tag[]): void
  (e: 'cancel'): void
}

export interface TagTreeNode extends Tag {
  children?: TagTreeNode[]
  /** 完整路径，用于显示层级关系 */
  fullPath?: string
  /** 是否展开 */
  expanded?: boolean
}

export interface Tag {
  id: number
  name: string
  code?: string
  description?: string
  platform: string
  level: number
  parentId?: number
  sort?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TagQueryParams {
  page?: number
  limit?: number
  platform?: string
  parentId?: number
  name?: string
  level?: number
  includeChildren?: boolean
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface PaginatedTagResponse {
  data: Tag[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateTagDto {
  name: string
  code?: string
  description?: string
  platform: string
  parentId?: number
  sort?: number
}

export interface UpdateTagDto extends Partial<CreateTagDto> {
  isActive?: boolean
}

/** 平台选项 */
export const PLATFORM_OPTIONS = [
  { label: '星图', value: '星图' },
  { label: '花火', value: '花火' },
  { label: '蒲公英', value: '蒲公英' }
] as const

export type PlatformType = typeof PLATFORM_OPTIONS[number]['value']