import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AuditEntry } from '@entities/audit-entry';
import { AuditFeedComponent } from './audit-feed';

const mockEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  id: 'al1',
  appId: 'acme',
  action: 'create',
  entityType: 'user',
  entityId: 'u1',
  userName: 'bmueller',
  timestamp: '2026-03-30T10:00:00Z',
  details: 'Created user jdoe',
  ...overrides,
});

@Component({
  imports: [AuditFeedComponent],
  template: `
    <app-audit-feed
      [entries]="entries"
      [loading]="loading"
      [hasMore]="hasMore"
      (loadMore)="onLoadMore()"
    />
  `,
})
class TestHost {
  entries: AuditEntry[] = [];
  loading = false;
  hasMore = false;
  loadMoreCount = 0;
  onLoadMore() {
    this.loadMoreCount++;
  }
}

describe('AuditFeedComponent', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor() {}
        observe() {}
        disconnect() {}
      },
    );
    TestBed.configureTestingModule({});
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows empty state when no entries and not loading', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No audit entries found');
  });

  it('renders entry details', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.entries = [mockEntry()];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Created user jdoe');
    expect(text).toContain('bmueller');
  });

  it('renders multiple entries', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.entries = [
      mockEntry({ id: 'al1', details: 'Created user jdoe' }),
      mockEntry({ id: 'al2', details: 'Deleted user mlopez', action: 'delete' }),
    ];
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('li'));
    expect(items).toHaveLength(2);
  });

  it('shows spinner when loading', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.loading'))).not.toBeNull();
  });

  it('renders sentinel when hasMore is true', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.hasMore = true;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[appInfiniteScroll]'))).not.toBeNull();
  });

  it('does not render sentinel when hasMore is false', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.hasMore = false;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[appInfiniteScroll]'))).toBeNull();
  });
});
