import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DepartmentStore } from '@entities/department';
import { DepartmentDeleteActionComponent } from '@features/department-delete';
import { ErrorAlertComponent, SpinnerComponent } from '@shared/ui';

@Component({
  selector: 'app-departments-list',
  imports: [RouterLink, DepartmentDeleteActionComponent, SpinnerComponent, ErrorAlertComponent],
  templateUrl: './departments-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentsListComponent implements OnInit {
  readonly store = inject(DepartmentStore);
  protected readonly appId = inject(ActivatedRoute).snapshot.paramMap.get('appId')!;

  ngOnInit() {
    this.store.load();
  }
}
