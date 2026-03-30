import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersListComponent } from './users-list';
import { User, UsersPage } from '@entities/user';
import { EMPTY_FILTERS } from '@features/user-filters';

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

const makePage = (data: User[], next: number | null = null, total = data.length): UsersPage => ({
  data,
  items: total,
  pages: Math.max(1, Math.ceil(total / 10)),
  first: 1,
  prev: null,
  next,
  last: Math.max(1, Math.ceil(total / 10)),
});

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

/** Flush reference-data requests triggered by UserFiltersComponent children. */
function flushRefData(httpMock: HttpTestingController): void {
  httpMock.match('/api/departments').forEach((r) => r.flush([]));
  httpMock.match('/api/countries').forEach((r) => r.flush([]));
  httpMock.match('/api/job-titles').forEach((r) => r.flush([]));
}

describe('UsersListComponent', () => {
  let fixture: ComponentFixture<UsersListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
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

    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage([]));
  });

  it('renders table with users after data loads', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers));
    await flush();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('jdoe');
    expect(fixture.nativeElement.textContent).toContain('asmith');
  });

  it('shows empty state when no users', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage([]));
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No users found');
  });

  it('shows error alert on HTTP failure', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === '/api/users')
      .flush('error', { status: 500, statusText: 'Server Error' });
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.alert-error')).toBeTruthy();
  });

  it('"Add User" link contains correct appId', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage([]));
    await flush();
    fixture.detectChanges();

    const addLink = fixture.nativeElement.querySelector('a.btn-primary');
    expect(addLink?.getAttribute('href')).toContain('/app/acme/users/new');
  });

  it('"View" links contain correct appId and user id', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers));
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
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers));
    await flush();
    fixture.detectChanges();

    const badgeTexts = Array.from<Element>(fixture.nativeElement.querySelectorAll('.badge')).map(
      (b) => b.textContent?.trim(),
    );
    expect(badgeTexts).toContain('editor');
    expect(badgeTexts).toContain('admin');
  });

  it('renders filter panel', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage([]));
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-user-filters')).toBeTruthy();
  });

  it('sends role filter as query param on filter change', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers));
    await flush();
    fixture.detectChanges();

    fixture.componentInstance['onFiltersChange']({ ...EMPTY_FILTERS, role: 'admin' });
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/users');
    expect(req.request.params.get('role')).toBe('admin');
    req.flush(makePage([mockUsers[1]]));
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('asmith');
    expect(fixture.nativeElement.textContent).not.toContain('jdoe');
  });

  it('sends search query param on filter change', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers));
    await flush();
    fixture.detectChanges();

    fixture.componentInstance['onFiltersChange']({ ...EMPTY_FILTERS, search: 'john' });
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/users');
    expect(req.request.params.get('q')).toBe('john');
    req.flush(makePage([mockUsers[0]]));
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('jdoe');
  });

  describe('sorting', () => {
    it('renders sort indicator on active column', async () => {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers));
      await flush();
      fixture.detectChanges();

      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const nameHeader = Array.from(headers as NodeList).find((th) =>
        (th as HTMLElement).textContent?.includes('Name'),
      ) as HTMLElement;
      expect(nameHeader.textContent).toContain('↑');
    });

    it('toggleSort sends _sort with minus prefix for desc to server', async () => {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers));
      await flush();
      fixture.detectChanges();

      fixture.componentInstance['toggleSort']('name'); // flips name asc → desc
      fixture.detectChanges();

      const req = httpMock.expectOne((r) => r.url === '/api/users');
      expect(req.request.params.get('_sort')).toBe('-firstName');
      req.flush(makePage(mockUsers));
      await flush();
      fixture.detectChanges();

      const headers = fixture.nativeElement.querySelectorAll('thead th');
      const nameHeader = Array.from(headers as NodeList).find((th) =>
        (th as HTMLElement).textContent?.includes('Name'),
      ) as HTMLElement;
      expect(nameHeader.textContent).toContain('↓');
    });

    it('toggleSort to new field resets direction to asc', async () => {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers));
      await flush();
      fixture.detectChanges();

      fixture.componentInstance['toggleSort']('role');
      fixture.detectChanges();

      const req = httpMock.expectOne((r) => r.url === '/api/users');
      expect(req.request.params.get('_sort')).toBe('role'); // no minus = asc
      req.flush(makePage(mockUsers));
      await flush();
      fixture.detectChanges();

      expect(fixture.componentInstance['sort']()).toEqual({ field: 'role', direction: 'asc' });
    });
  });

  it('goToPage sends correct _page param', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers, 2, 25));
    await flush();
    fixture.detectChanges();

    fixture.componentInstance['goToPage'](2);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/users');
    expect(req.request.params.get('_page')).toBe('2');
    req.flush(makePage([]));
    await flush();
    fixture.detectChanges();
  });

  it('shows pagination info when totalCount > 0', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/users').flush(makePage(mockUsers, 2, 25));
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('of 25 users');
  });
});
