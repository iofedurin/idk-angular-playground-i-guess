import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { GLOBAL_REQUEST } from '@shared/lib';
import { CreateDepartmentDto, Department, UpdateDepartmentDto } from './department.model';

const BASE = '/api/departments';
const GLOBAL = new HttpContext().set(GLOBAL_REQUEST, true);

@Injectable({ providedIn: 'root' })
export class DepartmentApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Department[]>(BASE, { context: GLOBAL });
  }

  create(dto: CreateDepartmentDto) {
    return this.http.post<Department>(BASE, dto, { context: GLOBAL });
  }

  update(id: string, dto: UpdateDepartmentDto) {
    return this.http.patch<Department>(`${BASE}/${id}`, dto, { context: GLOBAL });
  }

  remove(id: string) {
    return this.http.delete<void>(`${BASE}/${id}`, { context: GLOBAL });
  }
}
