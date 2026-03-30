import { User } from '@entities/user';
import { DEFAULT_SORT, sortUsers } from './user-sort.model';

const users: User[] = [
  {
    id: '1',
    username: 'charlie',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie@example.com',
    age: 25,
    country: 'US',
    department: 'engineering',
    jobTitle: 'dev',
    role: 'viewer',
    active: true,
    bio: '',
  },
  {
    id: '2',
    username: 'alice',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    age: 30,
    country: 'US',
    department: 'design',
    jobTitle: 'designer',
    role: 'admin',
    active: true,
    bio: '',
  },
  {
    id: '3',
    username: 'bob',
    firstName: 'Bob',
    lastName: 'Jones',
    email: 'bob@example.com',
    age: 28,
    country: 'US',
    department: 'hr',
    jobTitle: 'recruiter',
    role: 'editor',
    active: true,
    bio: '',
  },
];

describe('sortUsers', () => {
  it('DEFAULT_SORT is name asc', () => {
    const result = sortUsers(users, DEFAULT_SORT);
    expect(result.map((u) => u.id)).toEqual(['2', '3', '1']); // Alice, Bob, Charlie
  });

  describe('name', () => {
    it('sorts ascending', () => {
      const result = sortUsers(users, { field: 'name', direction: 'asc' });
      expect(result.map((u) => u.firstName)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts descending', () => {
      const result = sortUsers(users, { field: 'name', direction: 'desc' });
      expect(result.map((u) => u.firstName)).toEqual(['Charlie', 'Bob', 'Alice']);
    });
  });

  describe('role', () => {
    it('sorts ascending: admin → editor → viewer', () => {
      const result = sortUsers(users, { field: 'role', direction: 'asc' });
      expect(result.map((u) => u.role)).toEqual(['admin', 'editor', 'viewer']);
    });

    it('sorts descending: viewer → editor → admin', () => {
      const result = sortUsers(users, { field: 'role', direction: 'desc' });
      expect(result.map((u) => u.role)).toEqual(['viewer', 'editor', 'admin']);
    });
  });

  describe('department', () => {
    it('sorts ascending', () => {
      const result = sortUsers(users, { field: 'department', direction: 'asc' });
      expect(result.map((u) => u.department)).toEqual(['design', 'engineering', 'hr']);
    });

    it('sorts descending', () => {
      const result = sortUsers(users, { field: 'department', direction: 'desc' });
      expect(result.map((u) => u.department)).toEqual(['hr', 'engineering', 'design']);
    });
  });

  it('does not mutate the input array', () => {
    const original = [...users];
    sortUsers(users, { field: 'name', direction: 'desc' });
    expect(users).toEqual(original);
  });
});
