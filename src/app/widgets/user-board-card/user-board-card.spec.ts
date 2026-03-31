import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserBoardCardComponent } from './user-board-card';
import type { User } from '@entities/user';

const mockUser: User = {
  id: '1',
  username: 'jdoe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 30,
  country: 'US',
  department: 'engineering',
  jobTitle: 'senior-frontend',
  role: 'editor',
  active: true,
  bio: '',
  managerId: null,
};

describe('UserBoardCardComponent', () => {
  let fixture: ComponentFixture<UserBoardCardComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserBoardCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserBoardCardComponent);
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('renders user name and job title', () => {
    expect(el.textContent).toContain('John Doe');
    expect(el.textContent).toContain('senior-frontend');
  });

  it('shows initials in avatar', () => {
    const initials = el.querySelector('.avatar span');
    expect(initials?.textContent?.trim()).toBe('JD');
  });

  it('shows direct reports badge when count > 0', () => {
    fixture.componentRef.setInput('directReportsCount', 3);
    fixture.detectChanges();

    expect(el.querySelector('.badge')?.textContent).toContain('3 reports');
  });

  it('hides direct reports badge when count is 0', () => {
    expect(el.querySelector('.badge')).toBeFalsy();
  });

  it('applies ring classes when selected', () => {
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    const card = el.querySelector('.card');
    expect(card?.classList.contains('ring-2')).toBe(true);
    expect(card?.classList.contains('ring-primary')).toBe(true);
  });

  it('shows department icon when departmentIcon is provided', () => {
    fixture.componentRef.setInput('departmentIcon', 'users');
    fixture.detectChanges();

    expect(el.querySelector('i.airy-users')).toBeTruthy();
  });

  it('does not show department icon when departmentIcon is not provided', () => {
    expect(el.querySelector('[class*="airy-"]')).toBeFalsy();
  });
});
