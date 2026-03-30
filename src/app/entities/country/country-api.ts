import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { GLOBAL_REQUEST } from '@shared/lib';
import { Country } from './country.model';

const GLOBAL = new HttpContext().set(GLOBAL_REQUEST, true);

@Injectable({ providedIn: 'root' })
export class CountryApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Country[]>('/api/countries', { context: GLOBAL });
  }
}
