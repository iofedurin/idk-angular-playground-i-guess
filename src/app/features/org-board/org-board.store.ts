import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { lastValueFrom } from 'rxjs';
import { httpMutation, withAppScoped } from '@shared/lib';
import { OrgBoardApi } from './org-board.api';
import type { BoardPosition } from './org-board.model';

export const OrgBoardStore = signalStore(
  { providedIn: 'root' },
  withEntities<BoardPosition>(),
  withState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  }),
  withComputed(({ entities }) => ({
    positionByUserId: computed(() => {
      const map = new Map<string, BoardPosition>();
      for (const pos of entities()) map.set(pos.userId, pos);
      return map;
    }),
    userIdsOnBoard: computed(() => new Set(entities().map((p) => p.userId))),
  })),
  withMethods((store, api = inject(OrgBoardApi)) => ({
    async loadPositions(): Promise<void> {
      if (store.entities().length) return;
      patchState(store, { loading: true, error: null });
      try {
        const positions = await lastValueFrom(api.getPositions());
        patchState(store, setAllEntities(positions), { loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load board positions' });
      }
    },

    async addToBoard(userId: string, x: number, y: number): Promise<BoardPosition | undefined> {
      const r = await httpMutation(api.createPosition(userId, x, y));
      if (!r.ok) return undefined;
      patchState(store, addEntity(r.data));
      return r.data;
    },

    async updatePosition(positionId: string, x: number, y: number): Promise<boolean> {
      const r = await httpMutation(api.updatePosition(positionId, x, y));
      if (!r.ok) return false;
      patchState(store, updateEntity({ id: positionId, changes: { x, y } }));
      return true;
    },

    async removeFromBoard(positionId: string): Promise<boolean> {
      const r = await httpMutation(api.removePosition(positionId));
      if (!r.ok) return false;
      patchState(store, removeEntity(positionId));
      return true;
    },

    async bulkUpdatePositions(updates: { id: string; x: number; y: number }[]): Promise<boolean> {
      const r = await httpMutation(api.bulkUpdatePositions(updates));
      if (!r.ok) return false;
      for (const pos of r.data) {
        patchState(store, updateEntity({ id: pos.id, changes: { x: pos.x, y: pos.y } }));
      }
      return true;
    },

    reset(): void {
      patchState(store, setAllEntities([] as BoardPosition[]), {
        loading: false,
        error: null,
      });
    },
  })),
  withAppScoped(),
);
