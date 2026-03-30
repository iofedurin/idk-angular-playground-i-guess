import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LayoutComponent } from './layout';
import { AppStore } from '@entities/app';

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

const mockApps = [
  { id: 'acme', name: 'Acme Corp' },
  { id: 'globex', name: 'Globex Inc' },
];

describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;
  let httpMock: HttpTestingController;
  let appStore: InstanceType<typeof AppStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    httpMock = TestBed.inject(HttpTestingController);
    appStore = TestBed.inject(AppStore);
  });

  afterEach(() => httpMock.verify());

  it('renders the navbar', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('header.navbar')).toBeTruthy();
  });

  it('renders Dashboard, Users, and Departments nav links', () => {
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.menu a');
    const texts = Array.from(links).map((a: any) => a.textContent?.trim());
    expect(texts).toContain('Dashboard');
    expect(texts).toContain('Users');
    expect(texts).toContain('Departments');
  });

  it('shows current app name in the switcher button', async () => {
    appStore.loadApps();
    fixture.detectChanges();
    httpMock.expectOne('/api/apps').flush(mockApps);
    await flush();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Switch workspace"]',
    );
    expect(button?.textContent).toContain('Acme Corp');

    appStore.switchApp('globex');
    fixture.detectChanges();

    expect(button?.textContent).toContain('Globex Inc');
  });

  it('renders app switcher dropdown items after apps load', async () => {
    appStore.loadApps();
    fixture.detectChanges();
    httpMock.expectOne('/api/apps').flush(mockApps);
    await flush();
    fixture.detectChanges();

    const menuItems = fixture.nativeElement.querySelectorAll('[role="menuitem"]');
    expect(menuItems.length).toBe(2);
    expect(menuItems[0].textContent?.trim()).toBe('Acme Corp');
    expect(menuItems[1].textContent?.trim()).toBe('Globex Inc');
  });
});
