import { environment } from '../../../environments/environment';

// Las direcciones salen de src/environments (desarrollo: localhost:8081; producción: mismo servidor).
export const API_URL = `${environment.apiBase}/api`;

// En producción el socket se abre en el mismo dominio que la pantalla (ws:// o wss:// según http/https).
export const WS_URL =
  environment.wsUrl || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
