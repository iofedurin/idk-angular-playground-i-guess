import { AppScopeRegistry } from './app-scope-registry';

describe('AppScopeRegistry', () => {
  let registry: AppScopeRegistry;

  beforeEach(() => {
    registry = new AppScopeRegistry();
  });

  it('register() adds store to registry', () => {
    const store = { reset: vi.fn() };
    registry.register(store);
    registry.resetAll();
    expect(store.reset).toHaveBeenCalledOnce();
  });

  it('resetAll() calls reset() on all registered stores', () => {
    const a = { reset: vi.fn() };
    const b = { reset: vi.fn() };
    registry.register(a);
    registry.register(b);
    registry.resetAll();
    expect(a.reset).toHaveBeenCalledOnce();
    expect(b.reset).toHaveBeenCalledOnce();
  });

  it('resetAll() works with empty registry', () => {
    expect(() => registry.resetAll()).not.toThrow();
  });

  it('register() does not duplicate the same store (Set)', () => {
    const store = { reset: vi.fn() };
    registry.register(store);
    registry.register(store);
    registry.resetAll();
    expect(store.reset).toHaveBeenCalledOnce();
  });
});
