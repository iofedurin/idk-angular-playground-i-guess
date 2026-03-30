import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserFiltersComponent } from './user-filters';
import { EMPTY_FILTERS } from '../lib/user-filters.model';

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('UserFiltersComponent', () => {
  let fixture: ComponentFixture<UserFiltersComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFiltersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFiltersComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('filters', EMPTY_FILTERS);
  });

  afterEach(() => httpMock.verify());

  it('renders search input', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([]);
    httpMock.expectOne('/api/countries').flush([]);
    httpMock.expectOne('/api/job-titles').flush([]);

    expect(fixture.nativeElement.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('renders role select with all roles', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([]);
    httpMock.expectOne('/api/countries').flush([]);
    httpMock.expectOne('/api/job-titles').flush([]);
    await flush();
    fixture.detectChanges();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>,
    )[0].options;
    const values = Array.from(options).map((o) => o.value);
    expect(values).toContain('viewer');
    expect(values).toContain('editor');
    expect(values).toContain('admin');
  });

  it('renders department options from store', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne('/api/departments')
      .flush([{ id: 'eng', name: 'Engineering', group: 'Technology' }]);
    httpMock.expectOne('/api/countries').flush([]);
    httpMock.expectOne('/api/job-titles').flush([]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Engineering');
  });

  it('renders country options from store', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([]);
    httpMock
      .expectOne('/api/countries')
      .flush([{ code: 'US', name: 'United States' }]);
    httpMock.expectOne('/api/job-titles').flush([]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('United States');
  });

  it('renders job title options from store', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([]);
    httpMock.expectOne('/api/countries').flush([]);
    httpMock
      .expectOne('/api/job-titles')
      .flush([{ id: 'fe', name: 'Frontend Developer' }]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Frontend Developer');
  });

  it('renders active select with all status options', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/departments').flush([]);
    httpMock.expectOne('/api/countries').flush([]);
    httpMock.expectOne('/api/job-titles').flush([]);
    await flush();
    fixture.detectChanges();

    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    const activeSelect = selects[selects.length - 1];
    const values = Array.from(activeSelect.options).map((o) => o.value);
    expect(values).toContain('');
    expect(values).toContain('true');
    expect(values).toContain('false');
  });
});
