import {
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
  ContextType,
  Type,
} from '@nestjs/common';
import {
  HttpArgumentsHost,
  RpcArgumentsHost,
  WsArgumentsHost,
} from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard (alias to common PermissionsGuard)', () => {
  type TestUser = {
    permissions?: string[];
    roles?: string[];
    username?: string;
    userId?: string;
  };

  function createGuardWithPermissions(required: string[], user?: TestUser) {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation(<T>() => required as unknown as T);

    const guard = new PermissionGuard(reflector);

    const req: { user?: TestUser } = { user };

    class HttpHostStub implements HttpArgumentsHost {
      constructor(private readonly r: { user?: TestUser }) {}
      getRequest<T = any>(): T {
        return this.r as unknown as T;
      }
      getResponse<T = any>(): T {
        return {} as T;
      }
      getNext<T = any>(): T {
        return undefined as T;
      }
    }

    class RpcHostStub implements RpcArgumentsHost {
      getData<T = any>(): T {
        return undefined as T;
      }
      getContext<T = any>(): T {
        return undefined as T;
      }
    }

    class WsHostStub implements WsArgumentsHost {
      getClient<T = any>(): T {
        return undefined as T;
      }
      getData<T = any>(): T {
        return undefined as T;
      }
      getPattern<T = any>(): T {
        return undefined as T;
      }
    }

    const httpHost = new HttpHostStub(req);
    const rpcHost = new RpcHostStub();
    const wsHost = new WsHostStub();

    class TestClass {}

    class ExecutionContextStub implements ExecutionContext {
      getHandler() {
        const handler: (...args: unknown[]) => unknown = () => undefined;
        return handler;
      }
      getClass<T = any>(): Type<T> {
        return TestClass as unknown as Type<T>;
      }
      switchToHttp(): HttpArgumentsHost {
        return httpHost;
      }
      getType<TContext extends string = ContextType>(): TContext {
        return 'http' as TContext;
      }
      getArgs<T extends Array<any> = any[]>(): T {
        return [] as unknown as T;
      }
      getArgByIndex<T = any>(index?: number): T {
        return undefined as T;
      }
      switchToRpc(): RpcArgumentsHost {
        return rpcHost;
      }
      switchToWs(): WsArgumentsHost {
        return wsHost;
      }
    }

    const context: ExecutionContext = new ExecutionContextStub();

    return { guard, context };
  }

  it('passes when user has all required permissions', () => {
    const { guard, context } = createGuardWithPermissions(['user:view'], {
      permissions: ['user:view', 'user:update'],
      roles: [],
      username: 'tester',
      userId: '1',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when user lacks required permissions', () => {
    const { guard, context } = createGuardWithPermissions(['user:delete'], {
      permissions: ['user:view'],
      roles: [],
      username: 'tester',
      userId: '1',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('returns true when no permissions are required', () => {
    const { guard, context } = createGuardWithPermissions([], {
      permissions: [],
      roles: [],
      username: 'tester',
      userId: '1',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when user is missing', () => {
    const { guard, context } = createGuardWithPermissions(['user:view']);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
