import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-cambiar-password',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 class="text-xl font-bold text-gray-800 mb-2">Cambiar contraseña</h2>
        <p class="mb-6 text-sm text-gray-600">
          {{ obligatorio ? 'Tu contraseña es temporal: elige una nueva para continuar.' : 'Elige una contraseña nueva de al menos 8 caracteres con letras y números.' }}
        </p>
        <form (ngSubmit)="guardar()" #f="ngForm" class="space-y-4">
          <label class="block text-sm text-gray-700">Contraseña actual
            <input type="password" name="actual" [(ngModel)]="actual" required autocomplete="current-password" class="mt-1 block w-full border rounded px-3 py-2" />
          </label>
          <label class="block text-sm text-gray-700">Contraseña nueva
            <input type="password" name="nueva" [(ngModel)]="nueva" required minlength="8" autocomplete="new-password" class="mt-1 block w-full border rounded px-3 py-2" />
          </label>
          <label class="block text-sm text-gray-700">Repetir la nueva
            <input type="password" name="repetir" [(ngModel)]="repetir" required autocomplete="new-password" class="mt-1 block w-full border rounded px-3 py-2" />
          </label>
          @if (error()) { <div class="text-sm text-red-600">{{ error() }}</div> }
          <button type="submit" [disabled]="f.invalid || guardando()"
                  class="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300">
            {{ guardando() ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
          @if (!obligatorio) {
            <button type="button" (click)="volver()" class="w-full text-sm text-gray-600 hover:underline">Cancelar</button>
          }
        </form>
      </div>
    </div>
  `
})
export class CambiarPassword {
  private auth = inject(AuthService);
  private router = inject(Router);

  actual = '';
  nueva = '';
  repetir = '';
  error = signal('');
  guardando = signal(false);
  obligatorio = this.auth.debeCambiarPassword();

  guardar(): void {
    this.error.set('');
    if (this.nueva !== this.repetir) {
      this.error.set('Las dos contraseñas nuevas no coinciden.');
      return;
    }
    this.guardando.set(true);
    this.auth.cambiarPassword(this.actual, this.nueva).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/panel']);
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(e.error?.mensaje ?? 'No se pudo cambiar la contraseña.');
      }
    });
  }

  volver(): void {
    this.router.navigate(['/panel']);
  }
}
