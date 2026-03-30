import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntities,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { lastValueFrom } from 'rxjs';
import { httpMutation } from '@shared/lib/http/http-mutation';
import { withAppScoped } from '@shared/lib/app-scope/with-app-scoped';
import { CreateUserDto, UpdateUserDto, User, UserPageParams } from './user.model';
import { UsersApi } from './user.api';

interface UsersState {
  loading: boolean;
  error: string | null;
  page: number;
  totalCount: number;
  totalPages: number;
}

export const UsersStore = signalStore(
  { providedIn: 'root' },
  withEntities<User>(),
  withState<UsersState>({ loading: false, error: null, page: 1, totalCount: 0, totalPages: 0 }),
  withMethods((store, api = inject(UsersApi)) => ({
    async loadAll(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const users = await lastValueFrom(api.getAll());
        patchState(store, setAllEntities(users), { loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load users' });
      }
    },

    async loadPage(params: UserPageParams): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const result = await lastValueFrom(api.getPage(params));
        patchState(store, setAllEntities(result.data), {
          loading: false,
          page: params.page,
          totalCount: result.items,
          totalPages: result.pages,
        });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load users' });
      }
    },

    async create(dto: CreateUserDto): Promise<User | undefined> {
      const r = await httpMutation(api.create(dto));
      if (!r.ok) return undefined;
      patchState(store, addEntity(r.data));
      return r.data;
    },

    async update(id: string, dto: UpdateUserDto): Promise<User | undefined> {
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

    async bulkRemove(ids: string[]): Promise<boolean> {
      const r = await httpMutation(api.bulkRemove(ids));
      if (!r.ok) return false;
      patchState(store, removeEntities(ids));
      return true;
    },

    async bulkUpdate(ids: string[], changes: UpdateUserDto): Promise<boolean> {
      const r = await httpMutation(api.bulkUpdate(ids, changes));
      if (!r.ok) return false;
      r.data.forEach((u) => patchState(store, updateEntity({ id: u.id, changes: u })));
      return true;
    },

    reset(): void {
      patchState(store, setAllEntities([] as User[]), {
        loading: false, error: null, page: 1, totalCount: 0, totalPages: 0,
      });
    },
  })),
  withAppScoped(),
);
