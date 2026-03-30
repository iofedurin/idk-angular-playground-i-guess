import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserProfilePage } from './user-profile';
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
  bio: 'Frontend enthusiast',
};

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('UserProfilePage', () => {
  let fixture: ComponentFixture<UserProfilePage>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'app/:appId/users', component: UserProfilePage }]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ appId: 'acme', id: '1' }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfilePage);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('shows loading spinner while data loads', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading')).toBeTruthy();

    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([mockUser]);
  });

  it('renders user card after data loads', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([mockUser]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('John Doe');
    expect(fixture.nativeElement.textContent).toContain('@jdoe');
  });

  it('"Edit" link points to /app/acme/users/1/edit', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([mockUser]);
    await flush();
    fixture.detectChanges();

    const editLink = fixture.nativeElement.querySelector('a.btn-primary');
    expect(editLink?.getAttribute('href')).toContain('/app/acme/users/1/edit');
  });

  it('"Back to list" link points to /app/acme/users', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([mockUser]);
    await flush();
    fixture.detectChanges();

    const backLink = fixture.nativeElement.querySelector('a.btn-ghost');
    expect(backLink?.getAttribute('href')).toContain('/app/acme/users');
  });

  it('navigates to users list when user not found', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush([]);
    await flush();

    expect(navigateSpy).toHaveBeenCalledWith(['/app', 'acme', 'users']);
  });
});
