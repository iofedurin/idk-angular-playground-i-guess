import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Department } from './department.model';

@Injectable({ providedIn: 'root' })
export class DepartmentApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Department[]>('/api/departments');
  }
}
