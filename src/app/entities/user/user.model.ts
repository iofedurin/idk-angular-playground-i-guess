import type { UserRole } from './lib/roles';
export type { UserRole };

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  country: string;
  department: string;
  jobTitle: string;
  role: UserRole;
  active: boolean;
  bio: string;
  managerId: string | null;
}

export type CreateUserDto = Omit<User, 'id'>;
export type UpdateUserDto = Partial<CreateUserDto>;

export interface UsersPage {
  data: User[];
  items: number;
  pages: number;
  first: number;
  prev: number | null;
  next: number | null;
  last: number;
}

export interface UserPageParams {
  page: number;
  q?: string;
  role?: string;
  department?: string;
  country?: string;
  jobTitle?: string;
  active?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const PER_PAGE = 10;

export interface UserFormModel {
  username: string;
  name: { firstName: string; lastName: string };
  email: string;
  age: number;
  country: string;
  department: string;
  jobTitle: string;
  role: UserRole;
  active: boolean;
  bio: string;
  managerId: string;
}
