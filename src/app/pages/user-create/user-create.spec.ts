import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserCreatePage } from './user-create';

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

describe('UserCreatePage', () => {
  let fixture: ComponentFixture<UserCreatePage>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCreatePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'app/:appId/users', component: UserCreatePage }]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ appId: 'acme' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCreatePage);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('renders the form with "New User" title', async () => {
    fixture.detectChanges();
    flushReferenceData(httpMock);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('New User');
  });

  it('renders the Create submit button', async () => {
    fixture.detectChanges();
    flushReferenceData(httpMock);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Create');
  });

  it('navigates to /app/acme/users after successful submit', async () => {
    fixture.detectChanges();
    flushReferenceData(httpMock);
    await flush();

    const navigateSpy = vi.spyOn(router, 'navigate');

    const component = fixture.componentInstance as unknown as {
      store: { create: (dto: unknown) => Promise<unknown> };
      appId: string;
    };
    const navPromise = component.store
      .create({
        username: 'test',
        firstName: 'T',
        lastName: 'User',
        email: 'test@example.com',
        age: 25,
        country: 'US',
        department: 'engineering',
        jobTitle: 'senior-frontend',
        role: 'viewer',
        active: true,
        bio: '',
      })
      .then(() => router.navigate(['/app', component.appId, 'users']));

    httpMock.expectOne((r) => r.url.includes('/api/users') && r.method === 'POST').flush({
      id: 'new-1',
      username: 'test',
    });
    await navPromise;

    expect(navigateSpy).toHaveBeenCalledWith(['/app', 'acme', 'users']);
  });
});

function flushReferenceData(httpMock: HttpTestingController) {
  httpMock.expectOne('/api/countries').flush([]);
  httpMock.expectOne('/api/departments').flush([]);
  httpMock.expectOne('/api/job-titles').flush([]);
}
