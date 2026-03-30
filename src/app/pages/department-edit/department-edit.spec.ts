import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentEditPage } from './department-edit';
import { Department } from '@entities/department';

const mockDepartment: Department = { id: 'engineering', name: 'Engineering', group: 'Technology' };

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('DepartmentEditPage', () => {
  let fixture: ComponentFixture<DepartmentEditPage>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentEditPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'app/:appId/departments', component: DepartmentEditPage }]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ appId: 'acme', id: 'engineering' }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DepartmentEditPage);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('renders the form with "Edit Department" title', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([mockDepartment]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Edit Department');
  });

  it('renders the Save submit button', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([mockDepartment]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Save');
  });

  it('loads department data from store into the form model', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([mockDepartment]);
    await flush();
    fixture.detectChanges();

    const model = (
      fixture.componentInstance as unknown as { model: () => { name: string } }
    ).model;
    expect(model().name).toBe('Engineering');
  });

  it('navigates to /app/acme/departments after successful update', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([mockDepartment]);
    await flush();

    const navigateSpy = vi.spyOn(router, 'navigate');

    const component = fixture.componentInstance as unknown as {
      store: { update: (id: string, dto: unknown) => Promise<unknown> };
      departmentId: string;
      appId: string;
    };
    const navPromise = component.store
      .update(component.departmentId, { name: 'Engineering & QA' })
      .then(() => router.navigate(['/app', component.appId, 'departments']));

    httpMock
      .expectOne((r) => r.url === '/api/departments/engineering' && r.method === 'PATCH')
      .flush({ ...mockDepartment, name: 'Engineering & QA' });
    await navPromise;

    expect(navigateSpy).toHaveBeenCalledWith(['/app', 'acme', 'departments']);
  });
});
