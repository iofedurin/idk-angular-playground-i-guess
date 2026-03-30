import type { UserRole } from '@entities/user/@x/invitation';

export type { UserRole as InviteRole };
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  createdAt: string;
  appId: string;
}

export interface InviteFormModel {
  email: string;
  role: UserRole;
}

export type CreateInvitationDto = { email: string; role: UserRole; appId: string };
