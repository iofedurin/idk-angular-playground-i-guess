import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentCreatePage } from './department-create';
import { Department } from '@entities/department';

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('DepartmentCreatePage', () => {
  let fixture: ComponentFixture<DepartmentCreatePage>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentCreatePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'app/:appId/departments', component: DepartmentCreatePage }]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ appId: 'acme' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DepartmentCreatePage);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('renders the form with "New Department" title', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('New Department');
  });

  it('renders the Create submit button', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Create');
  });

  it('navigates to /app/acme/departments after successful submit', async () => {
    fixture.detectChanges();
    const navigateSpy = vi.spyOn(router, 'navigate');

    const newDept: Department = { id: 'marketing', name: 'Marketing', group: 'Business' };
    const component = fixture.componentInstance as unknown as {
      store: { create: (dto: unknown) => Promise<unknown> };
      appId: string;
    };

    const navPromise = component.store
      .create({ name: 'Marketing', group: 'Business' })
      .then(() => router.navigate(['/app', component.appId, 'departments']));

    httpMock.expectOne('/api/departments').flush(newDept);
    await navPromise;

    expect(navigateSpy).toHaveBeenCalledWith(['/app', 'acme', 'departments']);
  });
});
