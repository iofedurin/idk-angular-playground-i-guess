import { Department } from '@entities/department';
import { User } from '@entities/user';
import { applyFilters, EMPTY_FILTERS } from './user-filters.model';

const users: User[] = [
  {
    id: '1',
    username: 'jdoe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    age: 30,
    country: 'US',
    department: 'engineering',
    jobTitle: 'senior-frontend',
    role: 'editor',
    active: true,
    bio: '',
  },
  {
    id: '2',
    username: 'asmith',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@globex.com',
    age: 28,
    country: 'GB',
    department: 'design',
    jobTitle: 'ux-designer',
    role: 'admin',
    active: false,
    bio: '',
  },
  {
    id: '3',
    username: 'bjones',
    firstName: 'Bob',
    lastName: 'Jones',
    email: 'bob@example.com',
    age: 35,
    country: 'US',
    department: 'engineering',
    jobTitle: 'senior-frontend',
    role: 'viewer',
    active: true,
    bio: '',
  },
];

describe('applyFilters', () => {
  it('returns all users when filters are empty', () => {
    expect(applyFilters(users, EMPTY_FILTERS)).toHaveLength(3);
  });

  describe('search', () => {
    it('filters by username (case-insensitive)', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, search: 'JDOE' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filters by firstName', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, search: 'alice' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('filters by lastName', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, search: 'jones' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('filters by email', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, search: 'globex' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('returns empty when no match', () => {
      expect(applyFilters(users, { ...EMPTY_FILTERS, search: 'xyz123' })).toHaveLength(0);
    });
  });

  describe('role', () => {
    it('filters by exact role', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, role: 'admin' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('empty string does not filter', () => {
      expect(applyFilters(users, { ...EMPTY_FILTERS, role: '' })).toHaveLength(3);
    });
  });

  describe('department', () => {
    it('filters by department id', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, department: 'engineering' });
      expect(result).toHaveLength(2);
    });

    describe('group filtering', () => {
      const departments: Department[] = [
        { id: 'engineering', name: 'Engineering', group: 'Technology' },
        { id: 'design', name: 'Design', group: 'Technology' },
        { id: 'hr', name: 'HR', group: 'Operations' },
      ];

      it('filters by group when value starts with "group:" and departments provided', () => {
        const result = applyFilters(
          users,
          { ...EMPTY_FILTERS, department: 'group:Technology' },
          departments,
        );
        // users[0] engineering, users[1] design, users[2] engineering — all Technology
        expect(result).toHaveLength(3);
      });

      it('returns no users when group has no matching departments', () => {
        const result = applyFilters(
          users,
          { ...EMPTY_FILTERS, department: 'group:Operations' },
          departments,
        );
        expect(result).toHaveLength(0);
      });

      it('falls back to exact match when departments not provided', () => {
        const result = applyFilters(users, {
          ...EMPTY_FILTERS,
          department: 'group:Technology',
        });
        // no user has department === 'group:Technology', so no match
        expect(result).toHaveLength(0);
      });

      it('still works with exact department id when departments provided', () => {
        const result = applyFilters(
          users,
          { ...EMPTY_FILTERS, department: 'engineering' },
          departments,
        );
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('country', () => {
    it('filters by country code', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, country: 'GB' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('jobTitle', () => {
    it('filters by job title id', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, jobTitle: 'ux-designer' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('active', () => {
    it('"true" returns only active users', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, active: 'true' });
      expect(result).toHaveLength(2);
      expect(result.every((u) => u.active)).toBe(true);
    });

    it('"false" returns only inactive users', () => {
      const result = applyFilters(users, { ...EMPTY_FILTERS, active: 'false' });
      expect(result).toHaveLength(1);
      expect(result[0].active).toBe(false);
    });

    it('empty string does not filter', () => {
      expect(applyFilters(users, { ...EMPTY_FILTERS, active: '' })).toHaveLength(3);
    });
  });

  describe('combined filters (AND logic)', () => {
    it('applies multiple filters simultaneously', () => {
      const result = applyFilters(users, {
        ...EMPTY_FILTERS,
        country: 'US',
        role: 'editor',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('returns empty when combined filters have no match', () => {
      const result = applyFilters(users, {
        ...EMPTY_FILTERS,
        role: 'admin',
        active: 'true',
      });
      expect(result).toHaveLength(0);
    });
  });
});
