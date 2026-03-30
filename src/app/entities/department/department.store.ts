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
  withMethods((store, api = inject(DepartmentApi)) => {
    const fetchAll = async (): Promise<void> => {
      patchState(store, { loading: true, error: null });
      try {
        const departments = await lastValueFrom(api.getAll());
        patchState(store, setAllEntities(departments), { loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load departments' });
      }
    };

    return {
      /** Cached load — used by DepartmentSelectComponent. */
      async load(): Promise<void> {
        if (store.entities().length) return;
        await fetchAll();
      },

      /** Always re-fetches — used by departments-list page. */
      loadAll: fetchAll,

      async create(dto: CreateDepartmentDto): Promise<Department> {
        const department = await lastValueFrom(api.create(dto));
        patchState(store, addEntity(department));
        return department;
      },

      async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
        const department = await lastValueFrom(api.update(id, dto));
        patchState(store, updateEntity({ id, changes: department }));
        return department;
      },

      async remove(id: string): Promise<void> {
        await lastValueFrom(api.remove(id));
        patchState(store, removeEntity(id));
      },

      reset(): void {
        patchState(store, setAllEntities([] as Department[]), { loading: false, error: null });
      },
    };
  }),
);
