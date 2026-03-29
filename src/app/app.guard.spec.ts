import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, RouterStateSnapshot } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppStore } from '@entities/app';
import { CountryStore } from '@entities/country';
import { DepartmentStore } from '@entities/department';
import { JobTitleStore } from '@entities/job-title';
import { UsersStore } from '@entities/user';
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
    const usersStore = TestBed.inject(UsersStore);
    const resetSpy = vi.spyOn(usersStore, 'reset');

    // default currentAppId is 'acme', navigating to same app
    TestBed.runInInjectionContext(() => appSwitchGuard(makeRoute('acme'), fakeState));

    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('resets all entity stores when appId changes', () => {
    const appStore = TestBed.inject(AppStore);
    const usersStore = TestBed.inject(UsersStore);
    const countryStore = TestBed.inject(CountryStore);
    const deptStore = TestBed.inject(DepartmentStore);
    const jobStore = TestBed.inject(JobTitleStore);

    appStore.switchApp('acme'); // ensure we start at acme

    const usersReset = vi.spyOn(usersStore, 'reset');
    const countryReset = vi.spyOn(countryStore, 'reset');
    const deptReset = vi.spyOn(deptStore, 'reset');
    const jobReset = vi.spyOn(jobStore, 'reset');

    TestBed.runInInjectionContext(() => appSwitchGuard(makeRoute('globex'), fakeState));

    expect(usersReset).toHaveBeenCalledOnce();
    expect(countryReset).toHaveBeenCalledOnce();
    expect(deptReset).toHaveBeenCalledOnce();
    expect(jobReset).toHaveBeenCalledOnce();
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
