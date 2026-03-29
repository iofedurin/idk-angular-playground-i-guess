import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentStore } from './department.store';
import { Department } from './department.model';

const mockDepartments: Department[] = [
  { id: 'engineering', name: 'Engineering' },
  { id: 'design', name: 'Design' },
];

describe('DepartmentStore', () => {
  let store: InstanceType<typeof DepartmentStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(DepartmentStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has empty initial state', () => {
    expect(store.departments()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('load() fetches departments', async () => {
    const promise = store.load();
    httpMock.expectOne('/api/departments').flush(mockDepartments);
    await promise;

    expect(store.departments()).toEqual(mockDepartments);
    expect(store.loading()).toBe(false);
  });

  it('load() does not re-fetch when already loaded', async () => {
    const promise = store.load();
    httpMock.expectOne('/api/departments').flush(mockDepartments);
    await promise;

    await store.load();
    httpMock.expectNone('/api/departments');
  });

  it('load() sets error on HTTP failure', async () => {
    const promise = store.load();
    httpMock
      .expectOne('/api/departments')
      .flush('error', { status: 500, statusText: 'Server Error' });
    await promise;

    expect(store.error()).toBe('Failed to load departments');
  });

  it('reset() clears state and allows reload', async () => {
    const promise = store.load();
    httpMock.expectOne('/api/departments').flush(mockDepartments);
    await promise;

    store.reset();

    expect(store.departments()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();

    const promise2 = store.load();
    httpMock.expectOne('/api/departments').flush(mockDepartments);
    await promise2;

    expect(store.departments()).toHaveLength(2);
  });
});
