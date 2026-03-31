export interface Department {
  id: string;
  name: string;
  group: string;
  icon?: string;
}

export type CreateDepartmentDto = { name: string; group: string; icon?: string };
export type UpdateDepartmentDto = Partial<CreateDepartmentDto>;

export interface DepartmentFormModel {
  name: string;
  group: string;
  icon: string;
}
