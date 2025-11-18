import type { Request as ExpressRequest } from 'express';

/**
 * JWT载荷用户信息
 */
export interface JwtUser {
  userId: string;
  username?: string;
  email?: string;
  phone?: string;
  name?: string;
  roles: string[];
  permissions: string[];
  jti?: string;
  sessionId?: string;
}

/**
 * 认证后的请求对象
 */
export interface AuthenticatedRequest extends ExpressRequest {
  user: JwtUser;
}
