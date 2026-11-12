import { useEffect, useState } from 'react';
import ProductList from './components/ProductList.jsx';
import ContactForm from './components/ContactForm.jsx';
import Account from './components/Account.jsx';
import AdminPanel from './components/AdminPanel.jsx';

// Navegación simple por hash (#catalogo, #contacto...): no necesita servidor
// y funciona igual en GitHub Pages.
const TABS = [
  { id: 'catalogo', label: 'Catálogo', view: <ProductList /> },
  { id: 'contacto', label: 'Contacto', view: <ContactForm /> },
  { id: 'cuenta', label: 'Mi cuenta', view: <Account /> },
  { id: 'admin', label: 'Admin', view: <AdminPanel /> }
];

const currentTab = () => TABS.find(t => `#${t.id}` === window.location.hash) || TABS[0];

export default function App() {
  const [tab, setTab] = useState(currentTab);

  useEffect(() => {
    const onHash = () => setTab(currentTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#catalogo">KRISABELL</a>
        <nav aria-label="Principal">
          {TABS.map(t => (
            <a key={t.id} href={`#${t.id}`} className={t.id === tab.id ? 'active' : ''}
              aria-current={t.id === tab.id ? 'page' : undefined}>{t.label}</a>
          ))}
        </nav>
      </header>
      <main>{tab.view}</main>
      <footer className="site-footer">KRISABELL · Belleza con intención</footer>
    </>
  );
}
