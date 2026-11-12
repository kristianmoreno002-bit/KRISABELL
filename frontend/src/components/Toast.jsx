import { createContext, useCallback, useContext, useState } from 'react';

// Mensajes en pantalla: useToast()('Texto', 'success' | 'error' | 'info').
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(id => setToasts(list => list.filter(t => t.id !== id)), []);
  const show = useCallback((message, type = 'info', duration = 5000) => {
    const id = crypto.randomUUID();
    setToasts(list => [...list, { id, message, type }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span>{t.message}</span>
            <button type="button" className="toast__close" aria-label="Cerrar mensaje" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
