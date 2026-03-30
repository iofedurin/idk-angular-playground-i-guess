import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersStore } from './user.store';
import { User, UsersPage } from './user.model';

const makePage = (data: User[], next: number | null = null, total = data.length): UsersPage => ({
  data, items: total, pages: Math.max(1, Math.ceil(total / 10)),
  first: 1, prev: null, next, last: Math.max(1, Math.ceil(total / 10)),
});

const mockUser: User = {
  id: '1',
  username: 'jdoe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 30,
  country: 'US',
  department: 'engineering',
  jobTitle: 'senior-frontend',
  role: 'editor',
  active: true,
  bio: '',
};

describe('UsersStore', () => {
  let store: InstanceType<typeof UsersStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(UsersStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has empty initial state', () => {
    expect(store.entities()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('loadAll() sets loading=true immediately, then populates entities', async () => {
    const promise = store.loadAll();
    expect(store.loading()).toBe(true);

    httpMock.expectOne((req) => req.url.includes('/api/users')).flush([mockUser]);
    await promise;

    expect(store.loading()).toBe(false);
    expect(store.entities()).toEqual([mockUser]);
    expect(store.error()).toBeNull();
  });

  it('loadAll() sets error on HTTP failure', async () => {
    const promise = store.loadAll();
    httpMock
      .expectOne((req) => req.url.includes('/api/users'))
      .flush('Server Error', { status: 500, statusText: 'Server Error' });
    await promise;

    expect(store.error()).toBe('Failed to load users');
    expect(store.entities()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('create() posts dto and adds entity', async () => {
    const { id: _id, ...dto } = mockUser;
    const createPromise = store.create(dto);

    httpMock.expectOne((r) => r.url.includes('/api/users') && r.method === 'POST').flush(mockUser);
    const created = await createPromise;

    expect(store.entities()).toContainEqual(mockUser);
    expect(created).toEqual(mockUser);
  });

  it('update() patches entity in store', async () => {
    const loadPromise = store.loadAll();
    httpMock.expectOne((req) => req.url.includes('/api/users')).flush([mockUser]);
    await loadPromise;

    const updated = { ...mockUser, username: 'johndoe' };
    const updatePromise = store.update('1', { username: 'johndoe' });
    httpMock.expectOne((r) => r.url.includes('/api/users/1') && r.method === 'PATCH').flush(updated);
    await updatePromise;

    expect(store.entityMap()['1'].username).toBe('johndoe');
  });

  it('remove() deletes entity from store', async () => {
    const loadPromise = store.loadAll();
    httpMock.expectOne((req) => req.url.includes('/api/users')).flush([mockUser]);
    await loadPromise;

    const removePromise = store.remove('1');
    httpMock.expectOne((r) => r.url.includes('/api/users/1') && r.method === 'DELETE').flush(null);
    await removePromise;

    expect(store.entities()).toEqual([]);
  });

  it('reset() clears entities and resets state', async () => {
    const loadPromise = store.loadAll();
    httpMock.expectOne((req) => req.url.includes('/api/users')).flush([mockUser]);
    await loadPromise;

    expect(store.entities()).toHaveLength(1);
    store.reset();

    expect(store.entities()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.page()).toBe(1);
    expect(store.totalCount()).toBe(0);
    expect(store.totalPages()).toBe(0);
  });

  it('reset() after error also clears error', async () => {
    const promise = store.loadAll();
    httpMock
      .expectOne((req) => req.url.includes('/api/users'))
      .flush('error', { status: 500, statusText: 'Server Error' });
    await promise;

    expect(store.error()).toBeTruthy();
    store.reset();
    expect(store.error()).toBeNull();
  });

  describe('loadPage()', () => {
    it('sets loading=true immediately, then replaces entities', async () => {
      const promise = store.loadPage({ page: 1 });
      expect(store.loading()).toBe(true);

      httpMock.expectOne((r) => r.url === '/api/users').flush(makePage([mockUser], 2, 25));
      await promise;

      expect(store.loading()).toBe(false);
      expect(store.entities()).toEqual([mockUser]);
      expect(store.page()).toBe(1);
      expect(store.totalCount()).toBe(25);
      expect(store.totalPages()).toBe(3);
    });

    it('replaces (not appends) entities on page change', async () => {
      const p1 = store.loadPage({ page: 1 });
      httpMock.expectOne((r) => r.url === '/api/users').flush(makePage([mockUser], 2, 25));
      await p1;

      const mockUser2: User = { ...mockUser, id: '2', username: 'bsmith' };
      const p2 = store.loadPage({ page: 2 });
      httpMock.expectOne((r) => r.url === '/api/users').flush(makePage([mockUser2], null, 25));
      await p2;

      expect(store.entities()).toEqual([mockUser2]);
      expect(store.page()).toBe(2);
    });

    it('sets error on failure', async () => {
      const p = store.loadPage({ page: 1 });
      httpMock
        .expectOne((r) => r.url === '/api/users')
        .flush('error', { status: 500, statusText: 'Server Error' });
      await p;

      expect(store.error()).toBe('Failed to load users');
      expect(store.loading()).toBe(false);
    });

    it('sends _sort and _order params when provided', async () => {
      const p = store.loadPage({ page: 1, sortField: 'firstName', sortOrder: 'desc' });
      const req = httpMock.expectOne((r) => r.url === '/api/users');

      expect(req.request.params.get('_sort')).toBe('firstName');
      expect(req.request.params.get('_order')).toBe('desc');

      req.flush(makePage([]));
      await p;
    });
  });
});
