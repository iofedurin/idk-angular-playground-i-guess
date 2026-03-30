import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JobTitleStore } from '../../job-title.store';

@Component({
  selector: 'app-job-title-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @for (jt of store.jobTitles(); track jt.id) {
      <option [value]="jt.id">{{ jt.name }}</option>
    }
  `,
})
export class JobTitleOptionsComponent {
  protected readonly store = inject(JobTitleStore);
}
