import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectionStore } from '../../lib/selection.store';
import { BulkToolbarComponent } from './bulk-toolbar';

describe('BulkToolbarComponent', () => {
  let fixture: ComponentFixture<BulkToolbarComponent>;
  let el: HTMLElement;
  let store: InstanceType<typeof SelectionStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({}).compileComponents();
    fixture = TestBed.createComponent(BulkToolbarComponent);
    el = fixture.nativeElement;
    store = TestBed.inject(SelectionStore);
    fixture.detectChanges();
  });

  it('does not render toolbar when selection is empty', () => {
    expect(el.querySelector('.bg-base-200')).toBeNull();
  });

  it('renders toolbar with count when items are selected', () => {
    store.selectAll(['1', '2', '3']);
    fixture.detectChanges();

    expect(el.querySelector('.bg-base-200')).not.toBeNull();
    expect(el.textContent).toContain('3 selected');
    expect(el.textContent).toContain('Delete selected (3)');
  });

  it('emits deleteSelected on delete button click', () => {
    store.selectAll(['1']);
    fixture.detectChanges();

    let count = 0;
    fixture.componentInstance.deleteSelected.subscribe(() => count++);

    el.querySelector<HTMLButtonElement>('.btn-error')!.click();
    expect(count).toBe(1);
  });

  it('emits changeRole with role on role button click', () => {
    store.selectAll(['1']);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.changeRole.subscribe((r) => emitted.push(r));

    const roleButtons = el.querySelectorAll<HTMLButtonElement>('ul button');
    roleButtons[0].click(); // viewer
    expect(emitted).toEqual(['viewer']);
  });

  it('clears selection on Clear button click', () => {
    store.selectAll(['1', '2']);
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('.btn-ghost')!.click();
    fixture.detectChanges();

    expect(store.selectedCount()).toBe(0);
    expect(el.querySelector('.bg-base-200')).toBeNull();
  });
});
