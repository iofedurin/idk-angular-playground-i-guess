import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  createDepartmentForm,
  Department,
  DepartmentFormModel,
  DepartmentStore,
} from '@entities/department';
import { DepartmentFormComponent } from '@widgets/department-form';

@Component({
  selector: 'app-department-edit-page',
  imports: [DepartmentFormComponent],
  template: `
    <app-department-form
      [departmentForm]="departmentForm"
      title="Edit Department"
      submitLabel="Save"
      [cancelLink]="['/app', appId, 'departments']"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentEditPage implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(DepartmentStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly appId = this.route.snapshot.paramMap.get('appId')!;
  protected readonly departmentId = this.route.snapshot.paramMap.get('id')!;

  protected readonly model = signal<DepartmentFormModel>({ name: '', group: '' });

  protected readonly departmentForm = createDepartmentForm(this.model, {
    onSubmit: async () => {
      await this.store.update(this.departmentId, this.model());
      await this.router.navigate(['/app', this.appId, 'departments']);
    },
  });

  async ngOnInit() {
    if (!this.store.entityMap()[this.departmentId]) {
      await this.store.loadAll();
    }
    const dept = this.store.entityMap()[this.departmentId];
    if (dept) {
      this.patchModel(dept);
    }
  }

  private patchModel(dept: Department) {
    this.model.set({ name: dept.name, group: dept.group });
  }
}
