import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AppStore } from '@entities/app';

/** Drain all pending microtasks (store awaits) before resuming the test. */
const flush = () => new Promise<void>((r) => setTimeout(r));

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the component', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/apps').flush([]);
    await flush();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the navbar', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/apps').flush([]);
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('header.navbar')).toBeTruthy();
  });

  it('shows current app name in the switcher button', async () => {
    const appStore = TestBed.inject(AppStore);
    fixture.detectChanges();
    httpMock.expectOne('/api/apps').flush([
      { id: 'acme', name: 'Acme Corp' },
      { id: 'globex', name: 'Globex Inc' },
    ]);
    await flush();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[aria-label="Switch workspace"]');
    expect(button?.textContent).toContain('Acme Corp');

    appStore.switchApp('globex');
    fixture.detectChanges();

    expect(button?.textContent).toContain('Globex Inc');
  });

  it('renders app switcher dropdown items after apps load', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/apps').flush([
      { id: 'acme', name: 'Acme Corp' },
      { id: 'globex', name: 'Globex Inc' },
    ]);
    await flush();
    fixture.detectChanges();

    const menuItems = fixture.nativeElement.querySelectorAll('[role="menuitem"]');
    expect(menuItems.length).toBe(2);
    expect(menuItems[0].textContent?.trim()).toBe('Acme Corp');
    expect(menuItems[1].textContent?.trim()).toBe('Globex Inc');
  });
});
