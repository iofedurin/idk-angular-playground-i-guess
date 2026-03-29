import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersStore } from './user.store';
import { User } from './user.model';

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
});
