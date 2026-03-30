import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvitationStore } from './invitation.store';
import { Invitation } from './invitation.model';

const mockInvitations: Invitation[] = [
  {
    id: '1',
    email: 'alice@example.com',
    role: 'viewer',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00Z',
    appId: 'acme',
  },
  {
    id: '2',
    email: 'bob@example.com',
    role: 'editor',
    status: 'accepted',
    createdAt: '2026-01-02T00:00:00Z',
    appId: 'acme',
  },
];

describe('InvitationStore', () => {
  let store: InstanceType<typeof InvitationStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(InvitationStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has empty initial state', () => {
    expect(store.entities()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  describe('loadAll()', () => {
    it('fetches invitations and sets state', async () => {
      const promise = store.loadAll();
      expect(store.loading()).toBe(true);

      httpMock.expectOne('/api/invitations').flush(mockInvitations);
      await promise;

      expect(store.entities()).toEqual(mockInvitations);
      expect(store.loading()).toBe(false);
    });

    it('sets error on HTTP failure', async () => {
      const promise = store.loadAll();
      httpMock
        .expectOne('/api/invitations')
        .flush('error', { status: 500, statusText: 'Server Error' });
      await promise;

      expect(store.error()).toBe('Failed to load invitations');
      expect(store.loading()).toBe(false);
    });
  });

  describe('create()', () => {
    it('POSTs and adds invitation to state', async () => {
      const newInvitation: Invitation = {
        id: '3',
        email: 'carol@example.com',
        role: 'admin',
        status: 'pending',
        createdAt: '2026-01-03T00:00:00Z',
        appId: 'acme',
      };

      const promise = store.create({ email: 'carol@example.com', role: 'admin', appId: 'acme' });
      const req = httpMock.expectOne('/api/invitations');
      expect(req.request.method).toBe('POST');
      req.flush(newInvitation);
      const result = await promise;

      expect(result).toEqual(newInvitation);
      expect(store.entities()).toContainEqual(newInvitation);
    });
  });

  describe('reset()', () => {
    it('clears all state', async () => {
      const promise = store.loadAll();
      httpMock.expectOne('/api/invitations').flush(mockInvitations);
      await promise;

      store.reset();

      expect(store.entities()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });
});
