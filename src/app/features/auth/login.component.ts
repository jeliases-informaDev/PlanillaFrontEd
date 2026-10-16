import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.authService.login(this.credentials).subscribe({
      next: () => {
        // Redirigimos al panel principal si entra
        this.router.navigate(['/panel']);
      },
      error: (err: any) => { // <-- Tipado estricto solucionado
        this.errorMessage = 'Credenciales incorrectas o error de servidor.';
        console.error(err);
      }
    });
  }
}