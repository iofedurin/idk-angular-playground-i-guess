import { ChangeDetectionStrategy, Component, input, Signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormRoot } from '@angular/forms/signals';
import {
  ActiveFieldComponent,
  AgeFieldComponent,
  BioFieldComponent,
  EmailFieldComponent,
  NameGroupComponent,
  RoleFieldComponent,
  UsernameFieldComponent,
  UserForm,
  UserFormModel,
} from '@entities/user';
import { CountrySelectComponent } from '@entities/country';
import { DepartmentSelectComponent } from '@entities/department';
import { JobTitleSelectComponent } from '@entities/job-title';
import { SubmitButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-user-form',
  imports: [
    FormRoot,
    JsonPipe,
    RouterLink,
    NameGroupComponent,
    EmailFieldComponent,
    UsernameFieldComponent,
    AgeFieldComponent,
    CountrySelectComponent,
    DepartmentSelectComponent,
    JobTitleSelectComponent,
    RoleFieldComponent,
    ActiveFieldComponent,
    BioFieldComponent,
    SubmitButtonComponent,
  ],
  templateUrl: './user-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent {
  readonly userForm = input.required<UserForm>();
  readonly model = input.required<Signal<UserFormModel>>();
  readonly title = input.required<string>();
  readonly submitLabel = input<string>('Save');
  readonly cancelLink = input<string[]>(['/']);
}
