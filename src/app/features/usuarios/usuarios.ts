import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../core/config/api.config';
import { AuthService } from '../../core/services/auth.service';

interface Usuario {
  idUsuario: number;
  username: string;
  rol: 'ADMIN' | 'GERENCIA' | string;
  nombreCompleto: string | null;
  correo: string | null;
  activo: boolean;
  debeCambiarPassword: boolean;
}

const FORM_VACIO = { username: '', password: '', rol: 'GERENCIA', nombreCompleto: '', correo: '' };

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule],
  templateUrl: './usuarios.html'
})
export class Usuarios implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  protected usuarios = signal<Usuario[]>([]);
  protected error = signal('');
  protected mensaje = signal('');
  protected guardando = signal(false);
  protected form = { ...FORM_VACIO };
  protected yo = this.auth.getUsuario();

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.http.get<Usuario[]>(`${API_URL}/auth/usuarios`).subscribe({
      next: (l) => this.usuarios.set(l),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo cargar la lista de usuarios.')
    });
  }

  protected crear(): void {
    this.error.set('');
    this.mensaje.set('');
    this.guardando.set(true);
    this.http.post<Usuario>(`${API_URL}/auth/usuarios`, this.form).subscribe({
      next: (u) => {
        this.usuarios.update((l) => [...l, u]);
        this.mensaje.set(`Usuario ${u.username} creado. Deberá cambiar la contraseña al entrar por primera vez.`);
        this.form = { ...FORM_VACIO };
        this.guardando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.mensaje ?? 'No se pudo crear el usuario.');
        this.guardando.set(false);
      }
    });
  }

  protected cambiarRol(u: Usuario, rol: string): void {
    this.actualizar(u, { rol });
  }

  protected alternarActivo(u: Usuario): void {
    this.actualizar(u, { activo: !u.activo });
  }

  private actualizar(u: Usuario, cambios: Partial<Usuario>): void {
    this.error.set('');
    this.http.put<Usuario>(`${API_URL}/auth/usuarios/${u.idUsuario}`, cambios).subscribe({
      next: (a) => this.usuarios.update((l) => l.map((x) => (x.idUsuario === a.idUsuario ? a : x))),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo actualizar el usuario.')
    });
  }

  protected reiniciarPassword(u: Usuario): void {
    const temporal = window.prompt(`Contraseña temporal para ${u.username} (mínimo 8 caracteres, letras y números). Tendrá que cambiarla al entrar:`, '');
    if (temporal === null) return;
    this.error.set('');
    this.http.post<void>(`${API_URL}/auth/usuarios/${u.idUsuario}/reiniciar-password`, { passwordTemporal: temporal }).subscribe({
      next: () => {
        this.mensaje.set(`Contraseña de ${u.username} reiniciada.`);
        this.usuarios.update((l) => l.map((x) => (x.idUsuario === u.idUsuario ? { ...x, debeCambiarPassword: true } : x)));
      },
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo reiniciar la contraseña.')
    });
  }
}
