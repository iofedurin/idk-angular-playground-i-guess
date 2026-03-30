import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AppStore } from '@entities/app';
import { AppScopeRegistry } from '@shared/lib';

export const appSwitchGuard: CanActivateFn = (route) => {
  const appId = route.paramMap.get('appId')!;
  const appStore = inject(AppStore);

  if (appStore.currentAppId() !== appId) {
    inject(AppScopeRegistry).resetAll();
    appStore.switchApp(appId);
  }

  return true;
};
