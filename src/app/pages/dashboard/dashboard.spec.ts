import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardPage } from './dashboard';
import { User } from '@entities/user';

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
    managerId: null,
  },
  {
    id: '2',
    username: 'asmith',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    age: 28,
    country: 'GB',
    department: 'engineering',
    jobTitle: 'backend-engineer',
    role: 'admin',
    active: true,
    bio: '',
    managerId: null,
  },
  {
    id: '3',
    username: 'bmueller',
    firstName: 'Bob',
    lastName: 'Mueller',
    email: 'bob@example.com',
    age: 35,
    country: 'DE',
    department: 'design',
    jobTitle: 'ux-designer',
    role: 'viewer',
    active: false,
    bio: '',
    managerId: null,
  },
];

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;
  let page: DashboardPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    httpMock = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    page = fixture.componentInstance;
  });

  afterEach(() => httpMock.verify());

  it('shows loading spinner before data arrives', () => {
    fixture.detectChanges();

    expect(el.querySelector('.loading')).toBeTruthy();
    expect(el.querySelector('.stats')).toBeFalsy();

    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([]);
  });

  it('shows error alert on HTTP failure', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/api/users'))
      .flush('error', { status: 500, statusText: 'Server Error' });
    await flush();
    fixture.detectChanges();

    expect(el.querySelector('.alert-error')).toBeTruthy();
  });

  it('renders stats-cards with correct counts', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    const statValues = Array.from(el.querySelectorAll('.stat-value')).map(
      (e) => e.textContent?.trim(),
    );
    // total=3, active=2, admin=1, editor=1, viewer=1
    expect(statValues).toContain('3');
    expect(statValues).toContain('2');
  });

  it('renders department breakdown table sorted by count desc', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    // target only the By Department table (first table in DOM)
    const deptTable = el.querySelector('table')!;
    const rows = deptTable.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2); // engineering (2), design (1)

    const firstRow = rows[0].textContent!;
    expect(firstRow).toContain('engineering');
    expect(firstRow).toContain('2');

    const secondRow = rows[1].textContent!;
    expect(secondRow).toContain('design');
    expect(secondRow).toContain('1');
  });

  it('renders recent users list', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    const listItems = el.querySelectorAll('ul li');
    expect(listItems.length).toBe(3);
    // reversed: Bob (last added) first
    expect(listItems[0].textContent).toContain('Bob Mueller');
    expect(listItems[1].textContent).toContain('Alice Smith');
    expect(listItems[2].textContent).toContain('John Doe');
  });

  it('shows empty states when no users', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([]);
    await flush();
    fixture.detectChanges();

    expect(el.textContent).toContain('No data');
    expect(el.textContent).toContain('No users yet');
  });

  describe('org metrics', () => {
    // Hierarchy: u1 (root) → u2, u3 (direct reports); u2 → u4 (depth 2)
    const hierarchyUsers: User[] = [
      { ...mockUsers[0], id: 'u1', managerId: null },
      { ...mockUsers[1], id: 'u2', managerId: 'u1' },
      { ...mockUsers[2], id: 'u3', managerId: 'u1' },
      { ...mockUsers[0], id: 'u4', username: 'u4', managerId: 'u2' },
    ];

    async function loadHierarchy(): Promise<void> {
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url.includes('/api/users')).flush(hierarchyUsers);
      await flush();
      fixture.detectChanges();
    }

    it('computes orphaned users count', async () => {
      await loadHierarchy();
      // only u1 has no manager
      expect((page as any).orphanedUsers()).toBe(1);
    });

    it('computes top managers with report counts', async () => {
      await loadHierarchy();
      const top = (page as any).topManagers() as { name: string; count: number }[];
      // u1 has 2 direct reports (u2, u3); u2 has 1 (u4)
      expect(top[0].count).toBe(2);
      expect(top[0].name).toContain('John');
      expect(top[1].count).toBe(1);
    });

    it('computes max hierarchy depth', async () => {
      await loadHierarchy();
      // u4 ancestors: u2, u1 → depth 2
      expect((page as any).maxDepth()).toBe(2);
    });
  });
});
