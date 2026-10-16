import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'panel', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'panel', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'empleados', loadComponent: () => import('./features/empleados/empleados').then(m => m.Empleados) },
      { path: 'empleados/importar', loadComponent: () => import('./features/empleados/importar-empleados').then(m => m.ImportarEmpleados) },
      { path: 'asistencias', loadComponent: () => import('./features/asistencias/asistencias').then(m => m.Asistencias) },
      { path: 'movimientos', loadComponent: () => import('./features/movimientos/movimientos').then(m => m.Movimientos) },
      { path: 'conceptos', loadComponent: () => import('./features/conceptos/conceptos').then(m => m.Conceptos) },
      { path: 'planilla', loadComponent: () => import('./features/planilla/planilla').then(m => m.Planilla) },
      { path: 'liquidaciones', loadComponent: () => import('./features/liquidaciones/liquidaciones').then(m => m.Liquidaciones) }
    ]
  },
  { path: '**', redirectTo: 'panel' }
];
