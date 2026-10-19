import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_URL } from '../../core/config/api.config';

interface Resultado {
  totalFilas: number;
  filasValidas: number;
  importado: boolean;
  errores: { fila: number; mensaje: string }[];
  advertencias: string[];
  resumen: Record<string, unknown>;
}

interface DetalleEmpleado {
  empleado: string;
  tardanzas: number;
  minutosTardanza: number;
  faltas: number;
}

const ETIQUETAS: Record<string, string> = {
  desde: 'Desde',
  hasta: 'Hasta',
  trabajadoresEnArchivo: 'Trabajadores en el archivo',
  empleadosConCoincidencia: 'Con coincidencia en el sistema',
  diasRegistrados: 'Días registrados',
  tardanzas: 'Tardanzas',
  faltas: 'Faltas en días laborables',
  marcacionesIncompletas: 'Marcaciones incompletas',
  minutosExtra: 'Minutos después de la salida',
  trabajadores: 'Trabajadores',
  diasDescanso: 'Días de descanso',
  empleadosConCambios: 'Empleados con cambios',
  sinCambios: 'Sin cambios'
};

/**
 * Pantalla genérica para cargar un Excel: descargar plantilla (opcional), subir, revisar sin guardar e importar.
 * Se configura por la ruta (data): titulo, ayuda, importarUrl, plantillaUrl, volverA.
 */
@Component({
  selector: 'app-importar-archivo',
  imports: [RouterLink],
  templateUrl: './importar-archivo.html'
})
export class ImportarArchivo {
  private http = inject(HttpClient);
  private ruta = inject(ActivatedRoute);

  protected config = this.ruta.snapshot.data as {
    titulo: string;
    ayuda: string;
    importarUrl: string;
    plantillaUrl?: string;
    plantillaNombre?: string;
    volverA: string;
    volverTexto: string;
  };

  protected archivo = signal<File | null>(null);
  protected resultado = signal<Resultado | null>(null);
  protected trabajando = signal(false);
  protected error = signal('');

  protected puedeImportar = computed(() => {
    const r = this.resultado();
    return !!r && !r.importado && r.errores.length === 0 && r.filasValidas > 0 && !this.trabajando();
  });

  protected cifras = computed(() => {
    const r = this.resultado()?.resumen ?? {};
    return Object.entries(r)
      .filter(([k, v]) => k in ETIQUETAS && v !== null && typeof v !== 'object')
      .map(([k, v]) => ({ etiqueta: ETIQUETAS[k], valor: String(v) }));
  });

  protected sinCoincidencia = computed(() => (this.resultado()?.resumen?.['sinCoincidencia'] as string[] | undefined) ?? []);
  protected detalle = computed(() => (this.resultado()?.resumen?.['detalle'] as DetalleEmpleado[] | undefined) ?? []);
  protected detalleCambios = computed(() => (this.resultado()?.resumen?.['detalleCambios'] as { empleado: string; cambios: string }[] | undefined) ?? []);

  protected descargarPlantilla(): void {
    if (!this.config.plantillaUrl) return;
    this.error.set('');
    this.http.get(`${API_URL}${this.config.plantillaUrl}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.config.plantillaNombre ?? 'plantilla.xlsx';
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
    this.http.post<Resultado>(`${API_URL}${this.config.importarUrl}`, datos, { params: { soloValidar } }).subscribe({
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
