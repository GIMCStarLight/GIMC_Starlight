import { requestClient, baseRequestClient } from '#/api/request'

export interface CreateSupplierDto {
  // 基础信息
  supplier_full_name: string                  // 供应商全称
  agency_name?: string                        // 机构名
  supplier_type?: string                      // 供应商性质
  supplier_short_name?: string                // 供应商简称
  supplier_english_name?: string              // 供应商英文名
  supplier_website?: string                   // 供应商官网
  supplier_description?: string               // 供应商简介

  // 政策与财务
  current_policy_gradient?: string            // 当前政策梯度
  tax_rate_percent?: number                   // 税率(%)
  payment_term?: string                       // 账期
  settlement_method?: string                  // 结算方式
  billing_entity?: string                     // 开票主体
  collection_entity?: string                  // 收款主体

  // 年度政策
  policy_2024_gradient?: string               // 2024政策梯度
  cooperation_mode_2024?: string              // 2024合作模式
  notes_2024?: string                         // 2024备注
  policy_2025_gradient?: string               // 2025政策梯度
  cooperation_mode_2025?: string              // 2025合作模式
  notes_2025?: string                         // 2025备注

  // 联系人信息
  primary_contact_name?: string               // 一级对接人
  primary_contact_phone_wechat?: string       // 联系方式
  secondary_contact_name?: string             // 二级对接人
  secondary_contact_phone_wechat?: string     // 二级联系方式
  tertiary_contact_name?: string              // 三级对接人
  tertiary_contact_phone_wechat?: string      // 三级联系方式

  // 合同信息
  contract_follow_up_person?: string          // 跟进人
  contract_status?: string                    // 合同状态
  contract_start_date?: string                // 合同开始日期
  contract_end_date?: string                  // 合同结束日期
  contract_notes?: string                     // 合同备注

  // 资源信息
  resource_type?: string                      // 资源类型
  main_platform?: string                     // 主要平台
  is_proxy_order?: boolean                    // 是否代下单
  resource_notes?: string                     // 资源备注

  // 创建人信息
  created_by?: string                         // 创建人
}

export interface SupplierInfo extends CreateSupplierDto {
  id: number
}

export interface BatchCreateSupplierDto {
  suppliers: CreateSupplierDto[]
}

export interface BatchCreateResult {
  successCount: number
  failedCount: number
  failedItems: Array<{
    index: number
    data: CreateSupplierDto
    error: string
  }>
  createdItems: SupplierInfo[]
}

export interface SupplierListParams {
  page?: number
  limit?: number
  // 筛选参数（与后端DTO保持一致）
  search?: string                         // 通用搜索（供应商名称或机构名）
  supplier_type?: string                  // 供应商性质：集采、独代、独代+集采
  is_proxy_order?: boolean                // 是否代下单
  contract_follow_up_person?: string      // 跟进人
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface SupplierListResult {
  data: SupplierInfo[]
  pagination: PaginationInfo
}

/**
 * 获取供应商列表
 * 使用 baseRequestClient 以保留完整的响应数据（包括 pagination）
 */
export async function getSupplierListApi(params?: SupplierListParams) {
  const response = await baseRequestClient.get<any>('/supplier-database', {
    params,
  })
  
  log.debug('🔍 [API] 原始响应:', response)
  log.debug('🔍 [API] response.data:', response?.data)
  
  // baseRequestClient 返回完整的 AxiosResponse
  // response.data 就是后端返回的 {code, message, data, pagination}
  if (response?.data) {
    const { code, data, pagination } = response.data
    
    if (code === 200 || code === 201) {
      return {
        data: data || [],
        pagination: pagination || { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false }
      } as SupplierListResult
    }
  }
  
  // 兜底返回
  return {
    data: [],
    pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false }
  } as SupplierListResult
}

/**
 * 获取供应商详情
 */
export async function getSupplierDetailApi(id: number) {
  return requestClient.get<SupplierInfo>(`/supplier-database/${id}`)
}

/**
 * 创建供应商
 */
export async function createSupplierApi(data: CreateSupplierDto) {
  return requestClient.post<SupplierInfo>('/supplier-database', data)
}

/**
 * 更新供应商
 */
export async function updateSupplierApi(id: number, data: Partial<CreateSupplierDto>) {
  return requestClient.put<SupplierInfo>(`/supplier-database/${id}`, data)
}

/**
 * 删除供应商
 */
export async function deleteSupplierApi(id: number) {
  return requestClient.delete(`/supplier-database/${id}`)
}

/**
 * 批量删除供应商
 */
export async function batchDeleteSuppliersApi(ids: number[]) {
  return requestClient.delete('/supplier-database/batch', { data: { ids } })
}

/**
 * 批量创建供应商
 */
export async function batchCreateSupplierApi(data: BatchCreateSupplierDto) {
  return requestClient.post<BatchCreateResult>('/supplier-database/batch', data)
}

/**
 * 下载供应商导入模板
 */
export async function downloadSupplierTemplateApi() {
  return requestClient.get('/supplier-database/template/download', {
    responseType: 'blob',
    responseReturn: 'body',
  })
}
