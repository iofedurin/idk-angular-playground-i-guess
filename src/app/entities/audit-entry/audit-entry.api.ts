import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuditPage } from './audit-entry.model';

const BASE = '/api/audit-log';
const PER_PAGE = 10;

@Injectable({ providedIn: 'root' })
export class AuditEntryApi {
  private readonly http = inject(HttpClient);

  getPage(page: number) {
    const params = new HttpParams()
      .set('_page', page)
      .set('_per_page', PER_PAGE);
    return this.http.get<AuditPage>(BASE, { params });
  }
}
