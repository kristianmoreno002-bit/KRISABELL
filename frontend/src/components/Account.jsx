import { useEffect, useState } from 'react';
import { request } from '../api.js';
import { Loading, ErrorMessage } from './Status.jsx';
import { useToast } from './Toast.jsx';

// Cuenta de cliente: registro, inicio de sesión y cierre de sesión (/api/auth/*).
export default function Account() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', remember: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    request('/api/auth/session')
      .then(data => setUser(data.user))
      .catch(() => setUser(null)) // 401 = no hay sesión, no es un error para el usuario
      .finally(() => setChecking(false));
  }, []);

  const update = field => e =>
    setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const data = await request(path, { method: 'POST', body: form });
      setUser(data.user);
      toast(mode === 'login' ? `¡Sesión iniciada! Hola de nuevo, ${data.user.name}.` : `¡Cuenta creada! Bienvenido/a, ${data.user.name}.`, 'success');
      setForm({ name: '', email: '', password: '', remember: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try { await request('/api/auth/logout', { method: 'POST' }); } catch { /* sesión ya vencida */ }
    setUser(null);
    toast('Sesión cerrada. ¡Hasta pronto!', 'info');
  }

  if (checking) return <Loading text="Verificando sesión…" />;

  if (user) {
    return (
      <section>
        <h2>Mi cuenta</h2>
        <p>Hola, <strong>{user.name}</strong> ({user.email}).</p>
        <button type="button" onClick={logout}>Cerrar sesión</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="cuenta-titulo">
      <h2 id="cuenta-titulo">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
      <form onSubmit={submit} className="form">
        {mode === 'register' && (
          <label>Nombre<input value={form.name} onChange={update('name')} autoComplete="name" required /></label>
        )}
        <label>Correo<input type="email" value={form.email} onChange={update('email')} autoComplete="email" required /></label>
        <label>Contraseña (mínimo 12 caracteres)
          <input type="password" value={form.password} onChange={update('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={12} required />
        </label>
        <label className="check"><input type="checkbox" checked={form.remember} onChange={update('remember')} /> Recordarme 30 días</label>
        <button type="submit" disabled={busy}>{busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Registrarme'}</button>
        <ErrorMessage message={error} />
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </form>
    </section>
  );
}
