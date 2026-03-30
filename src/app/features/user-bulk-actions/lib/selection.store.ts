import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

interface SelectionState {
  selectedIds: string[];
}

export const SelectionStore = signalStore(
  { providedIn: 'root' },
  withState<SelectionState>({ selectedIds: [] }),
  withComputed(({ selectedIds }) => ({
    selectedCount: computed(() => selectedIds().length),
  })),
  withMethods((store) => ({
    toggle(id: string): void {
      const ids = store.selectedIds();
      patchState(store, {
        selectedIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      });
    },
    selectAll(ids: string[]): void {
      patchState(store, { selectedIds: ids });
    },
    clearAll(): void {
      patchState(store, { selectedIds: [] });
    },
    isSelected(id: string): boolean {
      return store.selectedIds().includes(id);
    },
    allSelected(totalIds: string[]): boolean {
      return totalIds.length > 0 && totalIds.every((id) => store.selectedIds().includes(id));
    },
  })),
);
