import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { GLOBAL_REQUEST } from '@shared/lib';
import { JobTitle } from './job-title.model';

const GLOBAL = new HttpContext().set(GLOBAL_REQUEST, true);

@Injectable({ providedIn: 'root' })
export class JobTitleApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<JobTitle[]>('/api/job-titles', { context: GLOBAL });
  }
}
