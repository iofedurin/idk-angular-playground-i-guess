import { describe, expect, it } from 'vitest';
import { Department } from '../department.model';
import { groupDepartments } from './group-departments';

const dept = (id: string, name: string, group: string): Department => ({ id, name, group });

describe('groupDepartments', () => {
  it('returns empty array for empty input', () => {
    expect(groupDepartments([])).toEqual([]);
  });

  it('groups departments by group field', () => {
    const departments = [
      dept('eng', 'Engineering', 'Technology'),
      dept('design', 'Design', 'Technology'),
      dept('hr', 'HR', 'Operations'),
    ];

    const result = groupDepartments(departments);

    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Operations');
    expect(result[0].departments).toEqual([dept('hr', 'HR', 'Operations')]);
    expect(result[1].label).toBe('Technology');
    expect(result[1].departments).toEqual([
      dept('eng', 'Engineering', 'Technology'),
      dept('design', 'Design', 'Technology'),
    ]);
  });

  it('sorts groups alphabetically by label', () => {
    const departments = [
      dept('mkt', 'Marketing', 'Business'),
      dept('eng', 'Engineering', 'Technology'),
      dept('hr', 'HR', 'Operations'),
    ];

    const labels = groupDepartments(departments).map((g) => g.label);
    expect(labels).toEqual(['Business', 'Operations', 'Technology']);
  });

  it('preserves order of departments within a group', () => {
    const departments = [
      dept('eng', 'Engineering', 'Technology'),
      dept('design', 'Design', 'Technology'),
      dept('qa', 'QA', 'Technology'),
    ];

    const result = groupDepartments(departments);
    expect(result[0].departments.map((d) => d.id)).toEqual(['eng', 'design', 'qa']);
  });

  it('falls back to "Other" for empty group field', () => {
    const departments = [dept('misc', 'Miscellaneous', '')];

    const result = groupDepartments(departments);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Other');
    expect(result[0].departments).toHaveLength(1);
  });
});
