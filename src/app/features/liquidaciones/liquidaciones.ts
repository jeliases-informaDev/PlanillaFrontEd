import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../core/config/api.config';
import { EmpleadosStore } from '../../core/services/empleados.store';
import { hoyISO } from '../../core/utils/lista';

interface Linea {
  tipo: 'INGRESO' | 'DESCUENTO' | 'INFORMATIVO';
  codigo: string | null;
  descripcion: string;
  monto: number;
}

interface Liquidacion {
  nombresEmpleado: string;
  regimen: string;
  fechaIngreso: string;
  fechaCese: string;
  tiempoServicio: string;
  remuneracionComputable: number;
  promedioVariables: number;
  montoVacacionesTruncas: number;
  detalleVacaciones: string;
  montoGratificacionTrunca: number;
  detalleGratificacion: string;
  montoBonificacionExtraordinaria: number;
  montoCtsTrunca: number;
  detalleCts: string;
  totalBeneficios: number;
  descuentoPension: number;
  detallePension: string;
  totalNeto: number;
  detalle: Linea[];
  avisos: string[];
}

@Component({
  selector: 'app-liquidaciones',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './liquidaciones.html'
})
export class Liquidaciones implements OnInit {
  private http = inject(HttpClient);
  private store = inject(EmpleadosStore);

  protected idEmpleado = signal<number | null>(null);
  protected fechaCese = signal(hoyISO());
  protected resultado = signal<Liquidacion | null>(null);
  protected error = signal('');
  protected calculando = signal(false);

  protected empleados = computed(() => this.store.empleados());
  // Para mostrar sueldo y fecha de ingreso del seleccionado
  protected seleccionado = computed(() => this.store.empleados().find((e) => e.idEmpleado === this.idEmpleado()) ?? null);

  // Cada petición lleva un número: si el usuario cambia datos rápido, solo vale la respuesta más reciente
  private ultimaPeticion = 0;

  ngOnInit(): void {
    this.store.iniciar();
  }

  protected cambiarEmpleado(id: number | null): void {
    this.idEmpleado.set(id);
    // Si ya está cesado, se usa su fecha de cese registrada
    const e = this.store.empleados().find((x) => x.idEmpleado === id);
    if (e?.fechaCese) this.fechaCese.set(e.fechaCese);
    this.calcular();
  }

  protected cambiarFecha(fecha: string): void {
    this.fechaCese.set(fecha);
    this.calcular();
  }

  /** Se recalcula solo al cambiar empleado o fecha de cese. */
  private calcular(): void {
    const id = this.idEmpleado();
    const fecha = this.fechaCese();
    if (id === null || !fecha) {
      this.resultado.set(null);
      return;
    }
    const mia = ++this.ultimaPeticion;
    this.error.set('');
    this.calculando.set(true);
    this.http.post<Liquidacion>(`${API_URL}/liquidaciones/calcular`, { idEmpleado: id, fechaCese: fecha }).subscribe({
      next: (r) => {
        if (mia !== this.ultimaPeticion) return;
        this.resultado.set(r);
        this.calculando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        if (mia !== this.ultimaPeticion) return;
        this.resultado.set(null);
        this.error.set(e.error?.mensaje ?? 'No se pudo calcular la liquidación.');
        this.calculando.set(false);
      }
    });
  }
}
