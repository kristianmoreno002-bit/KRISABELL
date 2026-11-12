import { useCallback, useEffect, useMemo, useState } from 'react';
import { request, formatCOP } from '../api.js';
import { Loading, ErrorMessage } from './Status.jsx';

// Catálogo público: GET /api/products, con búsqueda y filtro por categoría.
export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('Todas');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProducts(await request('/api/products'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => ['Todas', ...new Set(products.map(p => p.categoria))], [products]);
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return products.filter(p =>
      (category === 'Todas' || p.categoria === category) &&
      (!text || `${p.nombre} ${p.descripcion} ${p.subcategoria}`.toLowerCase().includes(text)));
  }, [products, category, query]);

  return (
    <section aria-labelledby="catalogo-titulo">
      <h2 id="catalogo-titulo">Catálogo</h2>
      <div className="toolbar">
        <input type="search" placeholder="Buscar producto…" value={query}
          onChange={e => setQuery(e.target.value)} aria-label="Buscar producto" />
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filtrar por categoría">
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading && <Loading text="Cargando productos…" />}
      <ErrorMessage message={error} onRetry={load} />
      {!loading && !error && visible.length === 0 && <p className="status">No hay productos que coincidan.</p>}

      <ul className="grid">
        {visible.map(p => (
          <li key={p.id} className="card fade-in">
            <span className="tag">{p.categoria}{p.subcategoria && p.subcategoria !== 'General' ? ` · ${p.subcategoria}` : ''}</span>
            <h3>{p.nombre}</h3>
            <p>{p.descripcion}</p>
            <strong className="price">{formatCOP(p.precio)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
