import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, RouteReuseStrategy, withRouterConfig } from '@angular/router';
import { appIdInterceptor } from '@shared/lib/app-id.interceptor';
import { errorInterceptor } from '@shared/lib/error.interceptor';

import { AppRouteReuseStrategy } from './app-route-reuse-strategy';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withInterceptors([appIdInterceptor, errorInterceptor])),
    { provide: RouteReuseStrategy, useClass: AppRouteReuseStrategy },
  ],
};
