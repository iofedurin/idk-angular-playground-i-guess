import { computed, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import { GLOBAL_REQUEST } from '@shared/lib';
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
      try {
        const apps = await lastValueFrom(
          http.get<App[]>('/api/apps', { context: new HttpContext().set(GLOBAL_REQUEST, true) }),
        );
        patchState(store, { apps });
      } catch {
        // Deviation from store-pattern (no loading/error state):
        // AppStore is infrastructure, not a domain entity. Workspace switcher
        // degrades gracefully — shows appId as fallback name. No user-facing
        // error state needed; retrying on next navigation via cache check.
      }
    },
    switchApp(appId: string): void {
      patchState(store, { currentAppId: appId });
    },
  })),
);
