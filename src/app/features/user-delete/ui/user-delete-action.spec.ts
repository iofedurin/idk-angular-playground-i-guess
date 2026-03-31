import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UsersStore } from '@entities/user';
import { UserDeleteActionComponent } from './user-delete-action';
import type { User } from '@entities/user';

const makeUser = (id: string, overrides: Partial<User> = {}): User => ({
  id,
  username: `user${id}`,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  email: `user${id}@test.com`,
  age: 30,
  country: 'US',
  department: 'eng',
  jobTitle: 'dev',
  role: 'editor',
  active: true,
  bio: '',
  managerId: null,
  ...overrides,
});

@Component({
  template: `<app-user-delete-action [userId]="userId()" />`,
  imports: [UserDeleteActionComponent],
})
class TestHostComponent {
  readonly userId = signal('1');
}

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('UserDeleteActionComponent — cascade delete', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let httpMock: HttpTestingController;
  let comp: UserDeleteActionComponent;

  async function initWithUsers(users: User[]): Promise<void> {
    void TestBed.inject(UsersStore).loadAll();
    httpMock.expectOne((r) => r.url.includes('/api/users')).flush(users);
    await flush();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    comp = fixture.debugElement.children[0].componentInstance as UserDeleteActionComponent;
  });

  afterEach(() => httpMock.verify());

  it('shows standard confirmation message when user has no direct reports', async () => {
    await initWithUsers([makeUser('1'), makeUser('2')]);

    expect((comp as any).deleteMessage()).toBe('Are you sure you want to delete this user?');
  });

  it('shows enhanced message with subordinate count and manager name', async () => {
    await initWithUsers([
      makeUser('1', { managerId: '3' }),
      makeUser('2', { managerId: '1' }),
      makeUser('3', { firstName: 'Big', lastName: 'Boss' }),
    ]);

    const msg: string = (comp as any).deleteMessage();
    expect(msg).toContain('1 direct report');
    expect(msg).toContain('Big Boss');
  });

  it('shows "no manager" in message when deleted user has no manager', async () => {
    await initWithUsers([makeUser('1'), makeUser('2', { managerId: '1' })]);

    const msg: string = (comp as any).deleteMessage();
    expect(msg).toContain('1 direct report');
    expect(msg).toContain('no manager');
  });

  it('reassigns direct reports to deleted user manager then deletes', async () => {
    // u1 (manager: u3) has direct report u2
    await initWithUsers([
      makeUser('1', { managerId: '3' }),
      makeUser('2', { managerId: '1' }),
      makeUser('3'),
    ]);

    const promise = (comp as any).doDelete();

    // PATCH u2 → reassign to u3 (u1's manager)
    httpMock
      .expectOne((r) => r.url.includes('/api/users/2') && r.method === 'PATCH')
      .flush({ ...makeUser('2'), managerId: '3' });

    // Let Promise.all resolve → store.remove() fires DELETE
    await flush();

    httpMock
      .expectOne((r) => r.url.includes('/api/users/1') && r.method === 'DELETE')
      .flush(null);

    await promise;
  });

  it('deletes user directly when no direct reports', async () => {
    await initWithUsers([makeUser('1'), makeUser('2')]);

    const promise = (comp as any).doDelete();

    httpMock
      .expectOne((r) => r.url.includes('/api/users/1') && r.method === 'DELETE')
      .flush(null);

    await promise;
  });
});
