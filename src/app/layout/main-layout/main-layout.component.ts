import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected realtime = inject(RealtimeService);

  protected readonly enlaces = [
    { ruta: '/panel', texto: 'Panel en vivo' },
    { ruta: '/empleados', texto: 'Empleados' },
    { ruta: '/asistencias', texto: 'Asistencias' },
    { ruta: '/movimientos', texto: 'Movimientos' },
    { ruta: '/conceptos', texto: 'Conceptos' },
    { ruta: '/planilla', texto: 'Planilla' },
    { ruta: '/reportes', texto: 'Reportes' },
    { ruta: '/liquidaciones', texto: 'Liquidaciones' }
  ];

  protected readonly enlacesAdmin = [
    { ruta: '/usuarios', texto: 'Usuarios' },
    { ruta: '/auditoria', texto: 'Auditoría' }
  ];

  ngOnInit(): void {
    this.realtime.conectar();
  }

  ngOnDestroy(): void {
    this.realtime.desconectar();
  }

  protected get rol(): string {
    return this.auth.getRol() === 'ADMIN' ? 'Contador' : 'Gerencia (solo lectura)';
  }

  protected get nombre(): string {
    return this.auth.getNombre();
  }

  protected get esAdmin(): boolean {
    return this.auth.esAdmin();
  }

  protected salir(): void {
    this.realtime.desconectar();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
