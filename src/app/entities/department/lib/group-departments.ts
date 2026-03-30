import type { Department } from '../department.model';

export interface DepartmentGroup {
  label: string;
  departments: Department[];
}

export function groupDepartments(departments: Department[]): DepartmentGroup[] {
  const map = new Map<string, Department[]>();

  for (const d of departments) {
    const key = d.group || 'Other';
    const list = map.get(key);
    if (list) {
      list.push(d);
    } else {
      map.set(key, [d]);
    }
  }

  return Array.from(map, ([label, departments]) => ({ label, departments })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}
