import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../core/config/api.config';
import { ConceptosStore } from '../../core/services/conceptos.store';

const FORMULARIO_VACIO = {
  codigo: '',
  descripcion: '',
  tipo: 'INGRESO',
  afectaRenta5ta: true,
  afectaEssalud: true
};

@Component({
  selector: 'app-conceptos',
  imports: [FormsModule],
  templateUrl: './conceptos.html'
})
export class Conceptos implements OnInit {
  private http = inject(HttpClient);
  protected store = inject(ConceptosStore);

  protected error = signal('');
  protected guardando = signal(false);
  protected form = { ...FORMULARIO_VACIO };

  ngOnInit(): void {
    this.store.iniciar();
  }

  protected registrar(): void {
    this.error.set('');
    this.guardando.set(true);
    this.http.post(`${API_URL}/conceptos`, this.form).subscribe({
      next: () => {
        // La fila llega por el evento en vivo (store compartido)
        this.form = { ...FORMULARIO_VACIO };
        this.guardando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.mensaje ?? 'No se pudo registrar el concepto.');
        this.guardando.set(false);
      }
    });
  }
}
