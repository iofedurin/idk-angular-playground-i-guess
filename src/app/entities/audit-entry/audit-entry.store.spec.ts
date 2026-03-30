import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuditEntryStore } from './audit-entry.store';
import { AuditEntry, AuditPage } from './audit-entry.model';

const mockEntry = (id: string): AuditEntry => ({
  id,
  appId: 'acme',
  action: 'create',
  entityType: 'user',
  entityId: 'u1',
  userName: 'admin',
  timestamp: '2026-03-30T10:00:00Z',
  details: 'Created user jdoe',
});

const makePage = (data: AuditEntry[], next: number | null): AuditPage => ({
  data,
  items: 25,
  pages: 3,
  first: 1,
  prev: null,
  next,
  last: 3,
});

describe('AuditEntryStore', () => {
  let store: InstanceType<typeof AuditEntryStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AuditEntryStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadPage(1) sets entries and loading flag', async () => {
    const page1 = [mockEntry('al1'), mockEntry('al2')];
    const promise = store.loadPage(1);
    expect(store.loading()).toBe(true);

    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(makePage(page1, 2));
    await promise;

    expect(store.loading()).toBe(false);
    expect(store.entries()).toEqual(page1);
    expect(store.currentPage()).toBe(1);
    expect(store.hasMore()).toBe(true);
  });

  it('loadPage(2) appends entries to existing', async () => {
    const page1 = [mockEntry('al1'), mockEntry('al2')];
    const page2 = [mockEntry('al3'), mockEntry('al4')];

    const p1 = store.loadPage(1);
    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(makePage(page1, 2));
    await p1;

    const p2 = store.loadPage(2);
    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(makePage(page2, null));
    await p2;

    expect(store.entries()).toEqual([...page1, ...page2]);
    expect(store.currentPage()).toBe(2);
    expect(store.hasMore()).toBe(false);
  });

  it('hasMore is false when next is null', async () => {
    const p = store.loadPage(1);
    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(makePage([], null));
    await p;

    expect(store.hasMore()).toBe(false);
  });

  it('sets error on failure', async () => {
    const p = store.loadPage(1);
    httpMock.expectOne((r) => r.url === '/api/audit-log').flush('error', {
      status: 500,
      statusText: 'Server Error',
    });
    await p;

    expect(store.error()).toBe('Failed to load audit log');
    expect(store.loading()).toBe(false);
  });

  it('reset() clears state', async () => {
    const p = store.loadPage(1);
    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(makePage([mockEntry('al1')], 2));
    await p;

    store.reset();

    expect(store.entries()).toEqual([]);
    expect(store.currentPage()).toBe(0);
    expect(store.hasMore()).toBe(true);
    expect(store.error()).toBeNull();
  });
});
