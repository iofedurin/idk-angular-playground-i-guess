import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { createDepartmentForm, DepartmentFormModel, DepartmentStore } from '@entities/department';
import { DepartmentFormComponent } from '@widgets/department-form';

@Component({
  selector: 'app-department-create-page',
  imports: [DepartmentFormComponent],
  template: `
    <app-department-form
      [departmentForm]="departmentForm"
      title="New Department"
      submitLabel="Create"
      [cancelLink]="['/app', appId, 'departments']"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentCreatePage {
  private readonly router = inject(Router);
  private readonly store = inject(DepartmentStore);
  protected readonly appId = inject(ActivatedRoute).snapshot.paramMap.get('appId')!;

  protected readonly model = signal<DepartmentFormModel>({ name: '', group: '' });

  protected readonly departmentForm = createDepartmentForm(this.model, {
    onSubmit: async () => {
      await this.store.create(this.model());
      await this.router.navigate(['/app', this.appId, 'departments']);
    },
  });
}
