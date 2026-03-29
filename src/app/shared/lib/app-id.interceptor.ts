import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AppStore } from '@entities/app';

export const appIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/users')) {
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
