import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DepartmentStore } from '@entities/department';
import { DepartmentDeleteActionComponent } from '@features/department-delete';

@Component({
  selector: 'app-departments-list',
  imports: [RouterLink, DepartmentDeleteActionComponent],
  templateUrl: './departments-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentsListComponent implements OnInit {
  readonly store = inject(DepartmentStore);
  protected readonly appId = inject(ActivatedRoute).snapshot.paramMap.get('appId')!;

  ngOnInit() {
    this.store.loadAll();
  }
}
