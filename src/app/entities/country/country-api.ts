import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Country } from './country.model';

@Injectable({ providedIn: 'root' })
export class CountryApi {
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Country[]>('/api/countries');
  }
}
