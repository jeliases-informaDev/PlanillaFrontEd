import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../core/config/api.config';

interface Reciente {
  revision: number;
  fecha: string;
  usuario: string;
  entidad: string;
  id: number | null;
  accion: string;
  resumen: string;
}

interface Cambio {
  campo: string;
  antes: unknown;
  despues: unknown;
}

interface Historial {
  revision: number;
  fecha: string;
  usuario: string;
  accion: string;
  cambios: Cambio[];
}

const ENTIDADES = ['empleado', 'asistencia', 'movimiento', 'boleta', 'concepto', 'afp', 'regimen', 'horario', 'feriado', 'regla-tardanza', 'planilla', 'usuario'];

@Component({
  selector: 'app-auditoria',
  imports: [FormsModule, DatePipe],
  templateUrl: './auditoria.html'
})
export class Auditoria implements OnInit {
  private http = inject(HttpClient);

  protected entidades = ENTIDADES;
  protected recientes = signal<Reciente[]>([]);
  protected historial = signal<Historial[]>([]);
  protected seleccion = signal<{ entidad: string; id: number } | null>(null);
  protected error = signal('');
  protected filtroEntidad = signal('');
  protected buscarEntidad = 'empleado';
  protected buscarId: number | null = null;

  ngOnInit(): void {
    this.cargarRecientes();
  }

  protected cargarRecientes(): void {
    this.error.set('');
    this.http.get<Reciente[]>(`${API_URL}/auditoria/recientes`, { params: { limite: 150 } }).subscribe({
      next: (l) => this.recientes.set(l),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo cargar la auditoría.')
    });
  }

  protected visibles(): Reciente[] {
    const f = this.filtroEntidad();
    return f ? this.recientes().filter((r) => r.entidad === f) : this.recientes();
  }

  protected verHistorial(entidad: string, id: number | null): void {
    if (id === null) return;
    this.error.set('');
    this.seleccion.set({ entidad, id });
    this.http.get<Historial[]>(`${API_URL}/auditoria/${entidad}/${id}`).subscribe({
      next: (h) => this.historial.set(h),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo cargar el historial.')
    });
  }

  protected buscar(): void {
    if (this.buscarId !== null) this.verHistorial(this.buscarEntidad, this.buscarId);
  }

  protected texto(v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    return String(v);
  }
}
