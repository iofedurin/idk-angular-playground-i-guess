import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReassignConfirmComponent } from './reassign-confirm';
import type { PendingConnection } from '../../org-board.model';

const makePending = (): PendingConnection => ({
  managerId: '2',
  subordinateId: '3',
  subordinateName: 'John Doe',
  currentManagerName: 'Alice Smith',
  newManagerName: 'Bob Johnson',
});

describe('ReassignConfirmComponent', () => {
  let fixture: ComponentFixture<ReassignConfirmComponent>;
  let component: ReassignConfirmComponent;

  beforeEach(async () => {
    // jsdom doesn't implement HTMLDialogElement.showModal/close
    HTMLDialogElement.prototype.showModal = () => {};
    HTMLDialogElement.prototype.close = () => {};

    await TestBed.configureTestingModule({
      imports: [ReassignConfirmComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReassignConfirmComponent);
    component = fixture.componentInstance;
  });

  it('computes empty message when pending is null', () => {
    fixture.componentRef.setInput('pending', null);
    fixture.detectChanges();
    expect((component as any).message()).toBe('');
  });

  it('computes correct message when pending is set', () => {
    fixture.componentRef.setInput('pending', makePending());
    fixture.detectChanges();
    const msg: string = (component as any).message();
    expect(msg).toContain('John Doe');
    expect(msg).toContain('Alice Smith');
    expect(msg).toContain('Bob Johnson');
  });

  it('emits confirmed with PendingConnection when onConfirm is called', () => {
    const pending = makePending();
    fixture.componentRef.setInput('pending', pending);
    fixture.detectChanges();

    let emitted: PendingConnection | undefined;
    component.confirmed.subscribe((p) => (emitted = p));

    (component as any).onConfirm();

    expect(emitted).toEqual(pending);
  });

  it('emits cancelled when onCancel is called', () => {
    fixture.componentRef.setInput('pending', null);
    fixture.detectChanges();

    let cancelCalled = false;
    component.cancelled.subscribe(() => (cancelCalled = true));

    (component as any).onCancel();

    expect(cancelCalled).toBe(true);
  });
});
