import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable, filter, map } from 'rxjs';
import { WS_URL } from '../config/api.config';
import { AuthService } from './auth.service';

/** Mensaje que empuja el backend (ver EventoTiempoReal.java). */
export interface EventoTiempoReal<T = unknown> {
  entidad: string;
  accion: string;
  id: number | string | null;
  data: T;
  momento: string;
}

export const ENTIDADES_TIEMPO_REAL = ['empleados', 'asistencias', 'movimientos', 'conceptos', 'boletas'] as const;

/**
 * Conexión única y compartida al backend por WebSocket/STOMP.
 * - Se reconecta sola (cada 3 s) y vuelve a suscribir los temas.
 * - Cada pantalla usa `watch(entidad)` para recibir cambios y `alConectar$` para recargar su lista
 *   (así no se pierde nada de lo ocurrido mientras estuvo desconectada).
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private router = inject(Router);
  private rx = new RxStomp();

  /** true mientras el socket está abierto: alimenta el indicador "En vivo". */
  readonly conectado = signal(false);

  /** Emite cada vez que el socket queda abierto (primera conexión y reconexiones). */
  readonly alConectar$: Observable<void> = this.rx.connectionState$.pipe(
    filter((estado) => estado === RxStompState.OPEN),
    map(() => undefined)
  );

  constructor() {
    this.rx.connectionState$.subscribe((estado) => this.conectado.set(estado === RxStompState.OPEN));

    // Si el servidor rechaza el token (vencido/inválido) se cierra la sesión
    this.rx.stompErrors$.subscribe(() => {
      this.desconectar();
      this.auth.logout();
      this.router.navigate(['/login']);
    });
  }

  conectar(): void {
    if (typeof WebSocket === 'undefined' || this.rx.active) return; // SSR o ya conectado
    this.rx.configure({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // El token se lee en cada (re)conexión para usar siempre el vigente
      beforeConnect: (rx) => {
        rx.stompClient.connectHeaders = { Authorization: `Bearer ${this.auth.getToken() ?? ''}` };
      }
    });
    this.rx.activate();
  }

  desconectar(): void {
    if (this.rx.active) {
      void this.rx.deactivate();
    }
  }

  watch<T = unknown>(entidad: string): Observable<EventoTiempoReal<T>> {
    return this.rx.watch(`/topic/${entidad}`).pipe(map((m) => JSON.parse(m.body) as EventoTiempoReal<T>));
  }
}
