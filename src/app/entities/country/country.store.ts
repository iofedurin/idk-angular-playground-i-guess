import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import { withAppScoped } from '@shared/lib';
import { Country } from './country.model';
import { CountryApi } from './country-api';

interface CountryState {
  countries: Country[];
  loading: boolean;
  error: string | null;
}

export const CountryStore = signalStore(
  { providedIn: 'root' },
  withState<CountryState>({ countries: [], loading: false, error: null }),
  withMethods((store, api = inject(CountryApi)) => ({
    async load(): Promise<void> {
      if (store.countries().length) return;
      patchState(store, { loading: true, error: null });
      try {
        const countries = await lastValueFrom(api.getAll());
        patchState(store, { countries, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load countries' });
      }
    },

    reset(): void {
      patchState(store, { countries: [], loading: false, error: null });
    },
  })),
  withAppScoped(),
);
