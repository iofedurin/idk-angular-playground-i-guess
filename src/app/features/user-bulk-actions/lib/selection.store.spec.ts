import { TestBed } from '@angular/core/testing';
import { SelectionStore } from './selection.store';

describe('SelectionStore', () => {
  let store: InstanceType<typeof SelectionStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(SelectionStore);
  });

  it('starts empty', () => {
    expect(store.selectedIds()).toEqual([]);
    expect(store.selectedCount()).toBe(0);
  });

  describe('toggle()', () => {
    it('adds id when not selected', () => {
      store.toggle('1');
      expect(store.selectedIds()).toContain('1');
    });

    it('removes id when already selected', () => {
      store.toggle('1');
      store.toggle('1');
      expect(store.selectedIds()).not.toContain('1');
    });
  });

  describe('selectAll()', () => {
    it('sets all provided ids', () => {
      store.selectAll(['1', '2', '3']);
      expect(store.selectedIds()).toEqual(['1', '2', '3']);
    });

    it('replaces previous selection', () => {
      store.selectAll(['1', '2']);
      store.selectAll(['3']);
      expect(store.selectedIds()).toEqual(['3']);
    });
  });

  describe('clearAll()', () => {
    it('empties the selection', () => {
      store.selectAll(['1', '2']);
      store.clearAll();
      expect(store.selectedIds()).toEqual([]);
      expect(store.selectedCount()).toBe(0);
    });
  });

  describe('isSelected()', () => {
    it('returns true for selected id', () => {
      store.toggle('1');
      expect(store.isSelected('1')).toBe(true);
    });

    it('returns false for non-selected id', () => {
      expect(store.isSelected('99')).toBe(false);
    });
  });

  describe('selectedCount', () => {
    it('reflects current selection size', () => {
      store.toggle('1');
      store.toggle('2');
      expect(store.selectedCount()).toBe(2);
    });
  });

  describe('allSelected()', () => {
    it('returns true when all ids are selected', () => {
      store.selectAll(['1', '2', '3']);
      expect(store.allSelected(['1', '2', '3'])).toBe(true);
    });

    it('returns false when some ids are missing', () => {
      store.selectAll(['1', '2']);
      expect(store.allSelected(['1', '2', '3'])).toBe(false);
    });

    it('returns false for empty totalIds', () => {
      expect(store.allSelected([])).toBe(false);
    });
  });
});
