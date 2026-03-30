import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentsListComponent } from './departments-list';
import { Department } from '@entities/department';

const mockDepartments: Department[] = [
  { id: 'engineering', name: 'Engineering', group: 'Technology' },
  { id: 'design', name: 'Design', group: 'Technology' },
];

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('DepartmentsListComponent', () => {
  let fixture: ComponentFixture<DepartmentsListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentsListComponent],
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

    fixture = TestBed.createComponent(DepartmentsListComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows loading spinner before data arrives', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table')).toBeFalsy();

    httpMock.expectOne('/api/departments').flush([]);
  });

  it('renders table with departments after data loads', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush(mockDepartments);
    await flush();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Engineering');
    expect(fixture.nativeElement.textContent).toContain('Design');
  });

  it('shows empty state when no departments', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No departments found');
  });

  it('shows error alert on HTTP failure', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne('/api/departments')
      .flush('error', { status: 500, statusText: 'Server Error' });
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.alert-error')).toBeTruthy();
  });

  it('"Add Department" link contains correct appId', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([]);
    await flush();
    fixture.detectChanges();

    const addLink = fixture.nativeElement.querySelector('a.btn-primary');
    expect(addLink?.getAttribute('href')).toContain('/app/acme/departments/new');
  });

  it('"Edit" links contain correct appId and department id', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush(mockDepartments);
    await flush();
    fixture.detectChanges();

    const editLinks = fixture.nativeElement.querySelectorAll('a.btn-ghost');
    expect(editLinks[0]?.getAttribute('href')).toContain('/app/acme/departments/engineering');
    expect(editLinks[1]?.getAttribute('href')).toContain('/app/acme/departments/design');
  });
});
