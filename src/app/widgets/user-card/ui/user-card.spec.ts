import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserCardComponent } from './user-card';
import { User } from '@entities/user';

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
  bio: 'Frontend enthusiast',
};

describe('UserCardComponent', () => {
  let fixture: ComponentFixture<UserCardComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('renders initials avatar', () => {
    const avatar = el.querySelector('.avatar span');
    expect(avatar?.textContent?.trim()).toBe('JD');
  });

  it('renders full name and username', () => {
    expect(el.textContent).toContain('John Doe');
    expect(el.textContent).toContain('@jdoe');
  });

  it('renders email and age', () => {
    expect(el.textContent).toContain('john@example.com');
    expect(el.textContent).toContain('30');
  });

  it('renders role badge', () => {
    const badge = el.querySelector('.badge.badge-primary');
    expect(badge?.textContent?.trim()).toBe('editor');
  });

  it('renders active status badge', () => {
    const badge = el.querySelector('.badge-success');
    expect(badge?.textContent?.trim()).toBe('Active');
  });

  it('renders inactive badge when user is not active', () => {
    fixture.componentRef.setInput('user', { ...mockUser, active: false });
    fixture.detectChanges();

    const badge = el.querySelector('.badge-neutral');
    expect(badge?.textContent?.trim()).toBe('Inactive');
  });

  it('renders bio', () => {
    expect(el.textContent).toContain('Frontend enthusiast');
  });

  it('does not render bio section when bio is empty', () => {
    fixture.componentRef.setInput('user', { ...mockUser, bio: '' });
    fixture.detectChanges();

    expect(el.textContent).not.toContain('Bio');
  });
});
