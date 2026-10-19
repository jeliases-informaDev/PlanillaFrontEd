import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface LoginResponse {
  token: string;
  rol: string;
  username: string;
  nombreCompleto: string | null;
  debeCambiarPassword: boolean;
}

// localStorage no existe cuando Angular corre en el servidor (SSR): todo acceso va protegido.
const storage = (): Storage | null => (typeof localStorage !== 'undefined' ? localStorage : null);

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/auth`;

  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        storage()?.setItem('token', response.token);
        storage()?.setItem('rol', response.rol);
        storage()?.setItem('usuario', response.username);
        storage()?.setItem('nombre', response.nombreCompleto ?? response.username);
        storage()?.setItem('debeCambiarPassword', response.debeCambiarPassword ? '1' : '0');
      })
    );
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/cambiar-password`, { passwordActual, passwordNueva }).pipe(
      tap(() => storage()?.setItem('debeCambiarPassword', '0'))
    );
  }

  getToken(): string | null {
    return storage()?.getItem('token') ?? null;
  }

  getRol(): string | null {
    return storage()?.getItem('rol') ?? null;
  }

  getUsuario(): string {
    return storage()?.getItem('usuario') ?? '';
  }

  getNombre(): string {
    return storage()?.getItem('nombre') ?? '';
  }

  /** ADMIN = contador, puede cambiar datos. GERENCIA = solo lectura. */
  esAdmin(): boolean {
    return this.getRol() === 'ADMIN';
  }

  debeCambiarPassword(): boolean {
    return storage()?.getItem('debeCambiarPassword') === '1';
  }

  logout(): void {
    ['token', 'rol', 'usuario', 'nombre', 'debeCambiarPassword'].forEach((k) => storage()?.removeItem(k));
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
