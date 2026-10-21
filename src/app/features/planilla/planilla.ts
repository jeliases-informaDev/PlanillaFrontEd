import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { API_URL } from '../../core/config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { descargar } from '../../core/utils/descargar';

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

/** Fila del adelanto de la 1ra quincena (la calcula el backend). */
export interface Quincena {
  idEmpleado: number;
  empleado: string;
  tipoDocumento: string;
  documento: string;
  banco: string | null;
  cuenta: string | null;
  basico: number;
  asignacionFamiliar: number;
  pension: number;
  renta5ta: number;
  adelanto: number;
  registrado: boolean;
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
  protected estado = signal<{ estado: string; fechaCierre?: string; cerradaPor?: string; motivoReapertura?: string }>({ estado: 'SIN_PROCESAR' });
  protected auth = inject(AuthService);

  protected cerrada = computed(() => this.estado().estado === 'CERRADA');

  // --- Quincena y constancias (planilla de la contadora)
  protected quincena = signal<Quincena[]>([]);
  protected mostrarQuincena = signal(false);
  protected cargandoQuincena = signal(false);
  protected mes = computed(() => Number(this.periodo().slice(5, 7)));
  protected esMesGratificacion = computed(() => this.mes() === 7 || this.mes() === 12);
  protected esMesCts = computed(() => this.mes() === 5 || this.mes() === 11);
  protected totalQuincena = computed(() => this.quincena().reduce((s, q) => s + Number(q.adelanto), 0));

  protected alternarQuincena(): void {
    this.mostrarQuincena.update((v) => !v);
    if (this.mostrarQuincena()) this.cargarQuincena();
  }

  private cargarQuincena(): void {
    this.cargandoQuincena.set(true);
    this.http.get<Quincena[]>(`${API_URL}/planillas/${this.periodo()}/quincena`).subscribe({
      next: (l) => {
        this.quincena.set(l);
        this.cargandoQuincena.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.mensaje ?? 'No se pudo calcular la quincena.');
        this.cargandoQuincena.set(false);
      }
    });
  }

  protected registrarQuincena(): void {
    if (!confirm(`¿Registrar el adelanto de quincena de ${this.periodo()} como descuento (0701) de cada trabajador? Si ya existía, se actualiza el monto.`)) return;
    this.error.set('');
    this.cargandoQuincena.set(true);
    this.http.post<Quincena[]>(`${API_URL}/planillas/${this.periodo()}/quincena/registrar`, {}).subscribe({
      next: (l) => {
        this.quincena.set(l);
        this.cargandoQuincena.set(false);
        this.mensaje.set(`Adelantos de quincena registrados: ${l.filter((q) => q.registrado).length}. Vuelve a procesar la planilla para que la boleta los descuente.`);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.mensaje ?? 'No se pudo registrar la quincena.');
        this.cargandoQuincena.set(false);
      }
    });
  }

  protected descargarQuincena(): void {
    this.error.set('');
    descargar(this.http, `${API_URL}/reportes/planillas/${this.periodo()}/quincena.xlsx`, `quincena-${this.periodo()}.xlsx`)
      .subscribe({ error: (e: Error) => this.error.set(e.message) });
  }

  protected tieneGratificacion(b: Boleta): boolean {
    return b.detalle?.some((l) => l.codigo === '0406') ?? false;
  }

  /** Liquidación de gratificaciones (julio/diciembre): de un trabajador (se abre) o de todos (se descarga). */
  protected constanciaGratificacion(b?: Boleta): void {
    this.error.set('');
    const url = `${API_URL}/reportes/planillas/${this.periodo()}/constancias/gratificacion.pdf` + (b ? `?idEmpleado=${b.idEmpleado}` : '');
    descargar(this.http, url, `liquidacion-gratificacion-${this.periodo()}.pdf`, !!b).subscribe({ error: (e: Error) => this.error.set(e.message) });
  }

  /** Liquidación del depósito de CTS (mayo/noviembre). */
  protected constanciaCts(b?: Boleta): void {
    this.error.set('');
    const url = `${API_URL}/reportes/planillas/${this.periodo()}/constancias/cts.pdf` + (b ? `?idEmpleado=${b.idEmpleado}` : '');
    descargar(this.http, url, `liquidacion-cts-${this.periodo()}.pdf`, !!b).subscribe({ error: (e: Error) => this.error.set(e.message) });
  }

  protected alternarDetalle(id: number): void {
    this.expandida.update((actual) => (actual === id ? null : id));
  }

  private cargarEstado(): void {
    this.http.get<{ estado: string; fechaCierre?: string; cerradaPor?: string; motivoReapertura?: string }>(`${API_URL}/planillas/${this.periodo()}/estado`)
      .subscribe({ next: (e) => this.estado.set(e), error: () => this.estado.set({ estado: 'SIN_PROCESAR' }) });
  }

  protected cerrar(): void {
    if (!confirm(`¿Cerrar la planilla ${this.periodo()}? Ya no se podrá recalcular ni registrar movimientos sin reabrirla con autorización.`)) return;
    this.error.set('');
    this.http.post(`${API_URL}/planillas/${this.periodo()}/cerrar`, {}).subscribe({
      next: () => {
        this.mensaje.set(`Planilla ${this.periodo()} cerrada.`);
        this.cargarEstado();
      },
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo cerrar la planilla.')
    });
  }

  protected reabrir(): void {
    const motivo = window.prompt('Motivo de la reapertura y quién la autoriza (contador y gerencia):', '');
    if (motivo === null) return;
    this.error.set('');
    this.http.post(`${API_URL}/planillas/${this.periodo()}/reabrir`, { motivo }).subscribe({
      next: () => {
        this.mensaje.set(`Planilla ${this.periodo()} reabierta.`);
        this.cargarEstado();
      },
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo reabrir la planilla.')
    });
  }

  protected verPdf(b: Boleta): void {
    this.error.set('');
    descargar(this.http, `${API_URL}/reportes/boletas/${b.idBoleta}/pdf`, `boleta-${b.periodo}.pdf`, true)
      .subscribe({ error: (e: Error) => this.error.set(e.message) });
  }

  protected descargarTodas(): void {
    this.error.set('');
    descargar(this.http, `${API_URL}/reportes/planillas/${this.periodo()}/boletas.pdf`, `boletas-${this.periodo()}.pdf`)
      .subscribe({ error: (e: Error) => this.error.set(e.message) });
  }

  /** Avisos de lo que el periodo elegido incluye, para que la boleta no sorprenda. */
  protected notasDelPeriodo = computed(() => {
    const mes = Number(this.periodo().slice(5, 7));
    const notas: string[] = [];
    if (mes === 7 || mes === 12) notas.push(`Incluye la gratificación de ${mes === 7 ? 'Fiestas Patrias' : 'Navidad'} y su bonificación extraordinaria (con el promedio de horas extras y comisiones del semestre). Después de procesar puedes imprimir las constancias.`);
    if (mes === 5 || mes === 11) notas.push('Calcula la CTS a depositar (no se paga en la boleta: va a la cuenta CTS del trabajador). Después de procesar puedes imprimir las constancias de depósito.');
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
    this.cargarEstado();
    if (this.mostrarQuincena()) this.cargarQuincena();
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
        this.cargarEstado();
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
