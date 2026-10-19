import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../core/config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { descargar } from '../../core/utils/descargar';
import { periodoActual } from '../../core/utils/lista';

interface Tablero {
  periodo: string;
  trabajadores: number;
  totalIngresos: number;
  totalDescuentos: number;
  porcentajeDescuentos: number;
  totalNeto: number;
  porcentajeNeto: number;
  essaludEmpleador: number;
  ctsADepositar: number;
  costoEmpresa: number;
  porcentajeCargaEmpleador: number;
  promedioNeto: number;
  conceptos: { tipo: string; concepto: string; monto: number; porcentaje: number }[];
  regimenes: { regimen: string; trabajadores: number; ingresos: number; porcentaje: number }[];
  pensiones: { sistema: string; monto: number; porcentaje: number }[];
}

@Component({
  selector: 'app-reportes',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './reportes.html'
})
export class Reportes implements OnInit {
  private http = inject(HttpClient);
  protected auth = inject(AuthService);

  protected periodo = signal(periodoActual());
  protected tablero = signal<Tablero | null>(null);
  protected error = signal('');
  protected mensaje = signal('');
  protected trabajando = signal('');
  protected correoHabilitado = signal(false);
  protected banco = '';

  protected ingresosTop = computed(() => (this.tablero()?.conceptos ?? []).filter((c) => c.tipo === 'INGRESO'));
  protected descuentosTop = computed(() => (this.tablero()?.conceptos ?? []).filter((c) => c.tipo === 'DESCUENTO'));

  ngOnInit(): void {
    this.http.get<{ habilitado: boolean }>(`${API_URL}/reportes/correo/estado`).subscribe((r) => this.correoHabilitado.set(r.habilitado));
    this.cargar();
  }

  protected cambiarPeriodo(v: string): void {
    this.periodo.set(v);
    this.cargar();
  }

  protected cargar(): void {
    this.error.set('');
    this.mensaje.set('');
    if (!/^\d{4}-\d{2}$/.test(this.periodo())) return;
    this.http.get<Tablero>(`${API_URL}/reportes/planillas/${this.periodo()}/tablero`).subscribe({
      next: (t) => this.tablero.set(t),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudo cargar el tablero.')
    });
  }

  protected bajar(tipo: 'resumen' | 'banco' | 'afpnet' | 'boletas'): void {
    this.error.set('');
    const p = this.periodo();
    const rutas = {
      resumen: [`/reportes/planillas/${p}/resumen.xlsx`, `planilla-${p}.xlsx`],
      banco: [`/reportes/planillas/${p}/banco.txt${this.banco ? '?banco=' + encodeURIComponent(this.banco) : ''}`, `pago-${p}.txt`],
      afpnet: [`/reportes/planillas/${p}/afpnet.xlsx`, `afpnet-${p}.xlsx`],
      boletas: [`/reportes/planillas/${p}/boletas.pdf`, `boletas-${p}.pdf`]
    } as const;
    const [url, nombre] = rutas[tipo];
    this.trabajando.set(tipo);
    descargar(this.http, `${API_URL}${url}`, nombre).subscribe({
      next: () => this.trabajando.set(''),
      error: (e: Error) => {
        this.error.set(e.message);
        this.trabajando.set('');
      }
    });
  }

  protected enviarCorreos(): void {
    if (!confirm(`¿Enviar las boletas de ${this.periodo()} por correo a todos los trabajadores con correo registrado?`)) return;
    this.error.set('');
    this.trabajando.set('correo');
    this.http.post<{ enviadas: number; sinCorreo: string[]; errores: string[] }>(`${API_URL}/reportes/planillas/${this.periodo()}/enviar-boletas`, {}).subscribe({
      next: (r) => {
        this.trabajando.set('');
        let m = `Se enviaron ${r.enviadas} boleta(s).`;
        if (r.sinCorreo.length) m += ` Sin correo registrado: ${r.sinCorreo.join(', ')}.`;
        if (r.errores.length) m += ` Errores: ${r.errores.join('; ')}.`;
        this.mensaje.set(m);
      },
      error: (e: HttpErrorResponse) => {
        this.trabajando.set('');
        this.error.set(e.error?.mensaje ?? 'No se pudieron enviar las boletas.');
      }
    });
  }
}
