import { ApplicationConfig } from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { routes } from './app.routes';
import { ReusoRutasStrategy } from './core/routing/reuso-rutas.strategy';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http'; // <-- Importar withFetch
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Las pantallas se conservan al cambiar de módulo (no se pierde lo escrito en los formularios)
    { provide: RouteReuseStrategy, useExisting: ReusoRutasStrategy },
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])) // <-- Agregarlo aquí
  ]
};