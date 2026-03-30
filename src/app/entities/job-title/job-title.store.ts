import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import { withAppScoped } from '@shared/lib/with-app-scoped';
import { JobTitle } from './job-title.model';
import { JobTitleApi } from './job-title-api';

interface JobTitleState {
  jobTitles: JobTitle[];
  loading: boolean;
  error: string | null;
}

export const JobTitleStore = signalStore(
  { providedIn: 'root' },
  withState<JobTitleState>({ jobTitles: [], loading: false, error: null }),
  withMethods((store, api = inject(JobTitleApi)) => ({
    async load(): Promise<void> {
      if (store.jobTitles().length) return;
      patchState(store, { loading: true, error: null });
      try {
        const jobTitles = await lastValueFrom(api.getAll());
        patchState(store, { jobTitles, loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load job titles' });
      }
    },

    reset(): void {
      patchState(store, { jobTitles: [], loading: false, error: null });
    },
  })),
  withAppScoped(),
);
