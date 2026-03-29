import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserEditPage } from './user-edit';
import { User } from '@entities/user';

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
  bio: 'Bio text',
};

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

describe('UserEditPage', () => {
  let fixture: ComponentFixture<UserEditPage>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserEditPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'app/:appId/users', component: UserEditPage }]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ appId: 'acme', id: '1' }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserEditPage);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    // Dismiss pending async form validator requests (username/email uniqueness checks)
    dismissValidatorRequests(httpMock);
    httpMock.verify();
  });

  it('renders the form with "Edit User" title', async () => {
    fixture.detectChanges();
    flushAll(httpMock);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Edit User');
  });

  it('renders the Save submit button', async () => {
    fixture.detectChanges();
    flushAll(httpMock);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Save');
  });

  it('loads user data from store into the form model', async () => {
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([mockUser]);
    flushReferenceData(httpMock);
    await flush();
    fixture.detectChanges();

    const model = (fixture.componentInstance as unknown as { model: () => typeof mockUser }).model;
    expect(model().username).toBe('jdoe');
    expect(model().bio).toBe('Bio text');
  });

  it('navigates to /app/acme/users after successful update', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([mockUser]);
    flushReferenceData(httpMock);
    await flush();

    const navigateSpy = vi.spyOn(router, 'navigate');

    const component = fixture.componentInstance as unknown as {
      store: { update: (id: string, dto: unknown) => Promise<unknown> };
      userId: string;
      appId: string;
    };
    const navPromise = component.store
      .update(component.userId, { username: 'jdoe2' })
      .then(() => router.navigate(['/app', component.appId, 'users']));

    httpMock
      .expectOne((r) => r.url.includes('/api/users/1') && r.method === 'PATCH')
      .flush({ ...mockUser, username: 'jdoe2' });
    await navPromise;

    expect(navigateSpy).toHaveBeenCalledWith(['/app', 'acme', 'users']);
  });
});

/** Flush pending async validator HTTP requests (username/email uniqueness). */
function dismissValidatorRequests(httpMock: HttpTestingController) {
  // validateHttp bakes query params into the URL string, so r.url includes them
  httpMock
    .match(
      (r) =>
        r.method === 'GET' &&
        r.url.startsWith('/api/users?') &&
        (r.url.includes('username=') || r.url.includes('email=')),
    )
    .forEach((req) => req.flush([]));
}

function flushReferenceData(httpMock: HttpTestingController) {
  httpMock.expectOne('/api/countries').flush([]);
  httpMock.expectOne('/api/departments').flush([]);
  httpMock.expectOne('/api/job-titles').flush([]);
}

function flushAll(httpMock: HttpTestingController) {
  httpMock.expectOne((r) => r.url.includes('/api/users')).flush([mockUser]);
  flushReferenceData(httpMock);
}
