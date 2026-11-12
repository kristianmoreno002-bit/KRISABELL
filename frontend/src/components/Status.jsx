// Mensajes reutilizables: carga, error y éxito (criterio UX de la ruta avanzada).
export function Loading({ text = 'Cargando…' }) {
  return <p className="status loading" role="status"><span className="spinner" aria-hidden="true" />{text}</p>;
}

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <p className="status error" role="alert">
      {message}
      {onRetry && <button type="button" className="link" onClick={onRetry}>Reintentar</button>}
    </p>
  );
}

export function Success({ message }) {
  return message ? <p className="status success" role="status">{message}</p> : null;
}
