import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { httpMutation } from './http-mutation';

describe('httpMutation', () => {
  it('returns { ok: true, data } on success', async () => {
    const result = await httpMutation(of({ id: '1', name: 'Alice' }));
    expect(result).toEqual({ ok: true, data: { id: '1', name: 'Alice' } });
  });

  it('returns { ok: false } on HttpErrorResponse', async () => {
    const err = new HttpErrorResponse({ status: 500 });
    const result = await httpMutation(throwError(() => err));
    expect(result).toEqual({ ok: false });
  });

  it('re-throws non-HTTP errors', async () => {
    const err = new Error('bug in patchState');
    await expect(httpMutation(throwError(() => err))).rejects.toThrow('bug in patchState');
  });

  it('handles void observable (undefined data)', async () => {
    const result = await httpMutation(of(undefined));
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('returns { ok: false } for 4xx HttpErrorResponse', async () => {
    const err = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
    const result = await httpMutation(throwError(() => err));
    expect(result).toEqual({ ok: false });
  });
});
