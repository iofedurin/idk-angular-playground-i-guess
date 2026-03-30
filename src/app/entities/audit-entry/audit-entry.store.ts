import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import { AppStore } from '@entities/app';
import { AuditEntry } from './audit-entry.model';
import { AuditEntryApi } from './audit-entry.api';

interface AuditEntryState {
  entries: AuditEntry[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
}

export const AuditEntryStore = signalStore(
  { providedIn: 'root' },
  withState<AuditEntryState>({
    entries: [],
    loading: false,
    error: null,
    currentPage: 0,
    hasMore: true,
  }),
  withMethods((store, api = inject(AuditEntryApi), appStore = inject(AppStore)) => ({
    async loadPage(page: number): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const result = await lastValueFrom(api.getPage(page, appStore.currentAppId()));
        const entries = page === 1 ? result.data : [...store.entries(), ...result.data];
        patchState(store, {
          entries,
          loading: false,
          currentPage: page,
          hasMore: result.next !== null,
        });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load audit log' });
      }
    },

    reset(): void {
      patchState(store, {
        entries: [],
        loading: false,
        error: null,
        currentPage: 0,
        hasMore: true,
      });
    },
  })),
);
