import { HttpErrorResponse } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';

export type MutationResult<T> = { ok: true; data: T } | { ok: false };

export async function httpMutation<T>(source: Observable<T>): Promise<MutationResult<T>> {
  try {
    const data = await lastValueFrom(source);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof HttpErrorResponse) return { ok: false };
    throw e;
  }
}
