import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ToastService } from '@shared/ui';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    toastSpy = vi.spyOn(TestBed.inject(ToastService), 'error');
  });

  afterEach(() => httpMock.verify());

  describe('GET errors — no toast', () => {
    it('does not toast on GET 404', () => {
      http.get('/api/users').subscribe({ error: () => {} });
      httpMock.expectOne('/api/users').flush('Not found', { status: 404, statusText: 'Not Found' });
      expect(toastSpy).not.toHaveBeenCalled();
    });

    it('does not toast on GET 500', () => {
      http.get('/api/users').subscribe({ error: () => {} });
      httpMock.expectOne('/api/users').flush('Server error', { status: 500, statusText: 'Server Error' });
      expect(toastSpy).not.toHaveBeenCalled();
    });
  });

  describe('non-GET errors — toast with message', () => {
    it('toasts string error body from POST', () => {
      http.post('/api/users', {}).subscribe({ error: () => {} });
      httpMock.expectOne((r) => r.method === 'POST').flush('Username taken', { status: 400, statusText: 'Bad Request' });
      expect(toastSpy).toHaveBeenCalledWith('Username taken');
    });

    it('toasts message field from error body on POST', () => {
      http.post('/api/users', {}).subscribe({ error: () => {} });
      httpMock.expectOne((r) => r.method === 'POST').flush({ message: 'Validation failed' }, { status: 422, statusText: 'Unprocessable Entity' });
      expect(toastSpy).toHaveBeenCalledWith('Validation failed');
    });

    it('toasts "Operation failed" when body has no message', () => {
      http.post('/api/users', {}).subscribe({ error: () => {} });
      httpMock.expectOne((r) => r.method === 'POST').flush({ code: 500 }, { status: 500, statusText: 'Server Error' });
      expect(toastSpy).toHaveBeenCalledWith('Operation failed');
    });

    it('toasts on DELETE error', () => {
      http.delete('/api/users/1').subscribe({ error: () => {} });
      httpMock.expectOne((r) => r.method === 'DELETE').flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      expect(toastSpy).toHaveBeenCalledWith('Forbidden');
    });

    it('toasts on PATCH error', () => {
      http.patch('/api/users/1', {}).subscribe({ error: () => {} });
      httpMock.expectOne((r) => r.method === 'PATCH').flush({ message: 'Conflict' }, { status: 409, statusText: 'Conflict' });
      expect(toastSpy).toHaveBeenCalledWith('Conflict');
    });
  });

  describe('error propagation', () => {
    it('does not swallow the error — observable still errors', () => {
      const errorSpy = vi.fn();
      http.post('/api/users', {}).subscribe({ error: errorSpy });
      httpMock.expectOne((r) => r.method === 'POST').flush('fail', { status: 500, statusText: 'Server Error' });
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
