import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

// Helper to extract the factory function from a param decorator
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function getParamDecoratorFactory(decorator: Function) {
  // Create a test class with the decorator applied
  class TestClass {
    testMethod(@decorator() _value: unknown) {}
  }

  // Extract the metadata that was set by the decorator
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'testMethod');
  return args[Object.keys(args)[0]].factory;
}

describe('CurrentUser Decorator', () => {
  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const createMockContext = (user: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  it('should return the full user when no data key specified', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const ctx = createMockContext(mockUser);

    const result = factory(undefined, ctx);
    expect(result).toEqual(mockUser);
  });

  it('should return specific property when data key specified', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const ctx = createMockContext(mockUser);

    const result = factory('email', ctx);
    expect(result).toBe('test@example.com');
  });

  it('should return undefined when user is not set', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const ctx = createMockContext(undefined);

    const result = factory(undefined, ctx);
    expect(result).toBeUndefined();
  });

  it('should return undefined for non-existent property', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const ctx = createMockContext(mockUser);

    const result = factory('nonExistent', ctx);
    expect(result).toBeUndefined();
  });
});
