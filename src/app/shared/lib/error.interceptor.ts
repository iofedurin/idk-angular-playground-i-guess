import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '@shared/ui/toast/toast';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    tap({
      error: (err: unknown) => {
        if (req.method === 'GET') return;
        if (!(err instanceof HttpErrorResponse)) return;

        const message =
          typeof err.error === 'string'
            ? err.error
            : (err.error?.message as string | undefined) ?? 'Operation failed';
        toast.error(message);
      },
    }),
  );
};
