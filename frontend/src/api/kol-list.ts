import { requestClient } from '#/api/request'

export interface CreateKolListDto {
  platform: string
  account_name: string
  account_id: string
  home_link: string
  followers_w: number
  org_name?: string
  category?: string
  star_quote_21_60s?: number
  star_quote_60s_plus?: number
  is_exclusive?: number
  rebate_policy?: number
  rebate_range?: string
  policy_level?: string
  rebate_period?: string
  pay_period?: string
  remark?: string
}

export interface BatchCreateKolListDto {
  kols: CreateKolListDto[]
}

export interface BatchCreateResult {
  successCount: number
  failedCount: number
  failedItems: Array<{
    index: number
    data: CreateKolListDto
    error: string
  }>
  createdItems: any[]
}

export async function batchCreateKolListApi(data: BatchCreateKolListDto) {
  return requestClient.post<BatchCreateResult>('kol-list/batch', data)
}