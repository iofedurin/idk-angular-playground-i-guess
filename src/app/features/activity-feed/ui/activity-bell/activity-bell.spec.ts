import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, Subject } from 'rxjs';
import { WebSocketService } from '@shared/lib';
import { ActivityFeedStore } from '../../activity-feed.store';
import { ActivityBellComponent } from './activity-bell';
import { ActivityEvent } from '../../activity-feed.model';

describe('ActivityBellComponent', () => {
  let fixture: ComponentFixture<ActivityBellComponent>;
  let store: InstanceType<typeof ActivityFeedStore>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityBellComponent],
      providers: [
        {
          provide: WebSocketService,
          useValue: { onPrefix$: () => EMPTY, connected: () => false, reconnecting: () => false },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityBellComponent);
    store = TestBed.inject(ActivityFeedStore);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('renders the bell button', () => {
    expect(el.querySelector('[aria-label="Notifications"]')).toBeTruthy();
  });

  it('hides badge when unreadCount is 0', () => {
    expect(el.querySelector('.badge')).toBeNull();
  });

  it('shows badge with unread count', () => {
    store.addEvent({ resource: 'users', action: 'created', summary: 'user created', timestamp: 1 });
    store.addEvent({ resource: 'users', action: 'created', summary: 'user created', timestamp: 2 });
    fixture.detectChanges();

    const badge = el.querySelector('.badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('focusing bell (dropdown open) marks all as read', () => {
    store.addEvent({ resource: 'users', action: 'created', summary: 'user created', timestamp: 1 });
    fixture.detectChanges();

    const btn = el.querySelector<HTMLElement>('[aria-label="Notifications"]');
    btn?.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    expect(store.unreadCount()).toBe(0);
    expect(el.querySelector('.badge')).toBeNull();
  });

  it('renders event list in dropdown', () => {
    store.addEvent({ resource: 'users', action: 'created', summary: 'Alice created', timestamp: Date.now() });
    store.addEvent({ resource: 'users', action: 'deleted', summary: 'Bob deleted', timestamp: Date.now() });
    fixture.detectChanges();

    const items = el.querySelectorAll('.dropdown-content .text-sm.border-b');
    expect(items.length).toBe(2);
    // most recently added event is first
    expect(items[0].textContent).toContain('Bob deleted');
    expect(items[1].textContent).toContain('Alice created');
  });

  it('shows empty state when no events', () => {
    expect(el.querySelector('.dropdown-content')?.textContent).toContain('No recent activity');
  });
});
