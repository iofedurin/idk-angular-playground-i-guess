import { inject } from '@angular/core';
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { AppStore } from '@entities/app';
/**
 * Mark a request as global (not app-scoped).
 * When set to `true`, appIdInterceptor skips adding `appId` to the request.
 * Use for reference data endpoints that are shared across all apps.
 */
export const GLOBAL_REQUEST = new HttpContextToken<boolean>(() => false);
export const appIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/') || req.context.get(GLOBAL_REQUEST)) {
    return next(req);
  }
  const appId = inject(AppStore).currentAppId();
  if (req.method === 'POST') {
    return next(req.clone({ body: { ...(req.body as object), appId } }));
  }
  if (req.method === 'GET') {
    return next(req.clone({ params: req.params.set('appId', appId) }));
  }
  return next(req);
};
