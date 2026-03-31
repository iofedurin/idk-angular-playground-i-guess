import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OrgBoardPage } from './org-board';

// Foblex uses ResizeObserver internally (FResizeChannel) — jsdom doesn't include it
(window as any)['ResizeObserver'] = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
import type { User } from '@entities/user';
import type { BoardPosition } from '@features/org-board';

const makeUser = (id: string, overrides: Partial<User> = {}): User => ({
  id,
  username: `user${id}`,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  email: `user${id}@test.com`,
  age: 30,
  country: 'US',
  department: 'engineering',
  jobTitle: 'dev',
  role: 'editor',
  active: true,
  bio: '',
  managerId: null,
  ...overrides,
});

// Hierarchy: u3 → u1 → u2  (u3 manages u1, u1 manages u2)
const mockUsers: User[] = [
  makeUser('3', { username: 'boss', firstName: 'Boss', lastName: 'Top', managerId: null }),
  makeUser('1', { username: 'mid', firstName: 'Mid', lastName: 'Manager', managerId: '3' }),
  makeUser('2', { username: 'leaf', firstName: 'Leaf', lastName: 'Worker', managerId: '1' }),
  makeUser('4', { username: 'offboard', firstName: 'Off', lastName: 'Board', managerId: '3' }),
];

const mockPositions: BoardPosition[] = [
  { id: 'bp3', userId: '3', x: 400, y: 50 },
  { id: 'bp1', userId: '1', x: 200, y: 200 },
  { id: 'bp2', userId: '2', x: 100, y: 400 },
  // user '4' is NOT on board — no position
];

const flush = () => new Promise<void>((r) => setTimeout(r));

/**
 * Helper: trigger ngOnInit (detectChanges), flush both HTTP requests, await microtasks.
 */
async function initPage(
  fixture: ComponentFixture<OrgBoardPage>,
  httpMock: HttpTestingController,
  users = mockUsers,
  positions = mockPositions,
): Promise<void> {
  fixture.detectChanges(); // ngOnInit → loadAll + loadPositions
  httpMock.expectOne((r) => r.url.includes('/api/users')).flush(users);
  httpMock.expectOne('/api/board-positions').flush(positions);
  await flush();
  fixture.detectChanges();
}

