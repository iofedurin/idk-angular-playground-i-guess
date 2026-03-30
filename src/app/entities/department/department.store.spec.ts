import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentStore } from './department.store';
import { Department } from './department.model';

const mockDepartments: Department[] = [
  { id: 'engineering', name: 'Engineering', group: 'Technology' },
  { id: 'design', name: 'Design', group: 'Technology' },
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
    expect(store.entities()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  describe('load()', () => {
    it('fetches departments on first call', async () => {
      const promise = store.load();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await promise;

      expect(store.entities()).toEqual(mockDepartments);
      expect(store.loading()).toBe(false);
    });

    it('does not re-fetch when already loaded', async () => {
      const promise = store.load();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await promise;

      await store.load();
      httpMock.expectNone('/api/departments');
    });

    it('sets error on HTTP failure', async () => {
      const promise = store.load();
      httpMock
        .expectOne('/api/departments')
        .flush('error', { status: 500, statusText: 'Server Error' });
      await promise;

      expect(store.error()).toBe('Failed to load departments');
    });
  });

  describe('loadAll()', () => {
    it('fetches departments', async () => {
      const promise = store.loadAll();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await promise;

      expect(store.entities()).toEqual(mockDepartments);
    });

    it('re-fetches even when already loaded', async () => {
      let promise = store.loadAll();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await promise;

      promise = store.loadAll();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await promise;

      expect(store.entities()).toHaveLength(2);
    });
  });

  describe('create()', () => {
    it('adds a new department', async () => {
      const newDept: Department = { id: 'marketing', name: 'Marketing', group: 'Business' };
      const promise = store.create({ name: 'Marketing', group: 'Business' });
      httpMock.expectOne('/api/departments').flush(newDept);
      const result = await promise;

      expect(result).toEqual(newDept);
      expect(store.entities()).toContainEqual(newDept);
    });
  });

  describe('update()', () => {
    it('updates an existing department', async () => {
      const loadPromise = store.loadAll();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await loadPromise;

      const updated: Department = { id: 'engineering', name: 'Engineering & QA', group: 'Technology' };
      const updatePromise = store.update('engineering', { name: 'Engineering & QA' });
      httpMock.expectOne('/api/departments/engineering').flush(updated);
      const result = await updatePromise;

      expect(result).toEqual(updated);
      expect(store.entityMap()['engineering']?.name).toBe('Engineering & QA');
    });
  });

  describe('remove()', () => {
    it('removes a department', async () => {
      const loadPromise = store.loadAll();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await loadPromise;

      const removePromise = store.remove('design');
      httpMock.expectOne('/api/departments/design').flush(null);
      await removePromise;

      expect(store.entities().map((d) => d.id)).not.toContain('design');
    });
  });

  describe('reset()', () => {
    it('clears state and allows reload', async () => {
      const promise = store.load();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await promise;

      store.reset();

      expect(store.entities()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();

      const promise2 = store.load();
      httpMock.expectOne('/api/departments').flush(mockDepartments);
      await promise2;

      expect(store.entities()).toHaveLength(2);
    });
  });
});
