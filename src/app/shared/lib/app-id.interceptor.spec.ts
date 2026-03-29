import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppStore } from '@entities/app';
import { appIdInterceptor } from './app-id.interceptor';

describe('appIdInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let appStore: InstanceType<typeof AppStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([appIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    appStore = TestBed.inject(AppStore);
  });

  afterEach(() => httpMock.verify());

  describe('GET /api/users', () => {
    it('adds appId query param using current store value', () => {
      http.get('/api/users').subscribe();

      const req = httpMock.expectOne((r) => r.url === '/api/users');
      expect(req.request.params.get('appId')).toBe('acme');
      req.flush([]);
    });

    it('reflects switchApp() change', () => {
      appStore.switchApp('globex');
      http.get('/api/users').subscribe();

      const req = httpMock.expectOne((r) => r.url === '/api/users');
      expect(req.request.params.get('appId')).toBe('globex');
      req.flush([]);
    });

    it('preserves existing query params', () => {
      http.get('/api/users', { params: { username: 'jdoe' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === '/api/users');
      expect(req.request.params.get('appId')).toBe('acme');
      expect(req.request.params.get('username')).toBe('jdoe');
      req.flush([]);
    });
  });

  describe('POST /api/users', () => {
    it('adds appId to request body', () => {
      http.post('/api/users', { username: 'foo' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === '/api/users' && r.method === 'POST');
      expect((req.request.body as Record<string, unknown>)['appId']).toBe('acme');
      expect((req.request.body as Record<string, unknown>)['username']).toBe('foo');
      req.flush({});
    });

    it('preserves original body fields', () => {
      http.post('/api/users', { username: 'foo', role: 'editor' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === '/api/users' && r.method === 'POST');
      const body = req.request.body as Record<string, unknown>;
      expect(body['username']).toBe('foo');
      expect(body['role']).toBe('editor');
      expect(body['appId']).toBe('acme');
      req.flush({});
    });
  });

  describe('PATCH/DELETE /api/users (passthrough)', () => {
    it('does not add appId to PATCH requests', () => {
      http.patch('/api/users/1', { username: 'foo' }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/users/1'));
      expect(req.request.params.has('appId')).toBe(false);
      req.flush({});
    });

    it('does not add appId to DELETE requests', () => {
      http.delete('/api/users/1').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/users/1'));
      expect(req.request.params.has('appId')).toBe(false);
      req.flush(null);
    });
  });

  describe('non-users endpoints', () => {
    it('does not modify GET /api/countries', () => {
      http.get('/api/countries').subscribe();

      const req = httpMock.expectOne('/api/countries');
      expect(req.request.params.has('appId')).toBe(false);
      req.flush([]);
    });

    it('does not modify GET /api/departments', () => {
      http.get('/api/departments').subscribe();

      const req = httpMock.expectOne('/api/departments');
      expect(req.request.params.has('appId')).toBe(false);
      req.flush([]);
    });
  });
});
