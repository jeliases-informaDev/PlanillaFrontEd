import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Si hay token, clonamos la petición y se lo inyectamos
  const peticion = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      // Token vencido o inválido: volver al login (el login mismo no cuenta)
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/auth/login')) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
