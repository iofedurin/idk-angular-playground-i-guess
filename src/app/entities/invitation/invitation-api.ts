import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateInvitationDto, Invitation } from './invitation.model';

const BASE = '/api/invitations';

@Injectable({ providedIn: 'root' })
export class InvitationApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Invitation[]>(BASE);
  }

  create(dto: CreateInvitationDto) {
    return this.http.post<Invitation>(BASE, dto);
  }
}
