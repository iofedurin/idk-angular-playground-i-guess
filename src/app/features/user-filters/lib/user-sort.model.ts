export type SortField = 'name' | 'role' | 'department';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = { field: 'name', direction: 'asc' };
