import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { API_URL } from '../../core/config/api.config';
import { ConceptosStore } from '../../core/services/conceptos.store';
import { EmpleadosStore } from '../../core/services/empleados.store';
import { RealtimeService } from '../../core/services/realtime.service';
import { periodoActual, quitar, upsert } from '../../core/utils/lista';

interface Movimiento {
  idMovimiento: number;
  idEmpleado: number;
  empleado: string;
  codigoConcepto: string;
  concepto: string;
  tipo: string;
  periodo: string;
  monto: number;
  cantidad?: number | null; // horas extras, días de vacaciones o de feriado
}

type Modo = 'fijo' | 'horas' | 'vacaciones' | 'feriado';

// Conceptos que tienen su propio formulario (el monto se calcula con la ley) o los genera la planilla
const CONCEPTOS_RESERVADOS = ['0121', '0201', '0105', '0106', '0118', '0107'];

@Component({
  selector: 'app-movimientos',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './movimientos.html'
})
export class Movimientos implements OnInit {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);
  private empleadosStore = inject(EmpleadosStore);
  private conceptosStore = inject(ConceptosStore);
  private destroyRef = inject(DestroyRef);

  protected modo = signal<Modo>('fijo');
  protected periodo = signal(periodoActual());
  protected movimientos = signal<Movimiento[]>([]);
  protected recienLlegados = signal<ReadonlySet<number>>(new Set());
  protected error = signal('');
  protected guardando = signal(false);

  protected empleadosActivos = computed(() => this.empleadosStore.empleados().filter((e) => e.estado === 'ACTIVO'));
  protected conceptosMonto = computed(() =>
    this.conceptosStore.conceptos().filter((c) => !CONCEPTOS_RESERVADOS.includes(c.codigo))
  );
  protected conceptosIngreso = computed(() => this.conceptosMonto().filter((c) => c.tipo === 'INGRESO'));
  protected conceptosDescuento = computed(() => this.conceptosMonto().filter((c) => c.tipo === 'DESCUENTO'));

  protected totalIngresos = computed(() =>
    this.movimientos().filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + Number(m.monto), 0)
  );
  protected totalDescuentos = computed(() =>
    this.movimientos().filter((m) => m.tipo === 'DESCUENTO').reduce((s, m) => s + Number(m.monto), 0)
  );

  protected fijo = { idEmpleado: null as number | null, codigoConcepto: null as string | null, monto: null as number | null };
  protected horas = { idEmpleado: null as number | null, horasAl25: 0, horasAl35: 0 };
  protected vacaciones = { idEmpleado: null as number | null, diasGozados: null as number | null };
  protected feriado = { idEmpleado: null as number | null, dias: null as number | null };

  ngOnInit(): void {
    this.empleadosStore.iniciar();
    this.conceptosStore.iniciar();
    this.realtime.alConectar$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
    this.cargar();

    this.realtime.watch<Movimiento>('movimientos').pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evento) => {
      if (evento.data.periodo !== this.periodo()) return;
      if (evento.accion === 'ELIMINADO') {
        this.movimientos.update((l) => quitar(l, evento.data.idMovimiento, (m) => m.idMovimiento));
        return;
      }
      // Los más recientes arriba
      this.movimientos.update((l) => upsert(l, evento.data, (m) => m.idMovimiento).sort((a, b) => b.idMovimiento - a.idMovimiento));
      this.resaltar(evento.data.idMovimiento);
    });
  }

  protected cambiarModo(modo: Modo): void {
    this.modo.set(modo);
    this.error.set('');
  }

  protected cambiarPeriodo(valor: string): void {
    this.periodo.set(valor);
    this.cargar();
  }

  private cargar(): void {
    if (!/^\d{4}-\d{2}$/.test(this.periodo())) return;
    this.http.get<Movimiento[]>(`${API_URL}/movimientos`, { params: { periodo: this.periodo() } }).subscribe({
      next: (l) => this.movimientos.set(l),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudieron cargar los movimientos.')
    });
  }

  private resaltar(id: number): void {
    this.recienLlegados.update((s) => new Set(s).add(id));
    setTimeout(() => {
      this.recienLlegados.update((s) => {
        const copia = new Set(s);
        copia.delete(id);
        return copia;
      });
    }, 4000);
  }

  protected registrar(): void {
    this.error.set('');
    this.guardando.set(true);

    const periodo = this.periodo();
    let url: string;
    let cuerpo: object;
    switch (this.modo()) {
      case 'fijo':
        url = `${API_URL}/movimientos/bonos`;
        cuerpo = { ...this.fijo, periodo };
        break;
      case 'horas':
        url = `${API_URL}/movimientos/horas-extras`;
        cuerpo = { ...this.horas, periodo };
        break;
      case 'feriado':
        url = `${API_URL}/movimientos/feriado`;
        cuerpo = { ...this.feriado, periodo };
        break;
      default:
        url = `${API_URL}/movimientos/vacaciones`;
        cuerpo = { ...this.vacaciones, periodo };
    }

    // Horas extras devuelve una lista (una por tasa); la tabla se actualiza por los eventos en vivo
    this.http.post<unknown>(url, cuerpo).subscribe({
      next: () => {
        // La fila llega por el evento en vivo
        this.fijo = { ...this.fijo, monto: null };
        this.horas = { ...this.horas, horasAl25: 0, horasAl35: 0 };
        this.vacaciones = { ...this.vacaciones, diasGozados: null };
        this.feriado = { ...this.feriado, dias: null };
        this.guardando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.mensaje ?? 'No se pudo registrar el movimiento.');
        this.guardando.set(false);
      }
    });
  }

  protected eliminar(m: Movimiento): void {
    if (!confirm(`¿Anular «${m.concepto}» de ${m.empleado} (S/ ${Number(m.monto).toFixed(2)})?`)) return;
    this.error.set('');
    this.http.delete<void>(`${API_URL}/movimientos/${m.idMovimiento}`).subscribe({
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo anular el movimiento.')
    });
  }
}
