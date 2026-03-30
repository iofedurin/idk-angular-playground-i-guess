import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateDepartmentDto, Department, UpdateDepartmentDto } from './department.model';

const BASE = '/api/departments';

@Injectable({ providedIn: 'root' })
export class DepartmentApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Department[]>(BASE);
  }

  create(dto: CreateDepartmentDto) {
    return this.http.post<Department>(BASE, dto);
  }

  update(id: string, dto: UpdateDepartmentDto) {
    return this.http.patch<Department>(`${BASE}/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}
