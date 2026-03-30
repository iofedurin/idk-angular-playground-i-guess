import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { lastValueFrom } from 'rxjs';
import { httpMutation } from '@shared/lib/http/http-mutation';
import { withAppScoped } from '@shared/lib/app-scope/with-app-scoped';
import { CreateDepartmentDto, Department, UpdateDepartmentDto } from './department.model';
import { DepartmentApi } from './department-api';

interface DepartmentState {
  loading: boolean;
  error: string | null;
}

export const DepartmentStore = signalStore(
  { providedIn: 'root' },
  withEntities<Department>(),
  withState<DepartmentState>({ loading: false, error: null }),
  withMethods((store, api = inject(DepartmentApi)) => ({
    async load(): Promise<void> {
      if (store.entities().length) return;
      patchState(store, { loading: true, error: null });
      try {
        const departments = await lastValueFrom(api.getAll());
        patchState(store, setAllEntities(departments), { loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load departments' });
      }
    },

    async create(dto: CreateDepartmentDto): Promise<Department | undefined> {
      const r = await httpMutation(api.create(dto));
      if (!r.ok) return undefined;
      patchState(store, addEntity(r.data));
      return r.data;
    },

    async update(id: string, dto: UpdateDepartmentDto): Promise<Department | undefined> {
      const r = await httpMutation(api.update(id, dto));
      if (!r.ok) return undefined;
      patchState(store, updateEntity({ id, changes: r.data }));
      return r.data;
    },

    async remove(id: string): Promise<boolean> {
      const r = await httpMutation(api.remove(id));
      if (!r.ok) return false;
      patchState(store, removeEntity(id));
      return true;
    },

    reset(): void {
      patchState(store, setAllEntities([] as Department[]), { loading: false, error: null });
    },
  })),
  withAppScoped(),
);
