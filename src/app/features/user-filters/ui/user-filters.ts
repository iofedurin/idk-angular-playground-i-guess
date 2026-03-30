import { ChangeDetectionStrategy, Component, DestroyRef, inject, model } from '@angular/core';
import { CountryOptionsComponent, CountryStore } from '@entities/country';
import { DepartmentOptionsComponent, DepartmentStore } from '@entities/department';
import { JobTitleOptionsComponent, JobTitleStore } from '@entities/job-title';
import { ROLE_VALUES } from '@entities/user';
import { UserFilters } from '../lib/user-filters.model';

@Component({
  selector: 'app-user-filters',
  imports: [DepartmentOptionsComponent, CountryOptionsComponent, JobTitleOptionsComponent],
  templateUrl: './user-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFiltersComponent {
  readonly filters = model.required<UserFilters>();
  protected readonly roles = ROLE_VALUES;

  private readonly destroyRef = inject(DestroyRef);
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(CountryStore).load();
    inject(DepartmentStore).load();
    inject(JobTitleStore).load();
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected setSearch(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.filters.update((f) => ({ ...f, search: value }));
    }, 300);
  }

  protected setRole(value: string): void {
    this.filters.update((f) => ({ ...f, role: value }));
  }

  protected setDepartment(value: string): void {
    this.filters.update((f) => ({ ...f, department: value }));
  }

  protected setCountry(value: string): void {
    this.filters.update((f) => ({ ...f, country: value }));
  }

  protected setJobTitle(value: string): void {
    this.filters.update((f) => ({ ...f, jobTitle: value }));
  }

  protected setActive(value: string): void {
    this.filters.update((f) => ({ ...f, active: value }));
  }
}
