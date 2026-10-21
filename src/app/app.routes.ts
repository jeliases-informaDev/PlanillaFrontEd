import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { adminGuard, authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'panel', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'cambiar-password', loadComponent: () => import('./features/auth/cambiar-password').then(m => m.CambiarPassword), canActivate: [authGuard] },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'panel', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'empleados', loadComponent: () => import('./features/empleados/empleados').then(m => m.Empleados) },
      { path: 'empleados/importar', canActivate: [adminGuard], loadComponent: () => import('./features/empleados/importar-empleados').then(m => m.ImportarEmpleados) },
      {
        path: 'empleados/actualizar',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/importar/importar-archivo').then(m => m.ImportarArchivo),
        data: {
          titulo: 'Actualizar empleados en masa',
          ayuda: 'Descarga el Excel con los empleados actuales, cambia solo las celdas que correspondan (por ejemplo el sueldo) y vuelve a subirlo. Una celda vacía significa «sin cambio». Solo se guardan las filas con diferencias y, si una falla, no se guarda ninguna.',
          importarUrl: '/empleados/actualizar-masivo',
          plantillaUrl: '/empleados/actuales.xlsx',
          plantillaNombre: 'empleados-actuales.xlsx',
          volverA: '/empleados',
          volverTexto: 'Volver a empleados'
        }
      },
      { path: 'asistencias', loadComponent: () => import('./features/asistencias/asistencias').then(m => m.Asistencias) },
      {
        path: 'asistencias/importar',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/importar/importar-archivo').then(m => m.ImportarArchivo),
        data: {
          titulo: 'Importar asistencia del marcador',
          ayuda: 'Sube el Excel tal como lo descarga el marcador biométrico (hoja «Attendance Record»). Cada celda del día trae las marcaciones en este orden: ingreso, almuerzo inicio, almuerzo fin y salida laboral. El ID del reloj debe ser el documento del trabajador o su «ID en el marcador». Antes carga los horarios (tareo) si los asesores rotan de turno; sin horario programado rige lunes a viernes de 9:00 a 18:00 y los feriados no cuentan como falta.',
          importarUrl: '/asistencias/importar',
          volverA: '/asistencias',
          volverTexto: 'Volver a asistencias'
        }
      },
      {
        path: 'horarios/importar',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/importar/importar-archivo').then(m => m.ImportarArchivo),
        data: {
          titulo: 'Cargar horarios (tareo)',
          ayuda: 'Los asesores rotan de horario cada semana. Carga aquí el tareo: una fila por trabajador y día con su entrada y salida (o descanso). La tardanza se mide contra la entrada de este horario.',
          importarUrl: '/horarios/importar',
          plantillaUrl: '/horarios/plantilla',
          plantillaNombre: 'plantilla-horarios.xlsx',
          volverA: '/asistencias',
          volverTexto: 'Volver a asistencias'
        }
      },
      { path: 'movimientos', loadComponent: () => import('./features/movimientos/movimientos').then(m => m.Movimientos) },
      { path: 'conceptos', loadComponent: () => import('./features/conceptos/conceptos').then(m => m.Conceptos) },
      { path: 'planilla', loadComponent: () => import('./features/planilla/planilla').then(m => m.Planilla) },
      { path: 'reportes', loadComponent: () => import('./features/reportes/reportes').then(m => m.Reportes) },
      { path: 'liquidaciones', loadComponent: () => import('./features/liquidaciones/liquidaciones').then(m => m.Liquidaciones) },
      { path: 'afps', loadComponent: () => import('./features/afps/afps').then(m => m.Afps) },
      { path: 'usuarios', canActivate: [adminGuard], loadComponent: () => import('./features/usuarios/usuarios').then(m => m.Usuarios) },
      { path: 'auditoria', canActivate: [adminGuard], loadComponent: () => import('./features/auditoria/auditoria').then(m => m.Auditoria) }
    ]
  },
  { path: '**', redirectTo: 'panel' }
];
