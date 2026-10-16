import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_URL } from '../../core/config/api.config';
import { Empleado } from '../../core/models/empleado.model';

interface ErrorFila {
  fila: number;
  mensaje: string;
}

interface Resultado {
  totalFilas: number;
  filasValidas: number;
  importado: boolean;
  errores: ErrorFila[];
  empleados: Empleado[];
}

@Component({
  selector: 'app-importar-empleados',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './importar-empleados.html'
})
export class ImportarEmpleados {
  private http = inject(HttpClient);

  protected archivo = signal<File | null>(null);
  protected resultado = signal<Resultado | null>(null);
  protected trabajando = signal(false);
  protected error = signal('');

  /** Solo se puede importar un archivo ya revisado, sin errores y que aún no se importó. */
  protected puedeImportar = computed(() => {
    const r = this.resultado();
    return !!r && !r.importado && r.errores.length === 0 && r.filasValidas > 0 && !this.trabajando();
  });

  protected descargarPlantilla(): void {
    this.error.set('');
    this.http.get(`${API_URL}/empleados/plantilla`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-empleados.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('No se pudo descargar la plantilla.')
    });
  }

  protected seleccionar(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    this.resultado.set(null);
    this.error.set('');
  }

  protected revisar(): void {
    this.enviar(true);
  }

  protected importar(): void {
    this.enviar(false);
  }

  private enviar(soloValidar: boolean): void {
    const archivo = this.archivo();
    if (!archivo) return;
    this.error.set('');
    this.trabajando.set(true);

    const datos = new FormData();
    datos.append('archivo', archivo);
    this.http
      .post<Resultado>(`${API_URL}/empleados/importar`, datos, { params: { soloValidar } })
      .subscribe({
        next: (r) => {
          this.resultado.set(r);
          this.trabajando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(e.error?.mensaje ?? 'No se pudo procesar el archivo.');
          this.trabajando.set(false);
        }
      });
  }
}
