import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

/**
 * Conserva vivas las pantallas del sistema al cambiar de módulo: lo que se escribió en un formulario, el periodo elegido
 * o el detalle abierto siguen ahí al volver. Angular normalmente destruye el componente al salir de su ruta; aquí se
 * guarda y se vuelve a enganchar. Al pasar por /login (salir o sesión vencida) se descarta todo lo guardado.
 */
@Injectable({ providedIn: 'root' })
export class ReusoRutasStrategy implements RouteReuseStrategy {
  private guardadas = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    const clave = this.clave(route);
    // Solo pantallas con ruta propia (no el layout ni la raíz) y nunca el login ni el cambio de clave
    return !!route.routeConfig?.path && !!route.component && clave !== 'login' && clave !== 'cambiar-password';
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle) this.guardadas.set(this.clave(route), handle);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    if (this.clave(route) === 'login') {
      this.limpiar();
      return false;
    }
    return this.guardadas.has(this.clave(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.guardadas.get(this.clave(route)) ?? null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  /** Olvida las pantallas guardadas (al salir de la sesión). */
  limpiar(): void {
    this.guardadas.clear();
  }

  private clave(route: ActivatedRouteSnapshot): string {
    return route.pathFromRoot
      .map((r) => r.routeConfig?.path ?? '')
      .filter((p) => p !== '')
      .join('/');
  }
}
