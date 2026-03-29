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
import { CreateUserDto, UpdateUserDto, User } from './user.model';
import { UsersApi } from './user.api';

interface UsersState {
  loading: boolean;
  error: string | null;
}

export const UsersStore = signalStore(
  { providedIn: 'root' },
  withEntities<User>(),
  withState<UsersState>({ loading: false, error: null }),
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

    async create(dto: CreateUserDto): Promise<User> {
      const user = await lastValueFrom(api.create(dto));
      patchState(store, addEntity(user));
      return user;
    },

    async update(id: string, dto: UpdateUserDto): Promise<User> {
      const user = await lastValueFrom(api.update(id, dto));
      patchState(store, updateEntity({ id, changes: user }));
      return user;
    },

    async remove(id: string): Promise<void> {
      await lastValueFrom(api.remove(id));
      patchState(store, removeEntity(id));
    },
  })),
);
