import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CreateUserDto, PER_PAGE, UpdateUserDto, User, UserPageParams, UsersPage } from './user.model';

const BASE = '/api/users';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<User[]>(BASE);
  }

  getPage(params: UserPageParams) {
    let p = new HttpParams().set('_page', params.page).set('_per_page', PER_PAGE);
    if (params.q) p = p.set('q', params.q);
    if (params.role) p = p.set('role', params.role);
    if (params.department) p = p.set('department', params.department);
    if (params.country) p = p.set('country', params.country);
    if (params.jobTitle) p = p.set('jobTitle', params.jobTitle);
    if (params.active) p = p.set('active', params.active);
    if (params.sortField) {
      const sortParam = params.sortOrder === 'desc' ? `-${params.sortField}` : params.sortField;
      p = p.set('_sort', sortParam);
    }
    return this.http.get<UsersPage>(BASE, { params: p });
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

  bulkRemove(ids: string[]) {
    return this.http.post<void>(`${BASE}/bulk-delete`, { ids });
  }

  bulkUpdate(ids: string[], changes: UpdateUserDto) {
    return this.http.patch<User[]>(`${BASE}/bulk-update`, { ids, changes });
  }

  checkEmailTaken(email: string, excludeId?: string) {
    return this.http.get<User[]>(`${BASE}?email=${encodeURIComponent(email)}`);
  }

  checkUsernameTaken(username: string, excludeId?: string) {
    return this.http.get<User[]>(`${BASE}?username=${encodeURIComponent(username)}`);
  }
}
