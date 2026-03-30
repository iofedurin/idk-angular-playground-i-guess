import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { addEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { lastValueFrom } from 'rxjs';
import { withAppScoped } from '@shared/lib/app-scope/with-app-scoped';
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

    async create(dto: CreateInvitationDto): Promise<Invitation> {
      const invitation = await lastValueFrom(api.create(dto));
      patchState(store, addEntity(invitation));
      return invitation;
    },

    reset(): void {
      patchState(store, setAllEntities([] as Invitation[]), { loading: false, error: null });
    },
  })),
  withAppScoped(),
);
