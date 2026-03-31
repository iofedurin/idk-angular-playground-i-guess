/**
 * In-memory database for MSW demo mode.
 * Replicates json-server behavior: CRUD, pagination, filtering, sorting, search.
 */

import seedData from './seed-data';

export interface PaginatedResult<T> {
  data: T[];
  items: number;
  pages: number;
  first: number;
  prev: number | null;
  next: number | null;
  last: number;
}

type Record = { id: string; [key: string]: unknown };

let idCounter = Date.now();
function generateId(): string {
  return (idCounter++).toString(36);
}

class Collection<T extends Record> {
  private items: T[];

  constructor(initial: T[]) {
    this.items = structuredClone(initial);
  }

  getAll(filters?: URLSearchParams): T[] {
    let result = [...this.items];
    if (!filters) return result;

    // json-server style: field=value exact match
    for (const [key, value] of filters.entries()) {
      if (key.startsWith('_') || key === 'q') continue;
      result = result.filter((item) => String(item[key]) === value);
    }

    // Full-text search
    const q = filters.get('q');
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter((item) =>
        Object.values(item).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(lower),
        ),
      );
    }

    // Sort: _sort=field or _sort=-field (desc)
    const sort = filters.get('_sort');
    if (sort) {
      const desc = sort.startsWith('-');
      const field = desc ? sort.slice(1) : sort;
      result.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return desc ? -cmp : cmp;
      });
    }

    return result;
  }

  getPage(filters: URLSearchParams): PaginatedResult<T> {
    const all = this.getAll(filters);
    const page = Math.max(1, Number(filters.get('_page') ?? 1));
    const perPage = Math.max(1, Number(filters.get('_per_page') ?? 10));
    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const start = (page - 1) * perPage;
    const data = all.slice(start, start + perPage);

    return {
      data,
      items: totalItems,
      pages: totalPages,
      first: 1,
      prev: page > 1 ? page - 1 : null,
      next: page < totalPages ? page + 1 : null,
      last: totalPages,
    };
  }

  getById(id: string): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  create(data: Omit<T, 'id'> & { id?: string }): T {
    const item = { ...data, id: data.id ?? generateId() } as T;
    this.items.push(item);
    return item;
  }

  update(id: string, changes: Partial<T>): T | undefined {
    const idx = this.items.findIndex((item) => item.id === id);
    if (idx === -1) return undefined;
    this.items[idx] = { ...this.items[idx], ...changes };
    return this.items[idx];
  }

  remove(id: string): boolean {
    const idx = this.items.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }

  bulkRemove(ids: string[]): number {
    const idSet = new Set(ids);
    const before = this.items.length;
    this.items = this.items.filter((item) => !idSet.has(item.id));
    return before - this.items.length;
  }

  bulkUpdate(ids: string[], changes: Partial<T>): T[] {
    const idSet = new Set(ids);
    const updated: T[] = [];
    this.items = this.items.map((item) => {
      if (idSet.has(item.id)) {
        const patched = { ...item, ...changes };
        updated.push(patched);
        return patched;
      }
      return item;
    });
    return updated;
  }
}

export const db = {
  apps: new Collection(seedData.apps),
  users: new Collection(seedData.users),
  departments: new Collection(seedData.departments),
  countries: new Collection(seedData.countries),
  'job-titles': new Collection(seedData['job-titles']),
  invitations: new Collection(seedData.invitations),
  'audit-log': new Collection(seedData['audit-log']),
  'board-positions': new Collection(seedData['board-positions']),
};
