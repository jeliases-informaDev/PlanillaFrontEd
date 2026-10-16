import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { Concepto } from '../models/concepto.model';
import { upsert } from '../utils/lista';
import { RealtimeService } from './realtime.service';

/** Catálogo de conceptos remunerativos, siempre al día. Lo usan las pantallas de Conceptos y Movimientos. */
@Injectable({ providedIn: 'root' })
export class ConceptosStore {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);
  private iniciado = false;

  readonly conceptos = signal<Concepto[]>([]);

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;

    this.realtime.alConectar$.subscribe(() => this.cargar());
    this.cargar();

    this.realtime.watch<Concepto>('conceptos').subscribe((evento) => {
      this.conceptos.update((lista) => upsert(lista, evento.data, (c) => c.idConcepto));
    });
  }

  private cargar(): void {
    this.http.get<Concepto[]>(`${API_URL}/conceptos`).subscribe((l) => this.conceptos.set(l));
  }
}
