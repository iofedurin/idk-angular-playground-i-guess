import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrgBoardPage } from './org-board';

describe('OrgBoardPage', () => {
  let fixture: ComponentFixture<OrgBoardPage>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgBoardPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgBoardPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('creates without error', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders sidebar placeholder', () => {
    const sidebar = el.querySelector('aside');
    expect(sidebar).toBeTruthy();
    expect(sidebar?.textContent).toContain('Employees');
  });

  it('renders f-flow canvas container', () => {
    expect(el.querySelector('f-flow')).toBeTruthy();
    expect(el.querySelector('f-canvas')).toBeTruthy();
  });
});
