import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsCardsComponent } from './stats-cards';
import { UserRole } from '@entities/user';

@Component({
  imports: [StatsCardsComponent],
  template: `
    <app-stats-cards [total]="total" [active]="active" [byRole]="byRole" />
  `,
})
class TestHost {
  total = 10;
  active = 7;
  byRole: Record<UserRole, number> = { admin: 2, editor: 3, viewer: 5 };
}

describe('StatsCardsComponent', () => {
  let fixture: ComponentFixture<TestHost>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('renders total users count', () => {
    const values = Array.from(el.querySelectorAll('.stat-value')).map(
      (e) => e.textContent?.trim(),
    );
    expect(values).toContain('10');
  });

  it('renders active count and inactive desc', () => {
    const activeValue = el.querySelectorAll('.stat-value')[1];
    expect(activeValue?.textContent?.trim()).toBe('7');

    const desc = el.querySelector('.stat-desc');
    expect(desc?.textContent?.trim()).toBe('3 inactive');
  });

  it('renders role counts', () => {
    const values = Array.from(el.querySelectorAll('.stat-value')).map(
      (e) => e.textContent?.trim(),
    );
    expect(values).toContain('2'); // admin
    expect(values).toContain('3'); // editor
    expect(values).toContain('5'); // viewer
  });
});
