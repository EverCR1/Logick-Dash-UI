/**
 * Acceso centralizado y tipado a las variables de entorno.
 * Toda la app lee la config desde aquí, nunca directo de import.meta.env.
 */
export const env = {
  // Ruta base de la API — se define una sola vez; cada servicio añade solo su endpoint
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
} as const
