import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateUserDto, UpdateUserDto, User } from './user.model';

const BASE = '/api/users';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<User[]>(BASE);
  }

  getById(id: string) {
    return this.http.get<User>(`${BASE}/${id}`);
  }

  create(dto: CreateUserDto) {
    return this.http.post<User>(BASE, dto);
  }

  update(id: string, dto: UpdateUserDto) {
    return this.http.patch<User>(`${BASE}/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  checkEmailTaken(email: string, excludeId?: string) {
    return this.http.get<User[]>(`${BASE}?email=${encodeURIComponent(email)}`);
  }

  checkUsernameTaken(username: string, excludeId?: string) {
    return this.http.get<User[]>(`${BASE}?username=${encodeURIComponent(username)}`);
  }
}
