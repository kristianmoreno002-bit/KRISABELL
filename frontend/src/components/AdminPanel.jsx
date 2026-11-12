import { useCallback, useEffect, useState } from 'react';
import { request, formatCOP } from '../api.js';
import { Loading, ErrorMessage, Success } from './Status.jsx';
import { useToast } from './Toast.jsx';

const CATEGORIAS = ['Maquillaje', 'Cuidado Facial', 'Accesorios', 'Novedades', 'Ofertas'];
const SUBCATEGORIAS = ['Labios', 'Ojos', 'Rostro'];
const ESTADOS = ['nuevo', 'leido', 'cerrado'];
const EMPTY_PRODUCT = { nombre: '', categoria: 'Maquillaje', subcategoria: 'Labios', precio: '', descripcion: '' };

// Panel privado: login de administrador + gestión de productos y mensajes (/api/admin/*).
export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    request('/api/admin/session')
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <Loading text="Verificando acceso…" />;
  return authed ? <Dashboard onLogout={() => setAuthed(false)} /> : <AdminLogin onLogin={() => setAuthed(true)} />;
}

function AdminLogin({ onLogin }) {
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await request('/api/admin/login', { method: 'POST', body: form });
      toast('Sesión de administrador iniciada.', 'success');
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="admin-titulo">
      <h2 id="admin-titulo">Administración</h2>
      <form onSubmit={submit} className="form">
        <label>Correo<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Contraseña<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
        <button type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <ErrorMessage message={error} />
      </form>
    </section>
  );
}

function Dashboard({ onLogout }) {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, c] = await Promise.all([request('/api/admin/products'), request('/api/admin/contacts')]);
      setProducts(p); setContacts(c);
    } catch (err) {
      // Sesión vencida: volver al login.
      if (/Inicia sesión/i.test(err.message)) return onLogout();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { load(); }, [load]);

  async function run(action, okMessage) {
    setError(''); setNotice('');
    try { await action(); setNotice(okMessage); toast(okMessage, 'success'); await load(); }
    catch (err) { setError(err.message); }
  }

  const saveProduct = e => {
    e.preventDefault();
    const body = { ...form, precio: Number(form.precio), subcategoria: form.categoria === 'Maquillaje' ? form.subcategoria : 'General' };
    run(async () => {
      if (editingId) await request(`/api/admin/products/${editingId}`, { method: 'PUT', body });
      else await request('/api/admin/products', { method: 'POST', body });
      setForm(EMPTY_PRODUCT); setEditingId(null);
    }, editingId ? 'Producto actualizado.' : 'Producto creado.');
  };

  const edit = p => {
    setEditingId(p.id);
    setForm({ nombre: p.nombre, categoria: p.categoria, subcategoria: p.subcategoria, precio: String(p.precio), descripcion: p.descripcion });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logout = async () => {
    try { await request('/api/admin/logout', { method: 'POST' }); } catch { /* ya vencida */ }
    onLogout();
  };

  return (
    <section>
      <div className="row between">
        <h2>Panel de administración</h2>
        <button type="button" onClick={logout}>Cerrar sesión</button>
      </div>
      <ErrorMessage message={error} onRetry={load} />
      <Success message={notice} />

      <h3>{editingId ? 'Editar producto' : 'Nuevo producto'}</h3>
      <form onSubmit={saveProduct} className="form">
        <label>Nombre<input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required maxLength={100} /></label>
        <label>Categoría
          <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        {form.categoria === 'Maquillaje' && (
          <label>Subcategoría
            <select value={form.subcategoria} onChange={e => setForm({ ...form, subcategoria: e.target.value })}>
              {SUBCATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
        )}
        <label>Precio (COP)<input type="number" min="1" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} required /></label>
        <label>Descripción<textarea rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required maxLength={1000} /></label>
        <div className="row">
          <button type="submit">{editingId ? 'Guardar cambios' : 'Crear producto'}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(EMPTY_PRODUCT); }}>Cancelar</button>}
        </div>
      </form>

      {loading && <Loading />}

      <h3>Productos ({products.length})</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Visible</th><th></th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className={p.active ? '' : 'muted'}>
                <td>{p.nombre}</td><td>{p.categoria}</td><td>{formatCOP(p.precio)}</td>
                <td>
                  <input type="checkbox" checked={p.active} aria-label={`Mostrar ${p.nombre}`}
                    onChange={e => run(() => request(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { active: e.target.checked } }), 'Visibilidad actualizada.')} />
                </td>
                <td><button type="button" className="secondary" onClick={() => edit(p)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Mensajes de contacto ({contacts.length})</h3>
      {contacts.length === 0 && !loading && <p className="status">Aún no hay mensajes.</p>}
      <ul className="messages">
        {contacts.map(c => (
          <li key={c.id} className="card">
            <div className="row between">
              <strong>{c.asunto}</strong>
              <select value={c.estado} aria-label="Estado del mensaje"
                onChange={e => run(() => request(`/api/admin/contacts/${c.id}`, { method: 'PATCH', body: { estado: e.target.value } }), 'Estado actualizado.')}>
                {ESTADOS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <small>{c.nombre} · {c.email} · {new Date(c.created_at).toLocaleString('es-CO')}</small>
            <p>{c.mensaje}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
