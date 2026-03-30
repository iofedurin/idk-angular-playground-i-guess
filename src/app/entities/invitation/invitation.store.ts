import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { addEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { lastValueFrom } from 'rxjs';
import { httpMutation, withAppScoped } from '@shared/lib';
import { CreateInvitationDto, Invitation } from './invitation.model';
import { InvitationApi } from './invitation-api';

interface InvitationState {
  loading: boolean;
  error: string | null;
}

export const InvitationStore = signalStore(
  { providedIn: 'root' },
  withEntities<Invitation>(),
  withState<InvitationState>({ loading: false, error: null }),
  withMethods((store, api = inject(InvitationApi)) => ({
    async loadAll(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const invitations = await lastValueFrom(api.getAll());
        patchState(store, setAllEntities(invitations), { loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load invitations' });
      }
    },

    async create(dto: CreateInvitationDto): Promise<Invitation | undefined> {
      const r = await httpMutation(api.create(dto));
      if (!r.ok) return;
      patchState(store, addEntity(r.data));
      return r.data;
    },

    reset(): void {
      patchState(store, setAllEntities([] as Invitation[]), { loading: false, error: null });
    },
  })),
  withAppScoped(),
);
