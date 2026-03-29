import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CountryStore } from './country.store';
import { Country } from './country.model';

const mockCountries: Country[] = [
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
];

describe('CountryStore', () => {
  let store: InstanceType<typeof CountryStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CountryStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has empty initial state', () => {
    expect(store.countries()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('load() fetches countries', async () => {
    const promise = store.load();
    expect(store.loading()).toBe(true);

    httpMock.expectOne('/api/countries').flush(mockCountries);
    await promise;

    expect(store.countries()).toEqual(mockCountries);
    expect(store.loading()).toBe(false);
  });

  it('load() does not re-fetch when already loaded', async () => {
    const promise = store.load();
    httpMock.expectOne('/api/countries').flush(mockCountries);
    await promise;

    await store.load();
    httpMock.expectNone('/api/countries');
  });

  it('load() sets error on HTTP failure', async () => {
    const promise = store.load();
    httpMock
      .expectOne('/api/countries')
      .flush('error', { status: 500, statusText: 'Server Error' });
    await promise;

    expect(store.error()).toBe('Failed to load countries');
    expect(store.countries()).toEqual([]);
  });

  it('reset() clears countries so next load() re-fetches', async () => {
    const promise = store.load();
    httpMock.expectOne('/api/countries').flush(mockCountries);
    await promise;

    expect(store.countries()).toHaveLength(2);

    store.reset();

    expect(store.countries()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();

    // cache guard is gone after reset — load() will re-fetch
    const promise2 = store.load();
    httpMock.expectOne('/api/countries').flush(mockCountries);
    await promise2;

    expect(store.countries()).toHaveLength(2);
  });
});
