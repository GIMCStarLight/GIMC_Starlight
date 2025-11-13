import { requestClient } from './request';

export namespace SqlbotApi {
  /** SQLBot配置信息 */
  export interface SqlbotConfig {
    id?: string;
    domain: string;
    baseAssistantId: string;
    advancedAssistantId: string;
    embeddedAppId: string;
    embeddedAppSecret: string;
    aesEnable: boolean;
    aesKey?: string;
    enabled: boolean;
    createdAt?: string;
    updatedAt?: string;
  }

  /** 创建SQLBot配置参数 */
  export interface CreateSqlbotConfigParams {
    domain: string;
    baseAssistantId: string;
    advancedAssistantId: string;
    embeddedAppId: string;
    embeddedAppSecret: string;
    aesEnable: boolean;
    aesKey?: string;
  }

  /** 更新SQLBot配置参数 */
  export interface UpdateSqlbotConfigParams {
    domain?: string;
    baseAssistantId?: string;
    advancedAssistantId?: string;
    embeddedAppId?: string;
    embeddedAppSecret?: string;
    aesEnable?: boolean;
    aesKey?: string;
    enabled?: boolean;
  }

  /** 数据源信息 */
  export interface DataSource {
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    tables: Array<{
      name: string;
      comment?: string;
    }>;
  }

  /** SQLBot嵌入配置 */
  export interface EmbedConfig {
    domain: string;
    embeddedAppId: string;
    embeddedAppSecret: string;
    baseAssistantId: string;
    advancedAssistantId: string;
    aesEnable: boolean;
    aesKey?: string;
  }
}

/**
 * SQLBot API服务类
 */
class SqlbotApiService {
  /**
   * 获取SQLBot配置
   */
  async getConfig(): Promise<SqlbotApi.SqlbotConfig> {
    return requestClient.get<SqlbotApi.SqlbotConfig>('/sqlbot/config');
  }

  /**
   * 创建SQLBot配置
   */
  async createConfig(params: SqlbotApi.CreateSqlbotConfigParams): Promise<SqlbotApi.SqlbotConfig> {
    return requestClient.post<SqlbotApi.SqlbotConfig>('/sqlbot/config', params);
  }

  /**
   * 更新SQLBot配置
   */
  async updateConfig(id: string, params: SqlbotApi.UpdateSqlbotConfigParams): Promise<SqlbotApi.SqlbotConfig> {
    return requestClient.put<SqlbotApi.SqlbotConfig>(`/sqlbot/config/${id}`, params);
  }

  /**
   * 删除SQLBot配置
   */
  async deleteConfig(id: string): Promise<void> {
    return requestClient.delete(`/sqlbot/config/${id}`);
  }

  /**
   * 获取数据源列表
   */
  async getDatasources(): Promise<SqlbotApi.DataSource[]> {
    return requestClient.get<SqlbotApi.DataSource[]>('/sqlbot/datasources');
  }

  /**
   * 获取SQLBot嵌入配置（用于前端嵌入）
   */
  async getEmbedConfig(): Promise<SqlbotApi.EmbedConfig> {
    const config = await this.getConfig();
    return {
      domain: config.domain,
      embeddedAppId: config.embeddedAppId,
      embeddedAppSecret: config.embeddedAppSecret,
      baseAssistantId: config.baseAssistantId,
      advancedAssistantId: config.advancedAssistantId,
      aesEnable: config.aesEnable,
      aesKey: config.aesKey,
    };
  }

  /**
   * 从后端获取嵌入JWT Token
   */
  async getToken(params?: { account?: string }): Promise<{ token: string; appId: string; expiresIn: number }>{
    return requestClient.get('/sqlbot/token', { params });
  }
}

// 导出SQLBot API服务实例
export const sqlbotApi = new SqlbotApiService();