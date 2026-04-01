import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrgBoardSidebarComponent } from './org-board-sidebar';

// Foblex uses ResizeObserver internally — jsdom doesn't include it
(window as any)['ResizeObserver'] = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
import type { User } from '@entities/user';

const makeUser = (id: string, overrides: Partial<User> = {}): User => ({
  id,
  username: `user${id}`,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  email: `user${id}@test.com`,
  age: 30,
  country: 'US',
  department: 'engineering',
  jobTitle: 'dev',
  role: 'editor',
  active: true,
  bio: '',
  managerId: null,
  ...overrides,
});

// user '0' is manager of '1'; user '1' manages user '2'
const mockUsers: User[] = [
  makeUser('0', { firstName: 'Zara', lastName: 'Boss' }),
  makeUser('1', { firstName: 'Alice', lastName: 'Admin', jobTitle: 'manager', managerId: '0' }),
  makeUser('2', { firstName: 'Bob', lastName: 'Builder', jobTitle: 'dev', managerId: '1' }),
  makeUser('3', { firstName: 'Carol', lastName: 'Coder', jobTitle: 'dev' }),
];

describe('OrgBoardSidebarComponent', () => {
  let fixture: ComponentFixture<OrgBoardSidebarComponent>;
  let component: OrgBoardSidebarComponent;
  let el: HTMLElement;

  function create(userIdsOnBoard = new Set<string>(), selectedUser: User | null = null) {
    fixture = TestBed.createComponent(OrgBoardSidebarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('users', mockUsers);
    fixture.componentRef.setInput('userIdsOnBoard', userIdsOnBoard);
    fixture.componentRef.setInput('selectedUser', selectedUser);
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgBoardSidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  describe('list mode', () => {
    beforeEach(() => create(new Set(['1'])));

    it('renders user list', () => {
      const items = el.querySelectorAll('li');
      expect(items.length).toBe(4);
    });

    it('marks on-board users with badge', () => {
      const badges = el.querySelectorAll('.badge-success');
      expect(badges).toHaveLength(1);
      expect(badges[0].textContent).toContain('on board');
    });

    it('applies fExternalItem to not-on-board users', () => {
      const draggable = el.querySelectorAll('[fExternalItem]');
      expect(draggable).toHaveLength(3); // users 0, 2, 3
    });

    it('filters users by firstName search', async () => {
      const input = el.querySelector('input') as HTMLInputElement;
      input.value = 'alice';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const items = el.querySelectorAll('li');
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toContain('Alice');
    });

    it('filters users by username search', async () => {
      const input = el.querySelector('input') as HTMLInputElement;
      input.value = 'user2';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(el.querySelectorAll('li')).toHaveLength(1);
    });

    it('shows "No employees found" when nothing matches', () => {
      const input = el.querySelector('input') as HTMLInputElement;
      input.value = 'zzznomatch';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(el.textContent).toContain('No employees found');
    });

    it('emits userSelected when on-board user row is clicked', () => {
      const emitted: string[] = [];
      component.userSelected.subscribe((id) => emitted.push(id));

      const onBoardRow = el.querySelector('li.cursor-pointer') as HTMLElement;
      onBoardRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(emitted).toEqual(['1']);
    });

    it('sorts not-on-board users before on-board users', () => {
      const items = el.querySelectorAll('li');
      // users 0, 2, 3 not on board → appear first; user 1 on board → last
      expect(items[0].textContent).not.toContain('Alice Admin');
      expect(items[3].textContent).toContain('Alice Admin');
    });
  });

  describe('details mode', () => {
    // selectedUser is user '1' (managerId: '0'); sidebar computes manager + directReports from mockUsers
    const selectedUser = makeUser('1', {
      firstName: 'Alice',
      lastName: 'Admin',
      jobTitle: 'manager',
      managerId: '0',
      bio: 'My bio',
    });

    beforeEach(() => {
      create(new Set(['1']), selectedUser);
    });

    it('switches to details mode when selectedUser is provided', () => {
      expect(el.querySelector('input[type="text"]')).toBeFalsy(); // no search
      expect(el.textContent).toContain('Alice Admin');
    });

    it('shows user email, jobTitle and department', () => {
      expect(el.textContent).toContain('user1@test.com');
      expect(el.textContent).toContain('manager');
      expect(el.textContent).toContain('engineering');
    });

    it('shows bio when present', () => {
      expect(el.textContent).toContain('My bio');
    });

    it('shows manager name (computed from users input)', () => {
      expect(el.textContent).toContain('Zara Boss');
    });

    it('shows direct reports list (computed from users input)', () => {
      expect(el.textContent).toContain('Bob Builder');
    });

    it('emits backToList when back button clicked', () => {
      let emitCount = 0;
      component.backToList.subscribe(() => emitCount++);

      const backBtn = el.querySelector('.btn-ghost') as HTMLButtonElement;
      backBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(emitCount).toBe(1);
    });

    it('emits removeFromBoard with userId when remove button clicked', () => {
      const emitted: string[] = [];
      component.removeFromBoard.subscribe((id) => emitted.push(id));

      const removeBtn = el.querySelector('.btn-error') as HTMLButtonElement;
      removeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(emitted).toEqual(['1']);
    });

    it('emits userSelected with manager id when manager is clicked', () => {
      const emitted: string[] = [];
      component.userSelected.subscribe((id) => emitted.push(id));

      // First button in details mode is the manager button
      const managerBtn = el.querySelector('button.flex') as HTMLButtonElement;
      managerBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(emitted).toContain('0');
    });

    it('emits removeManager with selectedUser id when × button is clicked', () => {
      const emitted: string[] = [];
      component.removeManager.subscribe((id) => emitted.push(id));

      const removeBtn = el.querySelector('button[title="Remove manager"]') as HTMLButtonElement;
      removeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(emitted).toEqual(['1']); // selectedUser.id
    });
  });
});
