import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { Empleado } from '../models/empleado.model';
import { RealtimeService } from './realtime.service';

/**
 * Lista de empleados compartida y siempre al día (carga inicial + reconexiones + eventos en vivo).
 * Las pantallas que necesitan elegir un empleado (asistencias, movimientos, liquidaciones) la usan en vez de pedirla cada una.
 */
@Injectable({ providedIn: 'root' })
export class EmpleadosStore {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);
  private iniciado = false;

  readonly empleados = signal<Empleado[]>([]);

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;

    this.realtime.alConectar$.subscribe(() => this.cargar());
    this.cargar();

    this.realtime.watch<Empleado>('empleados').subscribe((evento) => {
      this.empleados.update((lista) => {
        const i = lista.findIndex((e) => e.idEmpleado === evento.data.idEmpleado);
        if (i === -1) return [...lista, evento.data];
        const copia = [...lista];
        copia[i] = evento.data;
        return copia;
      });
    });
  }

  private cargar(): void {
    this.http.get<Empleado[]>(`${API_URL}/empleados`).subscribe((l) => this.empleados.set(l));
  }
}
