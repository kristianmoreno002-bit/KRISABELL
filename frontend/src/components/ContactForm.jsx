import { useState } from 'react';
import { request } from '../api.js';
import { ErrorMessage, Success } from './Status.jsx';
import { useToast } from './Toast.jsx';

const EMPTY = { nombre: '', email: '', asunto: '', mensaje: '' };

// Formulario real: valida en el navegador y guarda el mensaje con POST /api/contact.
export default function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const toast = useToast();

  const update = field => e => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setDone('');
    if (Object.values(form).some(v => !v.trim())) {
      return setError('Completa todos los campos.');
    }
    setSending(true);
    try {
      const result = await request('/api/contact', { method: 'POST', body: form });
      setDone(result.message);
      toast('¡Mensaje enviado! Te responderemos pronto.', 'success');
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="contacto-titulo">
      <h2 id="contacto-titulo">Contacto</h2>
      <form onSubmit={submit} className="form" noValidate>
        <label>Nombre<input value={form.nombre} onChange={update('nombre')} maxLength={100} autoComplete="name" /></label>
        <label>Correo<input type="email" value={form.email} onChange={update('email')} autoComplete="email" /></label>
        <label>Asunto<input value={form.asunto} onChange={update('asunto')} maxLength={150} /></label>
        <label>Mensaje<textarea rows={5} value={form.mensaje} onChange={update('mensaje')} maxLength={3000} /></label>
        <button type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar mensaje'}</button>
        <ErrorMessage message={error} />
        <Success message={done} />
      </form>
    </section>
  );
}
