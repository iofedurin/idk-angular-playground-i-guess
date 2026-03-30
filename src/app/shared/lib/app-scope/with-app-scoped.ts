import { inject } from '@angular/core';
import { signalStoreFeature, withHooks } from '@ngrx/signals';
import { AppScopeRegistry, type Resettable } from './app-scope-registry';

export function withAppScoped() {
  return signalStoreFeature(
    withHooks((store) => {
      inject(AppScopeRegistry).register(store as unknown as Resettable);
      return {};
    }),
  );
}
