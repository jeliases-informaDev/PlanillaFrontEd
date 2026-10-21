import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../core/config/api.config';
import { AuthService } from '../../core/services/auth.service';

interface Afp {
  idAfp: number;
  nombre: string;
  aporteObligatorio: number; // fracción: 0.10 = 10 %
  comisionFlujo: number;
  primaSeguro: number;
  remuneracionMaximaAsegurable: number; // S/ (tope de la prima)
}

/** Fila editable: las tasas se muestran y escriben en porcentaje; el backend las guarda como fracción. */
interface FilaAfp {
  idAfp: number;
  nombre: string;
  aportePct: number;
  comisionPct: number;
  primaPct: number;
  tope: number;
  guardando: boolean;
}

@Component({
  selector: 'app-afps',
  imports: [FormsModule],
  templateUrl: './afps.html'
})
export class Afps implements OnInit {
  private http = inject(HttpClient);
  protected auth = inject(AuthService);

  protected filas = signal<FilaAfp[]>([]);
  protected error = signal('');
  protected mensaje = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.http.get<Afp[]>(`${API_URL}/afps`).subscribe({
      next: (lista) => this.filas.set(lista.map((a) => this.aFila(a))),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.mensaje ?? 'No se pudieron cargar las AFP.')
    });
  }

  private aFila(a: Afp): FilaAfp {
    return {
      idAfp: a.idAfp,
      nombre: a.nombre,
      aportePct: this.pct(a.aporteObligatorio),
      comisionPct: this.pct(a.comisionFlujo),
      primaPct: this.pct(a.primaSeguro),
      tope: Number(a.remuneracionMaximaAsegurable),
      guardando: false
    };
  }

  private pct(fraccion: number): number {
    return Math.round(Number(fraccion) * 10000) / 100; // 0.0147 -> 1.47
  }

  /** Descuento total al trabajador con comisión por flujo (lo que la contadora llama «% PENS»). */
  protected totalFlujo(f: FilaAfp): string {
    return (f.aportePct + f.primaPct + f.comisionPct).toFixed(2);
  }

  protected guardar(f: FilaAfp): void {
    this.error.set('');
    this.mensaje.set('');
    for (const [valor, nombre] of [[f.aportePct, 'aporte'], [f.comisionPct, 'comisión'], [f.primaPct, 'prima']] as [number, string][]) {
      if (!(valor >= 0 && valor <= 100)) {
        this.error.set(`La ${nombre} de ${f.nombre} debe ser un porcentaje entre 0 y 100.`);
        return;
      }
    }
    if (!(f.tope > 0)) {
      this.error.set(`El tope de remuneración asegurable de ${f.nombre} debe ser mayor a 0.`);
      return;
    }
    f.guardando = true;
    const cuerpo = {
      aporteObligatorio: Math.round(f.aportePct * 100) / 10000,
      comisionFlujo: Math.round(f.comisionPct * 100) / 10000,
      primaSeguro: Math.round(f.primaPct * 100) / 10000,
      remuneracionMaximaAsegurable: Math.round(f.tope * 100) / 100
    };
    this.http.put<Afp>(`${API_URL}/afps/${f.idAfp}`, cuerpo).subscribe({
      next: (a) => {
        this.filas.update((l) => l.map((x) => (x.idAfp === a.idAfp ? this.aFila(a) : x)));
        this.mensaje.set(`${a.nombre} guardada. Las boletas ya procesadas no cambian: vuelve a «Procesar planilla» en el periodo que corresponda.`);
      },
      error: (e: HttpErrorResponse) => {
        f.guardando = false;
        this.error.set(e.error?.mensaje ?? `No se pudo guardar ${f.nombre}.`);
      }
    });
  }
}
