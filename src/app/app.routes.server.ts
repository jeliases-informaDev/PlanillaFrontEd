import { RenderMode, ServerRoute } from '@angular/ssr';

// Es un panel privado (login + datos en vivo): no tiene sentido pre-renderizar en el servidor.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
