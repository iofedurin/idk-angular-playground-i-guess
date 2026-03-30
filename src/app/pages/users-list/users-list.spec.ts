import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersListComponent } from './users-list';
import { Department } from '@entities/department';
import { User } from '@entities/user';
import { DEFAULT_SORT, EMPTY_FILTERS } from '@features/user-filters';

const mockUsers: User[] = [
  {
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
  },
  {
    id: '2',
    username: 'asmith',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    age: 28,
    country: 'GB',
    department: 'design',
    jobTitle: 'ux-designer',
    role: 'admin',
    active: false,
    bio: '',
  },
];

const mockDepartments: Department[] = [
  { id: 'engineering', name: 'Engineering', group: 'Technology' },
  { id: 'design', name: 'Design', group: 'Technology' },
];

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

/** Flush reference-data requests triggered by UserFiltersComponent. */
function flushRefData(httpMock: HttpTestingController): void {
  httpMock.match('/api/departments').forEach((r) => r.flush([]));
  httpMock.match('/api/countries').forEach((r) => r.flush([]));
  httpMock.match('/api/job-titles').forEach((r) => r.flush([]));
}

describe('UsersListComponent', () => {
  let fixture: ComponentFixture<UsersListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    // UserInviteDialogComponent uses native dialog APIs not implemented in jsdom
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = () => {};
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = () => {};
    }

    await TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ appId: 'acme' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersListComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    flushRefData(httpMock);
    httpMock.verify();
  });

  it('shows loading spinner before data arrives', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table')).toBeFalsy();

    // flush to satisfy httpMock.verify()
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([]);
  });

  it('renders table with users after data loads', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('jdoe');
    expect(fixture.nativeElement.textContent).toContain('asmith');
  });

  it('shows empty state when no users', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No users found');
  });

  it('shows error alert on HTTP failure', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/api/users'))
      .flush('error', { status: 500, statusText: 'Server Error' });
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.alert-error')).toBeTruthy();
  });

  it('"Add User" link contains correct appId', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([]);
    await flush();
    fixture.detectChanges();

    const addLink = fixture.nativeElement.querySelector('a.btn-primary');
    expect(addLink?.getAttribute('href')).toContain('/app/acme/users/new');
  });

  it('"View" links contain correct appId and user id', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    const hrefs = Array.from(fixture.nativeElement.querySelectorAll('a.btn-ghost')).map((a) =>
      (a as HTMLElement).getAttribute('href'),
    );
    expect(hrefs.some((h) => h?.includes('/app/acme/users/1'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('/app/acme/users/2'))).toBe(true);
  });

  it('displays correct role badges', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const badgeTexts = Array.from(el.querySelectorAll('.badge')).map((b) => b.textContent?.trim());
    expect(badgeTexts).toContain('editor');
    expect(badgeTexts).toContain('admin');
  });

  it('renders filter panel', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-user-filters')).toBeTruthy();
  });

  it('filters table by role', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    fixture.componentInstance['filters'].set({ ...EMPTY_FILTERS, role: 'admin' });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('asmith');
    expect(fixture.nativeElement.textContent).not.toContain('jdoe');
  });

  it('filters table by text search', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    fixture.componentInstance['filters'].set({ ...EMPTY_FILTERS, search: 'john' });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('jdoe');
  });

  it('shows "No users found" when filters match nothing', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    fixture.componentInstance['filters'].set({ ...EMPTY_FILTERS, search: 'xyz-no-match' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No users found');
  });

  describe('sorting', () => {
    it('renders sort indicator on active column', async () => {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
      await flush();
      fixture.detectChanges();

      // Default sort is name ↑
      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const nameHeader = Array.from(headers as NodeList).find((th) =>
        (th as HTMLElement).textContent?.includes('Name'),
      ) as HTMLElement;
      expect(nameHeader.textContent).toContain('↑');
    });

    it('sorts table rows by name ascending by default', async () => {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
      await flush();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      // Alice Smith (id=2) comes before John Doe (id=1) alphabetically
      expect(rows[0].textContent).toContain('asmith');
      expect(rows[1].textContent).toContain('jdoe');
    });

    it('toggleSort flips direction when clicking same column', async () => {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
      await flush();
      fixture.detectChanges();

      // Click Name header (already active) — should flip to desc
      fixture.componentInstance['toggleSort']('name');
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('jdoe');   // John Doe first in desc
      expect(rows[1].textContent).toContain('asmith');

      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const nameHeader = Array.from(headers as NodeList).find((th) =>
        (th as HTMLElement).textContent?.includes('Name'),
      ) as HTMLElement;
      expect(nameHeader.textContent).toContain('↓');
    });

    it('toggleSort changes field and resets to asc', async () => {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
      await flush();
      fixture.detectChanges();

      // Switch to role sort
      fixture.componentInstance['toggleSort']('role');
      fixture.detectChanges();

      expect(fixture.componentInstance['sort']()).toEqual({ field: 'role', direction: 'asc' });
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      // admin (asmith) comes before editor (jdoe)
      expect(rows[0].textContent).toContain('asmith');
    });
  });

  it('filters by department group when departments are loaded', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    // Flush departments with real data so group resolution works
    httpMock.match('/api/departments').forEach((r) => r.flush(mockDepartments));
    httpMock.match('/api/countries').forEach((r) => r.flush([]));
    httpMock.match('/api/job-titles').forEach((r) => r.flush([]));
    await flush();
    fixture.detectChanges();

    // Both users are in Technology group (engineering + design)
    fixture.componentInstance['filters'].set({ ...EMPTY_FILTERS, department: 'group:Technology' });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });
});
