// Desarrollo (ng serve): el backend corre aparte. Puerto 6903 = server.port de application.properties.
export const environment = {
  production: false,
  apiBase: 'http://localhost:6903',
  wsUrl: 'ws://localhost:6903/ws'
};
