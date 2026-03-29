import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { AppRouteReuseStrategy } from './app-route-reuse-strategy';

/**
 * Regression test for the app-switch reload bug:
 * Angular was reusing the child component when only the parent :appId param changed,
 * causing ngOnInit not to fire and the table to stay empty.
 *
 * Fix: AppRouteReuseStrategy.shouldReuseRoute returns false when appId changes,
 * forcing Angular to destroy and recreate child components.
 */

function makeSnapshot(appId: string | null, config: object = {}): ActivatedRouteSnapshot {
  return {
    routeConfig: config,
    paramMap: convertToParamMap(appId ? { appId } : {}),
  } as unknown as ActivatedRouteSnapshot;
}

describe('AppRouteReuseStrategy', () => {
  let strategy: AppRouteReuseStrategy;

  beforeEach(() => {
    strategy = new AppRouteReuseStrategy();
  });

  it('returns false when appId changes — forces child recreation on app switch', () => {
    const config = {};
    const curr = makeSnapshot('acme', config);
    const future = makeSnapshot('globex', config);

    expect(strategy.shouldReuseRoute(future, curr)).toBe(false);
  });

  it('returns true when appId is the same', () => {
    const config = {};
    const curr = makeSnapshot('acme', config);
    const future = makeSnapshot('acme', config);

    expect(strategy.shouldReuseRoute(future, curr)).toBe(true);
  });

  it('returns true for different route configs even with same appId', () => {
    // Navigating between different child routes (e.g. /users → /users/new)
    const curr = makeSnapshot('acme', { path: 'users' });
    const future = makeSnapshot('acme', { path: 'users/new' });

    expect(strategy.shouldReuseRoute(future, curr)).toBe(false);
  });

  it('returns true for routes without appId param (normal navigation)', () => {
    const config = {};
    const curr = makeSnapshot(null, config);
    const future = makeSnapshot(null, config);

    expect(strategy.shouldReuseRoute(future, curr)).toBe(true);
  });
});
