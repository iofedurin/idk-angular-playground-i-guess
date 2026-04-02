import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvitationStore } from '@entities/invitation';
import { UserInviteDialogComponent } from './user-invite-dialog';

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('UserInviteDialogComponent', () => {
  let fixture: ComponentFixture<UserInviteDialogComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    // jsdom may not implement HTMLDialogElement.showModal/close
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = () => {};
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = () => {};
    }

    await TestBed.configureTestingModule({
      imports: [UserInviteDialogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(UserInviteDialogComponent);
    fixture.componentRef.setInput('appId', 'acme');
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders email input and role select', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[type="email"]')).not.toBeNull();
    expect(el.querySelector('select')).not.toBeNull();
  });

  it('renders Send Invite button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.includes('Send Invite'))).toBe(true);
  });

  it('closes dialog when Cancel is clicked', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cancelBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cancel'),
    ) as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['open']()).toBe(false);
  });

  it('InvitationStore.create() POSTs to /api/invitations', async () => {
    const store = TestBed.inject(InvitationStore);

    const createPromise = store.create({
      email: 'invite@example.com',
      role: 'editor',
      appId: 'acme',
    });

    const req = httpMock.expectOne('/api/invitations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.email).toBe('invite@example.com');
    expect(req.request.body.role).toBe('editor');
    expect(req.request.body.appId).toBe('acme');

    req.flush({
      id: '100',
      email: 'invite@example.com',
      role: 'editor',
      status: 'pending',
      createdAt: '2026-01-01T00:00:00Z',
      appId: 'acme',
    });

    await createPromise;
    expect(store.entities()).toHaveLength(1);
  });
});
