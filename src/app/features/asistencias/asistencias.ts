import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { API_URL } from '../../core/config/api.config';
import { EmpleadosStore } from '../../core/services/empleados.store';
import { RealtimeService } from '../../core/services/realtime.service';
import { hoyISO, periodoActual, upsert } from '../../core/utils/lista';

interface Asistencia {
  idAsistencia: number;
  idEmpleado: number;
  nombreEmpleado: string;
  fecha: string;
  estado: string;
  minutosTardanza: number;
  marcaIngreso: string | null;
  marcaAlmuerzoInicio: string | null;
  marcaAlmuerzoFin: string | null;
  marcaSalida: string | null;
  horaProgramadaEntrada: string | null;
  horaProgramadaSalida: string | null;
  minutosExtra: number | null;
  justificada: boolean;
  motivoJustificacion: string | null;
  origen: string | null;
  observacion: string | null;
}

export const ESTADOS_ASISTENCIA = ['ASISTIO', 'TARDANZA', 'FALTA', 'PERMISO', 'DESCANSO_MEDICO'] as const;

const COLORES: Record<string, string> = {
  ASISTIO: 'bg-green-100 text-green-800',
  TARDANZA: 'bg-amber-100 text-amber-800',
  FALTA: 'bg-red-100 text-red-800',
  PERMISO: 'bg-blue-100 text-blue-800',
  DESCANSO_MEDICO: 'bg-purple-100 text-purple-800'
};

@Component({
  selector: 'app-asistencias',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './asistencias.html'
})
export class Asistencias implements OnInit {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);
  private store = inject(EmpleadosStore);
  private destroyRef = inject(DestroyRef);

  protected estados = ESTADOS_ASISTENCIA;
  protected periodo = signal(periodoActual());
  protected asistencias = signal<Asistencia[]>([]);
  protected recienLlegadas = signal<ReadonlySet<number>>(new Set());
  protected error = signal('');
  protected guardando = signal(false);
  protected mostrarManual = signal(false);
  protected soloProblemas = signal(false);

  protected empleadosActivos = computed(() => this.store.empleados().filter((e) => e.estado === 'ACTIVO'));

  /** Lista que se muestra: todo, o solo tardanzas y faltas para revisar rápido. */
  protected visibles = computed(() =>
    this.soloProblemas() ? this.asistencias().filter((a) => a.estado === 'TARDANZA' || a.estado === 'FALTA') : this.asistencias()
  );

  protected resumen = computed(() => {
    const l = this.asistencias();
    return {
      tardanzas: l.filter((a) => a.estado === 'TARDANZA' && !a.justificada).length,
      faltas: l.filter((a) => a.estado === 'FALTA' && !a.justificada).length,
      justificadas: l.filter((a) => a.justificada).length
    };
  });

  protected form = this.formularioNuevo();

  private formularioNuevo() {
    return {
      idEmpleado: null as number | null,
      fecha: hoyISO(),
      estado: 'ASISTIO' as string,
      horaIngreso: '',
      horaSalida: '',
      minutosTardanza: 0
    };
  }

  protected color(estado: string): string {
    return COLORES[estado] ?? 'bg-gray-100 text-gray-800';
  }

  /** "08:41:00" -> "08:41" */
  protected hm(hora: string | null): string {
    return hora ? hora.slice(0, 5) : '—';
  }

  ngOnInit(): void {
    this.store.iniciar();
    this.realtime.alConectar$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
    this.cargar();

    this.realtime.watch<Asistencia>('asistencias').pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evento) => {
      if (evento.accion === 'IMPORTADO') {
        this.cargar(); // llegó una importación completa del marcador
        return;
      }
      if (!evento.data.fecha.startsWith(this.periodo())) return; // otro mes: no es el que estoy viendo
      this.asistencias.update((lista) =>
        upsert(lista, evento.data, (a) => a.idAsistencia).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.idAsistencia - a.idAsistencia)
      );
      this.resaltar(evento.data.idAsistencia);
    });
  }

  protected cambiarPeriodo(valor: string): void {
    this.periodo.set(valor);
    this.cargar();
  }

  private cargar(): void {
    if (!/^\d{4}-\d{2}$/.test(this.periodo())) return;
    this.http.get<Asistencia[]>(`${API_URL}/asistencias`, { params: { periodo: this.periodo() } }).subscribe({
      next: (l) => this.asistencias.set(l),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo cargar el tareo.')
    });
  }

  private resaltar(id: number): void {
    this.recienLlegadas.update((s) => new Set(s).add(id));
    setTimeout(() => {
      this.recienLlegadas.update((s) => {
        const copia = new Set(s);
        copia.delete(id);
        return copia;
      });
    }, 4000);
  }

  protected registrar(): void {
    this.error.set('');
    this.guardando.set(true);
    const cuerpo = {
      ...this.form,
      // Un <input type="time"> vacío es "": el backend espera null
      horaIngreso: this.form.horaIngreso || null,
      horaSalida: this.form.horaSalida || null,
      minutosTardanza: this.form.minutosTardanza || 0
    };
    this.http.post<Asistencia>(`${API_URL}/asistencias`, cuerpo).subscribe({
      next: () => {
        // La fila aparece/se actualiza por el evento en vivo. Se conserva la fecha para cargar varios seguidos.
        this.form = { ...this.formularioNuevo(), fecha: this.form.fecha };
        this.guardando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.error?.mensaje ?? 'No se pudo registrar la asistencia.');
        this.guardando.set(false);
      }
    });
  }

  /** Justifica una tardanza o falta (pide el motivo/documento) o quita la justificación. */
  protected justificar(a: Asistencia): void {
    this.error.set('');
    if (a.justificada) {
      this.enviarJustificacion(a, false, '');
      return;
    }
    const motivo = window.prompt(`Motivo y documento que respalda (${a.nombreEmpleado}, ${a.fecha}):`, '');
    if (motivo === null) return;
    if (!motivo.trim()) {
      this.error.set('Para justificar hay que indicar el motivo y el documento que lo respalda.');
      return;
    }
    this.enviarJustificacion(a, true, motivo.trim());
  }

  private enviarJustificacion(a: Asistencia, justificada: boolean, motivo: string): void {
    this.http.put<Asistencia>(`${API_URL}/asistencias/${a.idAsistencia}/justificar`, { justificada, motivo }).subscribe({
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo guardar la justificación.')
    });
  }
}
