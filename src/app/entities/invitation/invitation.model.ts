export type InviteRole = 'viewer' | 'editor' | 'admin';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface Invitation {
  id: string;
  email: string;
  role: InviteRole;
  status: InvitationStatus;
  createdAt: string;
  appId: string;
}

export interface InviteFormModel {
  email: string;
  role: InviteRole;
}

export type CreateInvitationDto = { email: string; role: InviteRole; appId: string };
