import { User } from '@entities/user';

export type SortField = 'name' | 'role' | 'department';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = { field: 'name', direction: 'asc' };

const ROLE_ORDER: Record<string, number> = { admin: 0, editor: 1, viewer: 2 };

export function sortUsers(users: User[], sort: SortState): User[] {
  return [...users].sort((a, b) => {
    let cmp: number;
    switch (sort.field) {
      case 'name':
        cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        break;
      case 'role':
        cmp = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
        break;
      case 'department':
        cmp = a.department.localeCompare(b.department);
        break;
    }
    return sort.direction === 'asc' ? cmp : -cmp;
  });
}
