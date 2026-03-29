import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import { App } from './app.model';

interface AppState {
  currentAppId: string;
  apps: App[];
}

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState<AppState>({ currentAppId: 'acme', apps: [] }),
  withComputed((store) => ({
    currentAppName: computed(
      () => store.apps().find((a) => a.id === store.currentAppId())?.name ?? store.currentAppId(),
    ),
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    async loadApps(): Promise<void> {
      if (store.apps().length) return;
      const apps = await lastValueFrom(http.get<App[]>('/api/apps'));
      patchState(store, { apps });
    },
    switchApp(appId: string): void {
      patchState(store, { currentAppId: appId });
    },
  })),
);
