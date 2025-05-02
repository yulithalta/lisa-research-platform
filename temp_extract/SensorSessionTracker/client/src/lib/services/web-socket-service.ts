/**
 * Servicio centralizado para la gestión de WebSockets
 * Este servicio permite tener un token único para todas las conexiones WebSocket
 * y evitar problemas de conexión relacionados con nombres de host incorrectos
 */

// Token para WebSocket - compartido entre todas las instancias
let wsToken = '';

/**
 * Genera un token aleatorio para WebSocket que se usará en todas las conexiones
 * @returns String con el token generado
 */
const generateToken = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Obtiene el token actual de WebSocket o genera uno nuevo si no existe
 * @returns Token de WebSocket
 */
export function getWebSocketToken(): string {
  if (!wsToken) {
    wsToken = generateToken();
  }
  return wsToken;
}

/**
 * Construye una URL de WebSocket utilizando el hostname actual
 * y un token único para evitar conflictos
 * @param path Ruta opcional del WebSocket (por defecto '/ws')
 * @returns URL completa de WebSocket
 */
export function buildWebSocketUrl(path: string = '/ws'): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const port = window.location.port ? `:${window.location.port}` : '';
  const token = getWebSocketToken();
  
  // Construimos la URL usando el nombre de host actual, sin dependencias a 'lisa.local'
  return `${protocol}//${window.location.hostname}${port}${path}?token=${token}`;
}