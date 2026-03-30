import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AuditEntry, AuditPage } from '@entities/audit-entry';
import { AuditLogPage } from './audit-log';

const mockEntry = (id: string): AuditEntry => ({
  id,
  appId: 'acme',
  action: 'create',
  entityType: 'user',
  entityId: 'u1',
  userName: 'bmueller',
  timestamp: '2026-03-30T10:00:00Z',
  details: `Entry ${id}`,
});

const makePage = (data: AuditEntry[], next: number | null): AuditPage => ({
  data,
  items: 25,
  pages: 3,
  first: 1,
  prev: null,
  next,
  last: 3,
});

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('AuditLogPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor() {}
        observe() {}
        disconnect() {}
      },
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    httpMock.verify();
  });

  it('shows spinner while loading', () => {
    const fixture = TestBed.createComponent(AuditLogPage);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.loading'))).not.toBeNull();
    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(makePage([], null));
  });

  it('renders entries after load', async () => {
    const fixture = TestBed.createComponent(AuditLogPage);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(
      makePage([mockEntry('al1'), mockEntry('al2')], null),
    );
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Entry al1');
    expect(fixture.nativeElement.textContent).toContain('Entry al2');
  });

  it('shows error message on failure', async () => {
    const fixture = TestBed.createComponent(AuditLogPage);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === '/api/audit-log').flush('error', {
      status: 500,
      statusText: 'Server Error',
    });
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Failed to load audit log');
  });

  it('loads next page when loadMore fires', async () => {
    const fixture = TestBed.createComponent(AuditLogPage);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(
      makePage([mockEntry('al1')], 2),
    );
    await flush();
    fixture.detectChanges();

    fixture.componentInstance['loadNext']();

    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(
      makePage([mockEntry('al11')], null),
    );
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Entry al1');
    expect(fixture.nativeElement.textContent).toContain('Entry al11');
  });

  it('shows empty state when no entries', async () => {
    const fixture = TestBed.createComponent(AuditLogPage);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === '/api/audit-log').flush(makePage([], null));
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No audit entries found');
  });
});
