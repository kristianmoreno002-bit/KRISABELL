// Cliente único para hablar con la API Express.
// React nunca se conecta a MongoDB: todo pasa por estas llamadas HTTP.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

export async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include' // necesario: la sesión viaja en una cookie HttpOnly
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa que la API esté encendida.');
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const payload = response.status !== 204 && isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Error del servidor (${response.status}).`);
  }
  return payload;
}

export const formatCOP = value =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
