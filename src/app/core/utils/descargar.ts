import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Descarga un archivo del backend respetando el nombre que manda el servidor (Content-Disposition). */
export function descargar(http: HttpClient, url: string, nombrePorDefecto: string, abrirEnPestana = false): Observable<void> {
  return new Observable<void>((sub) => {
    http.get(url, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (resp) => {
        const cabecera = resp.headers.get('Content-Disposition') ?? '';
        const nombre = /filename="?([^";]+)"?/.exec(cabecera)?.[1] ?? nombrePorDefecto;
        const blob = resp.body ?? new Blob();
        const enlace = URL.createObjectURL(blob);
        if (abrirEnPestana) {
          window.open(enlace, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = enlace;
          a.download = nombre;
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(enlace), 60_000);
        sub.next();
        sub.complete();
      },
      error: async (e: HttpErrorResponse) => {
        // Con responseType blob el JSON de error viene como Blob
        let mensaje = 'No se pudo descargar el archivo.';
        try {
          const texto = e.error instanceof Blob ? await e.error.text() : String(e.error);
          mensaje = JSON.parse(texto).mensaje ?? mensaje;
        } catch {
          /* se deja el mensaje por defecto */
        }
        sub.error(new Error(mensaje));
      }
    });
  });
}
