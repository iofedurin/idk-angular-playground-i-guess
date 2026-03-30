import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { AuditEntryStore } from '@entities/audit-entry';
import { AuditFeedComponent } from '@widgets/audit-feed';

@Component({
  selector: 'app-audit-log',
  imports: [AuditFeedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Audit Log</h1>

      @if (store.error()) {
        <div role="alert" class="alert alert-error mb-4">{{ store.error() }}</div>
      }

      <app-audit-feed
        [entries]="store.entries()"
        [loading]="store.loading()"
        [hasMore]="store.hasMore()"
        (loadMore)="loadNext()"
      />
    </div>
  `,
})
export class AuditLogPage implements OnInit {
  protected readonly store = inject(AuditEntryStore);

  ngOnInit(): void {
    this.store.loadPage(1);
  }

  protected loadNext(): void {
    this.store.loadPage(this.store.currentPage() + 1);
  }
}
