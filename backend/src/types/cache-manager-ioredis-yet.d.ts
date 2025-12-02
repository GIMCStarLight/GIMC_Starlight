declare module 'cache-manager-ioredis-yet' {
  import { RedisOptions } from 'ioredis';
  import { Store } from 'cache-manager';

  export interface RedisStoreOptions extends RedisOptions {
    ttl?: number;
  }

  export function redisStore(options: RedisStoreOptions): Promise<Store>;
}
