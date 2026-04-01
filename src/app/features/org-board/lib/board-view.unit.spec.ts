import { describe, expect, it } from 'vitest';
import {
  computeBoardEdges,
  computeBoardNodes,
  computeDirectReportsCounts,
  computeHighlightedUserIds,
  computeValidTargets,
} from './board-view';
import type { User } from '@entities/user';
import type { BoardPosition } from '../org-board.model';

const makeUser = (id: string, managerId: string | null = null): User => ({
  id,
  username: `u${id}`,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  email: `u${id}@test.com`,
  age: 30,
  country: 'US',
  department: 'eng',
  jobTitle: 'dev',
  role: 'editor',
  active: true,
  bio: '',
  managerId,
});

// u3 → u1 → u2  (u3 is root, u1 managed by u3, u2 managed by u1)
const users: User[] = [
  makeUser('3', null),
  makeUser('1', '3'),
  makeUser('2', '1'),
];

const positions: BoardPosition[] = [
  { id: 'bp3', userId: '3', x: 0, y: 0 },
  { id: 'bp1', userId: '1', x: 100, y: 100 },
  { id: 'bp2', userId: '2', x: 200, y: 200 },
];

const userMap: Record<string, User> = Object.fromEntries(users.map((u) => [u.id, u]));

describe('computeBoardNodes', () => {
  it('creates nodes only for users with board positions', () => {
    const extraUser = makeUser('99', null);
    const map = { ...userMap, '99': extraUser };
    const nodes = computeBoardNodes(positions, map, {});
    expect(nodes).toHaveLength(3);
    expect(nodes.map((n) => n.userId)).not.toContain('99');
  });

  it('includes x, y, positionId from position', () => {
    const nodes = computeBoardNodes(positions, userMap, {});
    const n = nodes.find((n) => n.userId === '3')!;
    expect(n.x).toBe(0);
    expect(n.y).toBe(0);
    expect(n.positionId).toBe('bp3');
  });

  it('includes departmentIcon from deptMap when available', () => {
    const deptMap = { eng: { icon: 'laptop' } };
    const nodes = computeBoardNodes(positions, userMap, deptMap);
    expect(nodes[0].departmentIcon).toBe('laptop');
  });

  it('returns empty array when positions is empty', () => {
    expect(computeBoardNodes([], userMap, {})).toHaveLength(0);
  });

  it('skips positions whose userId is not in userMap', () => {
    const nodes = computeBoardNodes([{ id: 'ghost', userId: 'unknown', x: 0, y: 0 }], userMap, {});
    expect(nodes).toHaveLength(0);
  });

  it('sets directReportsCount from provided map', () => {
    const counts = new Map([['3', 1], ['1', 1]]);
    const nodes = computeBoardNodes(positions, userMap, {}, counts);
    expect(nodes.find((n) => n.userId === '3')!.directReportsCount).toBe(1);
    expect(nodes.find((n) => n.userId === '1')!.directReportsCount).toBe(1);
    expect(nodes.find((n) => n.userId === '2')!.directReportsCount).toBe(0);
  });

  it('defaults directReportsCount to 0 when map not provided', () => {
    const nodes = computeBoardNodes(positions, userMap, {});
    expect(nodes.every((n) => n.directReportsCount === 0)).toBe(true);
  });
});

describe('computeDirectReportsCounts', () => {
  it('counts on-board subordinates per on-board manager', () => {
    const onBoard = new Set(['1', '2', '3']);
    const counts = computeDirectReportsCounts(users, onBoard);
    expect(counts.get('3')).toBe(1); // u1 reports to u3
    expect(counts.get('1')).toBe(1); // u2 reports to u1
    expect(counts.has('2')).toBe(false); // u2 has no subordinates
  });

  it('does not count off-board subordinates', () => {
    const onBoard = new Set(['1', '3']); // u2 not on board
    const counts = computeDirectReportsCounts(users, onBoard);
    expect(counts.get('1')).toBeUndefined(); // u2 (u1's report) is off board
  });

  it('returns empty map when nobody is on board', () => {
    expect(computeDirectReportsCounts(users, new Set()).size).toBe(0);
  });
});

describe('computeBoardEdges', () => {
  const onBoard = new Set(['1', '2', '3']);

  it('creates edges for manager-subordinate pairs both on board', () => {
    const edges = computeBoardEdges(users, onBoard);
    expect(edges).toHaveLength(2); // 3→1 and 1→2
  });

  it('edge has correct id, managerId, subordinateId, outputId, inputId', () => {
    const edges = computeBoardEdges(users, onBoard);
    const e = edges.find((e) => e.managerId === '3')!;
    expect(e.id).toBe('edge-3-1');
    expect(e.subordinateId).toBe('1');
    expect(e.outputId).toBe('out-3');
    expect(e.inputId).toBe('in-1');
  });

  it('excludes edge when manager is not on board', () => {
    const partial = new Set(['1', '2']); // u3 not on board
    const edges = computeBoardEdges(users, partial);
    expect(edges.find((e) => e.managerId === '3')).toBeUndefined();
  });

  it('excludes users with no managerId', () => {
    const edges = computeBoardEdges(users, onBoard);
    expect(edges.find((e) => e.subordinateId === '3')).toBeUndefined();
  });
});

describe('computeValidTargets', () => {
  const onBoard = new Set(['1', '2', '3']);

  it('excludes self from valid targets', () => {
    const targets = computeValidTargets(users, onBoard);
    expect(targets.get('1')).not.toContain('in-1');
  });

  it('excludes ancestors to prevent cycles', () => {
    const targets = computeValidTargets(users, onBoard);
    // u2's ancestors: u1, u3 → both excluded
    const t2 = targets.get('2')!;
    expect(t2).not.toContain('in-1');
    expect(t2).not.toContain('in-3');
    expect(t2).toHaveLength(0);
  });

  it('allows connecting to non-ancestors', () => {
    const targets = computeValidTargets(users, onBoard);
    // u3 (root) can connect to u1 and u2
    const t3 = targets.get('3')!;
    expect(t3).toContain('in-1');
    expect(t3).toContain('in-2');
  });
});

describe('computeHighlightedUserIds', () => {
  it('includes selected user and all descendants', () => {
    const set = computeHighlightedUserIds('1', users);
    expect(set.has('1')).toBe(true);
    expect(set.has('2')).toBe(true); // u2 is descendant of u1
    expect(set.has('3')).toBe(false); // u3 is ancestor, not descendant
  });

  it('returns empty Set when selectedUserId is null', () => {
    expect(computeHighlightedUserIds(null, users).size).toBe(0);
  });
});
