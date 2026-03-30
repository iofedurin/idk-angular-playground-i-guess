import type { Department } from '@entities/department';
import { User } from '@entities/user';

export interface UserFilters {
  search: string;
  role: string;
  department: string;
  country: string;
  jobTitle: string;
  active: string; // '' | 'true' | 'false'
}

export const EMPTY_FILTERS: UserFilters = {
  search: '',
  role: '',
  department: '',
  country: '',
  jobTitle: '',
  active: '',
};

export function applyFilters(
  users: User[],
  filters: UserFilters,
  departments?: Department[],
): User[] {
  return users.filter((user) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matches =
        user.username.toLowerCase().includes(q) ||
        user.firstName.toLowerCase().includes(q) ||
        user.lastName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filters.role && user.role !== filters.role) return false;
    if (filters.department) {
      if (filters.department.startsWith('group:') && departments) {
        const groupName = filters.department.slice(6);
        const deptIds = departments.filter((d) => d.group === groupName).map((d) => d.id);
        if (!deptIds.includes(user.department)) return false;
      } else {
        if (user.department !== filters.department) return false;
      }
    }
    if (filters.country && user.country !== filters.country) return false;
    if (filters.jobTitle && user.jobTitle !== filters.jobTitle) return false;
    if (filters.active === 'true' && !user.active) return false;
    if (filters.active === 'false' && user.active) return false;
    return true;
  });
}
