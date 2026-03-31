import { describe, it, expect } from 'vitest';
import {
  buildChildrenMap,
  getAncestors,
  getDirectReports,
  getSubtree,
  wouldCreateCycle,
} from './hierarchy';
import type { User } from '../user.model';

const makeUser = (id: string, managerId: string | null = null): User => ({
  id,
  username: id,
  firstName: id,
  lastName: 'Test',
  email: `${id}@test.com`,
  age: 30,
  country: 'US',
  department: 'engineering',
  jobTitle: 'senior-frontend',
  role: 'editor',
  active: true,
  bio: '',
  managerId,
});

// Tree structure:
// A (root)
//   ├── B
//   │     └── D
//   └── C
// E (root, unrelated)
const users: User[] = [
  makeUser('A', null),
  makeUser('B', 'A'),
  makeUser('C', 'A'),
  makeUser('D', 'B'),
  makeUser('E', null),
];

describe('buildChildrenMap', () => {
  it('builds map from users with managerId', () => {
    const map = buildChildrenMap(users);
    expect(map.get('A')).toEqual(new Set(['B', 'C']));
    expect(map.get('B')).toEqual(new Set(['D']));
  });

  it('handles users with null managerId (top-level)', () => {
    const map = buildChildrenMap(users);
    // null never becomes a map key — top-level users skipped
    expect(map.has(null as unknown as string)).toBe(false);
    // E has no children, so it is not a key
    expect(map.has('E')).toBe(false);
    // A does appear as a key because B and C report to it
    expect(map.has('A')).toBe(true);
  });

  it('returns empty map for empty array', () => {
    const map = buildChildrenMap([]);
    expect(map.size).toBe(0);
  });
});

describe('getAncestors', () => {
  it('returns empty set for top-level user (managerId: null)', () => {
    expect(getAncestors('A', users).size).toBe(0);
  });

  it('returns direct manager for one-level subordinate', () => {
    const ancestors = getAncestors('B', users);
    expect(ancestors).toEqual(new Set(['A']));
  });

  it('returns full chain for deeply nested user', () => {
    const ancestors = getAncestors('D', users);
    expect(ancestors).toEqual(new Set(['B', 'A']));
  });

  it('handles non-existent userId gracefully', () => {
    const ancestors = getAncestors('UNKNOWN', users);
    expect(ancestors.size).toBe(0);
  });
});

describe('getDirectReports', () => {
  it('returns direct children of a manager', () => {
    const reports = getDirectReports('A', users);
    expect(reports.map((u) => u.id)).toEqual(expect.arrayContaining(['B', 'C']));
    expect(reports).toHaveLength(2);
  });

  it('returns empty array for user without subordinates', () => {
    expect(getDirectReports('D', users)).toEqual([]);
  });

  it('does not include nested subordinates', () => {
    const reports = getDirectReports('A', users);
    expect(reports.map((u) => u.id)).not.toContain('D');
  });
});

describe('getSubtree', () => {
  it('returns all descendants recursively', () => {
    const subtree = getSubtree('A', users);
    expect(subtree.map((u) => u.id)).toEqual(expect.arrayContaining(['B', 'C', 'D']));
    expect(subtree).toHaveLength(3);
  });

  it('returns empty array for leaf user', () => {
    expect(getSubtree('D', users)).toEqual([]);
  });

  it('handles deep nesting (3+ levels)', () => {
    const deepUsers: User[] = [
      makeUser('root', null),
      makeUser('l1', 'root'),
      makeUser('l2', 'l1'),
      makeUser('l3', 'l2'),
    ];
    const subtree = getSubtree('root', deepUsers);
    expect(subtree.map((u) => u.id)).toEqual(expect.arrayContaining(['l1', 'l2', 'l3']));
    expect(subtree).toHaveLength(3);
  });
});

describe('wouldCreateCycle', () => {
  it('returns false for valid connection (no cycle)', () => {
    // E (unrelated) tries to manage D — no cycle
    expect(wouldCreateCycle('E', 'D', users)).toBe(false);
  });

  it('returns true for self-reference (A → A)', () => {
    expect(wouldCreateCycle('A', 'A', users)).toBe(true);
  });

  it('returns true for direct cycle (A manages B, B tries to manage A)', () => {
    // B is already under A; if B becomes manager of A → cycle
    // "B tries to manage A" → managerId=B, subordinateId=A
    expect(wouldCreateCycle('B', 'A', users)).toBe(true);
  });

  it('returns true for indirect cycle (A→B→D, D tries to manage A)', () => {
    // D is deeply nested under A; D tries to become A's manager → cycle
    expect(wouldCreateCycle('D', 'A', users)).toBe(true);
  });

  it('returns false when connecting unrelated users', () => {
    // E has no relation to A's subtree
    expect(wouldCreateCycle('A', 'E', users)).toBe(false);
  });

  it('handles top-level user (managerId: null) as root', () => {
    // C is A's direct child; C tries to manage A → cycle
    // "C tries to manage A" → managerId=C, subordinateId=A
    expect(wouldCreateCycle('C', 'A', users)).toBe(true);
    // E (unrelated root) managing A is fine — E is not in A's subtree
    expect(wouldCreateCycle('E', 'A', users)).toBe(false);
  });
});
