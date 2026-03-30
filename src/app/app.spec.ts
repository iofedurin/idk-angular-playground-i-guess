import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the component', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/apps').flush([]);
    await flush();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calls loadApps on init', async () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/apps');
    expect(req.request.method).toBe('GET');
    req.flush([]);
    await flush();
  });
});
