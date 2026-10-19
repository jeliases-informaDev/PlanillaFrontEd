import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  credentials = { username: '', password: '' };
  errorMessage = signal('');
  cargando = signal(false);

  onSubmit(): void {
    this.errorMessage.set('');
    this.cargando.set(true);
    this.authService.login(this.credentials).subscribe({
      next: (r) => {
        this.cargando.set(false);
        // Contraseña inicial o reiniciada: hay que cambiarla antes de entrar
        this.router.navigate([r.debeCambiarPassword ? '/cambiar-password' : '/panel']);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorMessage.set(err.status === 0 ? 'No se pudo conectar con el servidor.' : err.error?.mensaje ?? 'Usuario o contraseña incorrectos.');
      }
    });
  }
}
