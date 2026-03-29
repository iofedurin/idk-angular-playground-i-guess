import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersListComponent } from './users-list';
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

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

describe('UsersListComponent', () => {
  let fixture: ComponentFixture<UsersListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
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

  afterEach(() => httpMock.verify());

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

  it('"Edit" links contain correct appId and user id', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(mockUsers);
    await flush();
    fixture.detectChanges();

    const editLinks = fixture.nativeElement.querySelectorAll('a.btn-ghost');
    expect(editLinks[0]?.getAttribute('href')).toContain('/app/acme/users/1');
    expect(editLinks[1]?.getAttribute('href')).toContain('/app/acme/users/2');
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
});
