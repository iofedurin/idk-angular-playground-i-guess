import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JobTitle } from './job-title.model';

@Injectable({ providedIn: 'root' })
export class JobTitleApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<JobTitle[]>('/api/job-titles');
  }
}
