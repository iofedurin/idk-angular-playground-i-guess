import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppStore } from './app.store';
import { App } from './app.model';

const mockApps: App[] = [
  { id: 'acme', name: 'Acme Corp' },
  { id: 'globex', name: 'Globex Inc' },
];

describe('AppStore', () => {
  let store: InstanceType<typeof AppStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AppStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has default state (acme, no apps loaded)', () => {
    expect(store.currentAppId()).toBe('acme');
    expect(store.apps()).toEqual([]);
    expect(store.currentAppName()).toBe('acme');
  });

  it('switchApp() updates currentAppId synchronously', () => {
    store.switchApp('globex');
    expect(store.currentAppId()).toBe('globex');
  });

  it('currentAppName returns app name after apps are loaded', async () => {
    const promise = store.loadApps();
    httpMock.expectOne('/api/apps').flush(mockApps);
    await promise;

    expect(store.currentAppName()).toBe('Acme Corp');
  });

  it('currentAppName updates when switching apps', async () => {
    const promise = store.loadApps();
    httpMock.expectOne('/api/apps').flush(mockApps);
    await promise;

    store.switchApp('globex');
    expect(store.currentAppName()).toBe('Globex Inc');
  });

  it('loadApps() does not re-fetch when apps already loaded', async () => {
    const promise = store.loadApps();
    httpMock.expectOne('/api/apps').flush(mockApps);
    await promise;

    // second call should be a no-op
    await store.loadApps();
    httpMock.expectNone('/api/apps');
  });

  it('currentAppName falls back to id for unknown app', async () => {
    const promise = store.loadApps();
    httpMock.expectOne('/api/apps').flush(mockApps);
    await promise;

    store.switchApp('unknown-app');
    expect(store.currentAppName()).toBe('unknown-app');
  });
});
