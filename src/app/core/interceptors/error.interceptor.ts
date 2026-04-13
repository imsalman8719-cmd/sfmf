import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        auth.logout();
        snackBar.open('Session expired. Please login again.', 'Close', { duration: 5000 });
      } else if (error.status === 403) {
        snackBar.open('You do not have permission to perform this action.', 'Close', { duration: 4000 });
      } else if (error.status >= 500) {
        snackBar.open('Server error. Please try again later.', 'Close', { duration: 4000 });
      } else if (error.status === 0) {
        snackBar.open('Cannot connect to server. Please check your connection.', 'Close', { duration: 5000 });
      }
      const msg = error.error?.message || error.message;
      return throwError(() => ({ message: Array.isArray(msg) ? msg.join(', ') : msg, status: error.status }));
    })
  );
};