describe('OrgBoardPage', () => {
  let fixture: ComponentFixture<OrgBoardPage>;
  let httpMock: HttpTestingController;
  let page: OrgBoardPage;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgBoardPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgBoardPage);
    httpMock = TestBed.inject(HttpTestingController);
    page = fixture.componentInstance;
    el = fixture.nativeElement;
  });

  afterEach(() => httpMock.verify());

  it('creates without error', () => {
    fixture.detectChanges();
    expect(page).toBeTruthy();
    httpMock.match(() => true).forEach((r) => r.flush([]));
  });

  it('renders sidebar with Employees heading', () => {
    fixture.detectChanges();
    const sidebar = el.querySelector('aside');
    expect(sidebar).toBeTruthy();
    expect(sidebar?.textContent).toContain('Employees');
    httpMock.match(() => true).forEach((r) => r.flush([]));
  });

  it('renders f-flow and f-canvas container', () => {
    fixture.detectChanges();
    expect(el.querySelector('f-flow')).toBeTruthy();
    expect(el.querySelector('f-canvas')).toBeTruthy();
    httpMock.match(() => true).forEach((r) => r.flush([]));
  });

  describe('computed nodes', () => {
    it('creates nodes only for users that have board positions', async () => {
      await initPage(fixture, httpMock);

      const nodes = (page as any).nodes();
      expect(nodes).toHaveLength(3); // u3, u1, u2 — NOT u4 (no position)
      const userIds = nodes.map((n: any) => n.userId);
      expect(userIds).toContain('1');
      expect(userIds).toContain('2');
      expect(userIds).toContain('3');
      expect(userIds).not.toContain('4');
    });

    it('node contains user object and position coordinates', async () => {
      await initPage(fixture, httpMock);

      const nodes = (page as any).nodes();
      const node3 = nodes.find((n: any) => n.userId === '3');
      expect(node3.user.firstName).toBe('Boss');
      expect(node3.x).toBe(400);
      expect(node3.y).toBe(50);
      expect(node3.positionId).toBe('bp3');
    });
  });

  describe('computed edges', () => {
    it('creates edges for manager relationships where both users are on board', async () => {
      await initPage(fixture, httpMock);

      const edges = (page as any).edges();
      // u3→u1 (both on board) and u1→u2 (both on board)
      expect(edges).toHaveLength(2);
    });

    it('edge has correct managerId, subordinateId, outputId, inputId', async () => {
      await initPage(fixture, httpMock);

      const edges = (page as any).edges();
      const edge31 = edges.find((e: any) => e.managerId === '3' && e.subordinateId === '1');
      expect(edge31).toBeTruthy();
      expect(edge31.outputId).toBe('out-3');
      expect(edge31.inputId).toBe('in-1');
    });

    it('excludes edges where manager is NOT on board', async () => {
      // u4 manages nobody, but u4.managerId='3' and u4 is NOT on board
      await initPage(fixture, httpMock);

      const edges = (page as any).edges();
      const edgeToU4 = edges.find((e: any) => e.subordinateId === '4');
      expect(edgeToU4).toBeUndefined();
    });

    it('excludes edges where subordinate has no managerId', async () => {
      await initPage(fixture, httpMock);

      const edges = (page as any).edges();
      // u3 has managerId: null
      const edgeToU3 = edges.find((e: any) => e.subordinateId === '3');
      expect(edgeToU3).toBeUndefined();
    });
  });

  describe('computed validTargetsByUser (cycle prevention)', () => {
    it('excludes self from valid targets', async () => {
      await initPage(fixture, httpMock);

      const targets = (page as any).validTargetsByUser() as Map<string, string[]>;
      const targetsForU1 = targets.get('1')!;
      expect(targetsForU1).not.toContain('in-1');
    });

    it('excludes ancestors to prevent cycles', async () => {
      await initPage(fixture, httpMock);

      // u2's ancestors: u1, u3
      const targets = (page as any).validTargetsByUser() as Map<string, string[]>;
      const targetsForU2 = targets.get('2')!;
      // u2 can't connect to u1 (direct manager) or u3 (grandmanager) — that would create a cycle
      expect(targetsForU2).not.toContain('in-1');
      expect(targetsForU2).not.toContain('in-3');
      // u2 has no valid targets on board (all others are ancestors or self)
      expect(targetsForU2).toHaveLength(0);
    });

    it('allows connecting to non-ancestors', async () => {
      await initPage(fixture, httpMock);

      // u3 (root) can connect to u1 and u2 (neither is ancestor of u3)
      const targets = (page as any).validTargetsByUser() as Map<string, string[]>;
      const targetsForU3 = targets.get('3')!;
      expect(targetsForU3).toContain('in-1');
      expect(targetsForU3).toContain('in-2');
    });
  });

  describe('selectedUserId toggle', () => {
    it('selects user on first click', async () => {
      await initPage(fixture, httpMock);

      (page as any).onNodeClicked('1');
      expect((page as any).selectedUserId()).toBe('1');
    });

    it('deselects on second click of same user', async () => {
      await initPage(fixture, httpMock);

      (page as any).onNodeClicked('1');
      (page as any).onNodeClicked('1');
      expect((page as any).selectedUserId()).toBeNull();
    });

    it('switches selection to different user', async () => {
      await initPage(fixture, httpMock);

      (page as any).onNodeClicked('1');
      (page as any).onNodeClicked('2');
      expect((page as any).selectedUserId()).toBe('2');
    });
  });

  describe('event handlers → store calls', () => {
    it('onConnectionCreated calls setManager directly when subordinate has no existing manager', async () => {
      await initPage(fixture, httpMock);

      // u3 (id='3') has managerId: null → direct setManager call, no confirmation dialog
      const promise = (page as any).onConnectionCreated({ managerId: '1', subordinateId: '3' });
      httpMock.expectOne((r) => r.url.includes('/api/users/3') && r.method === 'PATCH').flush({
        ...mockUsers[0], // u3 is mockUsers[0]
        managerId: '1',
      });
      await promise;
      expect((page as any).pendingConnection()).toBeNull();
    });

    it('onRemoveFromBoard removes position, clears removed user manager link, and cascade-reassigns direct reports to removed user manager', async () => {
      await initPage(fixture, httpMock);

      // Removing u1 (has manager u3, has direct report u2)
      // u1.managerId = '3' → newManagerId = '3'
      // Expect 3 parallel calls:
      //   DELETE position/bp1
      //   PATCH u1.managerId=null (clear own link)
      //   PATCH u2.managerId='3' (cascade: u2 gets u1's manager = u3)
      const promise = (page as any).onRemoveFromBoard('1');
      httpMock
        .expectOne((r) => r.url === '/api/board-positions/bp1' && r.method === 'DELETE')
        .flush(null);
      httpMock
        .expectOne((r) => r.url.includes('/api/users/1') && r.method === 'PATCH')
        .flush({ ...mockUsers[1], managerId: null });
      httpMock
        .expectOne((r) => r.url.includes('/api/users/2') && r.method === 'PATCH')
        .flush({ ...mockUsers[2], managerId: '3' }); // cascaded to u3
      await promise;
    });

    it('onConnectionRemoved calls usersStore.setManager with null', async () => {
      await initPage(fixture, httpMock);

      const promise = (page as any).onConnectionRemoved({ subordinateId: '1' });
      httpMock.expectOne((r) => r.url.includes('/api/users/1') && r.method === 'PATCH').flush({
        ...mockUsers[1],
        managerId: null,
      });
      await promise;
    });

    it('onPositionChanged calls boardStore.updatePosition', async () => {
      await initPage(fixture, httpMock);

      const promise = (page as any).onPositionChanged({
        userId: '3',
        positionId: 'bp3',
        x: 999,
        y: 888,
      });
      httpMock.expectOne((r) => r.url === '/api/board-positions/bp3' && r.method === 'PATCH').flush({
        id: 'bp3',
        userId: '3',
        x: 999,
        y: 888,
      });
      await promise;
    });
  });

  describe('connection reassignment — Phase 5', () => {
    it('shows confirmation when subordinate already has a different manager', async () => {
      await initPage(fixture, httpMock);

      // u2 (id='2') has managerId: '1'. Connecting to managerId: '3' → should show dialog
      (page as any).onConnectionCreated({ managerId: '3', subordinateId: '2' });
      const pending = (page as any).pendingConnection();
      expect(pending).not.toBeNull();
      expect(pending.managerId).toBe('3');
      expect(pending.subordinateId).toBe('2');
      expect(pending.subordinateName).toBe('Leaf Worker');
      expect(pending.currentManagerName).toBe('Mid Manager');
      expect(pending.newManagerName).toBe('Boss Top');
    });

    it('does not show confirmation when connecting to the same existing manager', async () => {
      await initPage(fixture, httpMock);

      // u2 already has managerId: '1'. Connecting to managerId: '1' → same manager, no dialog
      const promise = (page as any).onConnectionCreated({ managerId: '1', subordinateId: '2' });
      httpMock.expectOne((r) => r.url.includes('/api/users/2') && r.method === 'PATCH').flush({
        ...mockUsers[2],
        managerId: '1',
      });
      await promise;
      expect((page as any).pendingConnection()).toBeNull();
    });

    it('confirmReassignment calls setManager and clears pendingConnection', async () => {
      await initPage(fixture, httpMock);

      (page as any).onConnectionCreated({ managerId: '3', subordinateId: '2' });
      expect((page as any).pendingConnection()).not.toBeNull();

      const promise = (page as any).confirmReassignment();
      expect((page as any).pendingConnection()).toBeNull(); // cleared immediately
      httpMock.expectOne((r) => r.url.includes('/api/users/2') && r.method === 'PATCH').flush({
        ...mockUsers[2],
        managerId: '3',
      });
      await promise;
    });

    it('cancelReassignment clears pendingConnection without HTTP call', async () => {
      await initPage(fixture, httpMock);

      (page as any).onConnectionCreated({ managerId: '3', subordinateId: '2' });
      expect((page as any).pendingConnection()).not.toBeNull();

      (page as any).cancelReassignment();
      expect((page as any).pendingConnection()).toBeNull();
      // No HTTP requests — afterEach httpMock.verify() confirms this
    });

    it('does not show confirmation when current manager is not on the board', async () => {
      // u5 has managerId: '4', but u4 has no board position → no visible connection on canvas
      const usersWithU5 = [
        ...mockUsers,
        makeUser('5', { username: 'u5', firstName: 'Five', lastName: 'User', managerId: '4' }),
      ];
      await initPage(fixture, httpMock, usersWithU5);

      // Connecting u1 as manager of u5 — u5's current manager (u4) is NOT on the board
      const promise = (page as any).onConnectionCreated({ managerId: '1', subordinateId: '5' });
      expect((page as any).pendingConnection()).toBeNull(); // no dialog
      httpMock.expectOne((r) => r.url.includes('/api/users/5') && r.method === 'PATCH').flush({
        ...usersWithU5[4],
        managerId: '1',
      });
      await promise;
    });

    it('onRemoveManager calls setManager with null', async () => {
      await initPage(fixture, httpMock);

      const promise = (page as any).onRemoveManager('2');
      httpMock.expectOne((r) => r.url.includes('/api/users/2') && r.method === 'PATCH').flush({
        ...mockUsers[2],
        managerId: null,
      });
      await promise;
    });
  });

  describe('loading and error states', () => {
    it('shows spinner while loading', () => {
      fixture.detectChanges(); // ngOnInit triggers loading=true
      expect(el.querySelector('app-spinner')).toBeTruthy();
      httpMock.match(() => true).forEach((r) => r.flush([]));
    });

    it('shows error alert on load failure', async () => {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url.includes('/api/users')).flush('error', {
        status: 500,
        statusText: 'Server Error',
      });
      httpMock.expectOne('/api/board-positions').flush([]);
      await flush();
      fixture.detectChanges();

      expect(el.querySelector('app-error-alert')).toBeTruthy();
    });
  });
});
