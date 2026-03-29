import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import { Department } from './department.model';
import { DepartmentApi } from './department-api';

interface DepartmentState {
  departments: Department[];
  loading: boolean;
  error: string | null;
}

export const DepartmentStore = signalStore(
  { providedIn: 'root' },
  withState<DepartmentState>({ departments: [], loading: false, error: null }),
  withMethods((store, api = inject(DepartmentApi)) => ({
    async load(): Promise<void> {
      if (store.departments().length) return;
      patchState(store, { loading: true, error: null });
      try {
        const departments = await lastValueFrom(api.getAll());
        patchState(store, { departments, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load departments' });
      }
    },
  })),
);
