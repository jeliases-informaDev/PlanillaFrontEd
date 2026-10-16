import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface LoginResponse {
  token: string;
  rol: string;
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
      })
    );
  }

  getToken(): string | null {
    return storage()?.getItem('token') ?? null;
  }

  getRol(): string | null {
    return storage()?.getItem('rol') ?? null;
  }

  logout(): void {
    storage()?.removeItem('token');
    storage()?.removeItem('rol');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
