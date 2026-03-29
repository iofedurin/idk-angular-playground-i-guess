import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AppStore } from '@entities/app';
import { CountryStore } from '@entities/country';
import { DepartmentStore } from '@entities/department';
import { JobTitleStore } from '@entities/job-title';
import { UsersStore } from '@entities/user';

export const appSwitchGuard: CanActivateFn = (route) => {
  const appId = route.paramMap.get('appId')!;
  const appStore = inject(AppStore);

  if (appStore.currentAppId() !== appId) {
    inject(UsersStore).reset();
    inject(CountryStore).reset();
    inject(DepartmentStore).reset();
    inject(JobTitleStore).reset();
    appStore.switchApp(appId);
  }

  return true;
};
