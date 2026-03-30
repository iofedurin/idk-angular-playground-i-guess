import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, RouterStateSnapshot } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppStore } from '@entities/app';
import { AppScopeRegistry } from '@shared/lib/app-scope/app-scope-registry';
import { appSwitchGuard } from './app.guard';

function makeRoute(appId: string): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap({ appId }),
  } as unknown as ActivatedRouteSnapshot;
}

const fakeState = {} as RouterStateSnapshot;

describe('appSwitchGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('always returns true', () => {
    const result = TestBed.runInInjectionContext(() =>
      appSwitchGuard(makeRoute('acme'), fakeState),
    );
    expect(result).toBe(true);
  });

  it('does NOT reset stores when appId is unchanged', () => {
    const registry = TestBed.inject(AppScopeRegistry);
    const resetAllSpy = vi.spyOn(registry, 'resetAll');

    // default currentAppId is 'acme', navigating to same app
    TestBed.runInInjectionContext(() => appSwitchGuard(makeRoute('acme'), fakeState));

    expect(resetAllSpy).not.toHaveBeenCalled();
  });

  it('calls registry.resetAll() when appId changes', () => {
    const appStore = TestBed.inject(AppStore);
    const registry = TestBed.inject(AppScopeRegistry);

    appStore.switchApp('acme'); // ensure we start at acme

    const resetAllSpy = vi.spyOn(registry, 'resetAll');

    TestBed.runInInjectionContext(() => appSwitchGuard(makeRoute('globex'), fakeState));

    expect(resetAllSpy).toHaveBeenCalledOnce();
  });

  it('updates AppStore.currentAppId after switch', () => {
    const appStore = TestBed.inject(AppStore);

    TestBed.runInInjectionContext(() => appSwitchGuard(makeRoute('globex'), fakeState));

    expect(appStore.currentAppId()).toBe('globex');
  });

  it('does NOT update appId when navigating to the same app', () => {
    const appStore = TestBed.inject(AppStore);
    const switchSpy = vi.spyOn(appStore, 'switchApp');

    TestBed.runInInjectionContext(() => appSwitchGuard(makeRoute('acme'), fakeState));

    expect(switchSpy).not.toHaveBeenCalled();
  });
});
