import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { API_URL } from '../../core/config/api.config';
import { ENTIDADES_TIEMPO_REAL, EventoTiempoReal, RealtimeService } from '../../core/services/realtime.service';

interface Actividad {
  clave: number;
  momento: string;
  etiqueta: string;
  accion: string;
  texto: string;
}

const ETIQUETAS: Record<string, string> = {
  empleados: 'Empleado',
  asistencias: 'Asistencia',
  movimientos: 'Movimiento',
  conceptos: 'Concepto',
  boletas: 'Boleta'
};

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);
  private destroyRef = inject(DestroyRef);
  private contador = 0;

  protected totalEmpleados = signal(0);
  protected actividad = signal<Actividad[]>([]);
  protected eventosSesion = computed(() => this.actividad().length);

  ngOnInit(): void {
    const cargarTotal = () =>
      this.http.get<unknown[]>(`${API_URL}/empleados`).subscribe((l) => this.totalEmpleados.set(l.length));

    this.realtime.alConectar$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(cargarTotal);
    cargarTotal();

    // Un solo flujo con todos los temas en vivo
    merge(...ENTIDADES_TIEMPO_REAL.map((e) => this.realtime.watch(e)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (evento.entidad === 'empleados' && evento.accion === 'CREADO') {
          this.totalEmpleados.update((n) => n + 1);
        }
        const nueva: Actividad = {
          clave: ++this.contador,
          momento: evento.momento,
          etiqueta: ETIQUETAS[evento.entidad] ?? evento.entidad,
          accion: evento.accion,
          texto: this.describir(evento)
        };
        this.actividad.update((lista) => [nueva, ...lista].slice(0, 50));
      });
  }

  private describir(e: EventoTiempoReal): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = e.data as any;
    switch (e.entidad) {
      case 'empleados':
        return `${d.nombresCompletos} (DNI ${d.dni}) — ${d.regimenLaboral}`;
      case 'asistencias':
        return `${d.nombreEmpleado}: ${d.estado} el ${d.fecha}`;
      case 'movimientos':
        return `${d.empleado}: ${d.concepto} S/ ${Number(d.monto).toFixed(2)} (${d.periodo})`;
      case 'conceptos':
        return `${d.codigo} · ${d.descripcion} (${d.tipo})`;
      case 'boletas':
        return `${d.nombresEmpleado} · ${d.periodo} · neto S/ ${Number(d.totalNeto).toFixed(2)}`;
      default:
        return JSON.stringify(e.data);
    }
  }
}
