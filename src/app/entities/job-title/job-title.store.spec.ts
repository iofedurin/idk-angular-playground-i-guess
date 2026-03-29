import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JobTitleStore } from './job-title.store';
import { JobTitle } from './job-title.model';

const mockJobTitles: JobTitle[] = [
  { id: 'senior-frontend', name: 'Senior Frontend Engineer' },
  { id: 'tech-lead', name: 'Tech Lead' },
];

describe('JobTitleStore', () => {
  let store: InstanceType<typeof JobTitleStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(JobTitleStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has empty initial state', () => {
    expect(store.jobTitles()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('load() fetches job titles', async () => {
    const promise = store.load();
    httpMock.expectOne('/api/job-titles').flush(mockJobTitles);
    await promise;

    expect(store.jobTitles()).toEqual(mockJobTitles);
    expect(store.loading()).toBe(false);
  });

  it('load() does not re-fetch when already loaded', async () => {
    const promise = store.load();
    httpMock.expectOne('/api/job-titles').flush(mockJobTitles);
    await promise;

    await store.load();
    httpMock.expectNone('/api/job-titles');
  });

  it('load() sets error on HTTP failure', async () => {
    const promise = store.load();
    httpMock
      .expectOne('/api/job-titles')
      .flush('error', { status: 500, statusText: 'Server Error' });
    await promise;

    expect(store.error()).toBe('Failed to load job titles');
  });

  it('reset() clears state and allows reload', async () => {
    const promise = store.load();
    httpMock.expectOne('/api/job-titles').flush(mockJobTitles);
    await promise;

    store.reset();
    expect(store.jobTitles()).toEqual([]);

    const promise2 = store.load();
    httpMock.expectOne('/api/job-titles').flush(mockJobTitles);
    await promise2;

    expect(store.jobTitles()).toHaveLength(2);
  });
});
