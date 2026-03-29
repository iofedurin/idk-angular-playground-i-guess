export type UserRole = 'viewer' | 'editor' | 'admin';

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
}

export type CreateUserDto = Omit<User, 'id'>;
export type UpdateUserDto = Partial<CreateUserDto>;

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
}
