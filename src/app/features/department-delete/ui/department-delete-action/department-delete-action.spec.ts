import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentDeleteActionComponent } from './department-delete-action';
import { Department } from '@entities/department';
import { DepartmentStore } from '@entities/department';

const mockDepartments: Department[] = [
  { id: 'engineering', name: 'Engineering', group: 'Technology' },
  { id: 'design', name: 'Design', group: 'Technology' },
];

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('DepartmentDeleteActionComponent', () => {
  let fixture: ComponentFixture<DepartmentDeleteActionComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentDeleteActionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    // Pre-populate the store so delete can find the entity
    const store = TestBed.inject(DepartmentStore);
    const loadPromise = store.loadAll();
    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne('/api/departments').flush(mockDepartments);
    await loadPromise;

    fixture = TestBed.createComponent(DepartmentDeleteActionComponent);
    fixture.componentRef.setInput('departmentId', 'engineering');
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders a Delete button', () => {
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn?.textContent?.trim()).toContain('Delete');
  });

  it('calls store.remove() and removes entity on click', async () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    btn.click();

    httpMock.expectOne('/api/departments/engineering').flush(null);
    await flush();
    fixture.detectChanges();

    const store = TestBed.inject(DepartmentStore);
    expect(store.entities().map((d) => d.id)).not.toContain('engineering');
  });

  it('disables the button while deleting', async () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    btn.click();
    fixture.detectChanges();

    expect(btn.disabled).toBe(true);

    httpMock.expectOne('/api/departments/engineering').flush(null);
    await flush();
    fixture.detectChanges();

    expect(btn.disabled).toBe(false);
  });
});
