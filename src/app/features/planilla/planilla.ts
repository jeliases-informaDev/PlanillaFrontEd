import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { API_URL } from '../../core/config/api.config';
import { RealtimeService } from '../../core/services/realtime.service';

export interface LineaBoleta {
  tipo: 'INGRESO' | 'DESCUENTO' | 'INFORMATIVO';
  codigo: string | null;
  descripcion: string;
  monto: number;
}

export interface Boleta {
  idBoleta: number;
  idEmpleado: number;
  periodo: string;
  nombresEmpleado: string;
  tipoDocumento: string;
  dni: string;
  regimen: string;
  diasTrabajados: number | null;
  totalIngresos: number;
  totalDescuentos: number;
  totalNeto: number;
  renta5taRetenida: number | null;
  essaludEmpleador: number | null;
  depositoCts: number | null;
  detalle: LineaBoleta[];
}

@Component({
  selector: 'app-planilla',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './planilla.html'
})
export class Planilla implements OnInit {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);

  protected periodo = signal(this.periodoActual());
  protected boletas = signal<Boleta[]>([]);
  protected procesando = signal(false);
  protected mensaje = signal('');
  protected error = signal('');
  protected expandida = signal<number | null>(null); // boleta con el detalle abierto

  protected alternarDetalle(id: number): void {
    this.expandida.update((actual) => (actual === id ? null : id));
  }

  /** Avisos de lo que el periodo elegido incluye, para que la boleta no sorprenda. */
  protected notasDelPeriodo = computed(() => {
    const mes = Number(this.periodo().slice(5, 7));
    const notas: string[] = [];
    if (mes === 7 || mes === 12) notas.push(`Incluye la gratificación de ${mes === 7 ? 'Fiestas Patrias' : 'Navidad'} y su bonificación extraordinaria.`);
    if (mes === 5 || mes === 11) notas.push('Calcula la CTS a depositar (no se paga en la boleta: va a la cuenta CTS del trabajador).');
    return notas;
  });

  protected totalIngresos = computed(() => this.boletas().reduce((s, b) => s + Number(b.totalIngresos), 0));
  protected totalDescuentos = computed(() => this.boletas().reduce((s, b) => s + Number(b.totalDescuentos), 0));
  protected totalNeto = computed(() => this.boletas().reduce((s, b) => s + Number(b.totalNeto), 0));

  ngOnInit(): void {
    this.realtime.alConectar$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
    this.cargar();

    this.realtime.watch<Boleta>('boletas').pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evento) => {
      if (evento.data.periodo !== this.periodo()) return; // otra planilla, no es la que estoy viendo
      this.boletas.update((lista) => {
        const i = lista.findIndex((b) => b.idBoleta === evento.data.idBoleta);
        if (i === -1) return [...lista, evento.data];
        const copia = [...lista];
        copia[i] = evento.data;
        return copia;
      });
    });
  }

  private periodoActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }

  protected cambiarPeriodo(valor: string): void {
    this.periodo.set(valor);
    this.cargar();
  }

  protected cargar(): void {
    this.error.set('');
    if (!/^\d{4}-\d{2}$/.test(this.periodo())) return;
    this.http.get<Boleta[]>(`${API_URL}/planillas/${this.periodo()}/boletas`).subscribe({
      next: (lista) => this.boletas.set(lista),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudieron cargar las boletas.')
    });
  }

  protected procesar(): void {
    this.error.set('');
    this.mensaje.set('');
    this.procesando.set(true);
    this.http.post<Boleta[]>(`${API_URL}/planillas/${this.periodo()}/procesar`, {}).subscribe({
      next: (lista) => {
        this.mensaje.set(`Planilla ${this.periodo()} procesada: ${lista.length} boleta(s).`);
        this.procesando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.mensaje ?? 'No se pudo procesar la planilla.');
        this.procesando.set(false);
      }
    });
  }

  protected descargarPlame(): void {
    this.error.set('');
    this.http
      .get(`${API_URL}/plame/descargar`, { params: { periodo: this.periodo() }, responseType: 'text', observe: 'response' })
      .subscribe({
        next: (resp) => {
          const cabecera = resp.headers.get('Content-Disposition') ?? '';
          const nombre = /filename="?([^";]+)"?/.exec(cabecera)?.[1] ?? `plame-${this.periodo()}.rem`;
          const url = URL.createObjectURL(new Blob([resp.body ?? ''], { type: 'text/plain' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = nombre;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (e: HttpErrorResponse) => {
          // Con responseType 'text' el JSON de error llega como texto
          let msg = 'No se pudo generar el archivo PLAME.';
          try {
            msg = JSON.parse(e.error).mensaje ?? msg;
          } catch {
            /* se deja el mensaje por defecto */
          }
          this.error.set(msg);
        }
      });
  }
}
