import { TestBed } from '@angular/core/testing';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { AppScopeRegistry } from './app-scope-registry';
import { withAppScoped } from './with-app-scoped';

const TestStore = signalStore(
  { providedIn: 'root' },
  withState({ value: 42 }),
  withMethods((store) => ({
    reset() {
      patchState(store, { value: 0 });
    },
  })),
  withAppScoped(),
);

describe('withAppScoped()', () => {
  it('registers store in AppScopeRegistry on inject', () => {
    const registry = TestBed.inject(AppScopeRegistry);
    const registerSpy = vi.spyOn(registry, 'register');

    TestBed.inject(TestStore);

    expect(registerSpy).toHaveBeenCalledOnce();
  });

  it('registry.resetAll() resets registered store state', () => {
    const store = TestBed.inject(TestStore);
    const registry = TestBed.inject(AppScopeRegistry);

    registry.resetAll();

    expect(store.value()).toBe(0);
  });
});
