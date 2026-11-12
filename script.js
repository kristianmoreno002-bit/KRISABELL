/**
 * KRISABELL - Funcionalidades principales
 */

const localHosts = ['localhost', '127.0.0.1'];
const configuredApiUrl = window.KRISABELL_API_URL ||
  (localHosts.includes(window.location.hostname) ? `http://${window.location.hostname}:3001` : '');
const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '');

window.KRISABELL_API = {
  baseUrl: API_BASE_URL,
  get configured() {
    return Boolean(API_BASE_URL);
  },
  async request(path, options = {}) {
    if (!API_BASE_URL) {
      throw new Error('Configura la URL de la API en data/api-config.js.');
    }

    const headers = { ...options.headers };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include'
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = response.status === 204
      ? null
      : contentType.includes('application/json')
        ? await response.json()
        : null;

    if (!response.ok) {
      throw new Error(payload && payload.error ? payload.error : `Error del servidor (${response.status}).`);
    }
    if (response.status !== 204 && payload === null) {
      throw new Error('El servidor devolvió una respuesta inválida.');
    }
    return payload;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar componentes
  initMobileMenu();
  initCartCounter();
  initAuthTabs();
  renderCartPage();
  initContactForm();
  initSearch();
  initRemoteCatalog();
});

/* ==========================================================================
   1. NAVEGACIÓN MÓVIL Y ACCESIBILIDAD
   ========================================================================== */
function initMobileMenu() {
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const body = document.body;

  if (!navToggle || !mainNav) return;

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');

    // Actualizar accesibilidad
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');

    // Bloquear el scroll del fondo cuando el menú esté abierto
    body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Cerrar el menú al hacer clic en un enlace (útil en móviles)
  const menuLinks = mainNav.querySelectorAll('.menu-list a:not([href="#"])');
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (mainNav.classList.contains('is-open')) {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menú');
        body.style.overflow = '';
      }
    });
  });

  // Desplegable de submenú en pantallas móviles (al hacer tap)
  const parentMenuItems = mainNav.querySelectorAll('.menu-list > li');

  parentMenuItems.forEach(item => {
    const subMenu = item.querySelector('ul');
    const parentLink = item.querySelector('a');

    if (subMenu && parentLink) {
      parentLink.addEventListener('click', (e) => {
        // Solo aplica en pantallas chicas donde la navegación móvil está activa
        if (window.innerWidth <= 900) {
          // Si tiene submenú y aún no se ha abierto, previene la navegación inmediata
          if (!item.classList.contains('submenu-open')) {
            e.preventDefault();
            item.classList.add('submenu-open');
          }
        }
      });
    }
  });
}

/* ==========================================================================
   2. GESTIÓN DEL CARRITO DE COMPRAS
   ========================================================================== */
/**
 * Módulo dinámico del carrito para actualizar el badge y almacenar 
 * en el almacenamiento local del navegador (localStorage).
 */
const Cart = {
  // Obtener items actuales de localStorage
  getItems() {
    const items = localStorage.getItem('krisabell_cart');
    return items ? JSON.parse(items) : [];
  },

  // Guardar items
  saveItems(items) {
    localStorage.setItem('krisabell_cart', JSON.stringify(items));
    this.updateBadge();
  },

  // Añadir un producto
  addItem(product) {
    const items = this.getItems();
    const existingIndex = items.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      items[existingIndex].quantity += product.quantity || 1;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity || 1
      });
    }

    this.saveItems(items);
  },

  // Obtener total de productos (suma de cantidades)
  getTotalCount() {
    const items = this.getItems();
    return items.reduce((total, item) => total + item.quantity, 0);
  },

  // Actualizar el número visual del badge del carrito
  updateBadge() {
    const cartCountElement = document.querySelector('.cart-count');
    const cartBtn = document.querySelector('.cart-btn');

    if (cartCountElement) {
      const totalCount = this.getTotalCount();
      cartCountElement.textContent = totalCount;

      // Actualizar atributo accesible
      if (cartBtn) {
        cartBtn.setAttribute(
          'aria-label',
          `Carrito de compras, ${totalCount} ${totalCount === 1 ? 'producto' : 'productos'}`
        );
      }
    }
  }
};

function initCartCounter() {
  // Sincronizar el badge inicial con lo que haya en memoria
  Cart.updateBadge();

  // Escuchar evento personalizado si se agregan productos desde otros scripts
  window.addEventListener('cart:updated', () => {
    Cart.updateBadge();
  });
}

// Listener para los botones "Añadir al Carrito"
// (con validación de precio incluida — este es el único listener para btn-add-cart)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-add-cart')) {
    const btn = e.target;
    const price = parseFloat(btn.dataset.price);

    if (isNaN(price)) {
      console.warn('Este producto todavía no tiene un precio válido:', btn.dataset.name);
      return; // no agrega el producto al carrito
    }

    const product = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: price,
      quantity: 1
    };

    Cart.addItem(product);

    // Feedback visual momentáneo
    const originalText = btn.textContent;
    btn.textContent = '¡Añadido!';
    btn.style.backgroundColor = '#2d6a4f';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.backgroundColor = '';
    }, 1200);
  }
});

/* ==========================================================================
   3. PESTAÑAS DE LOGIN / REGISTRO
   ========================================================================== */
function initAuthTabs() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (!tabLogin || !tabRegister) return;
  const tabs = document.querySelector('.auth-tabs');
  const accountPanel = document.getElementById('customer-account');
  const customerIdentity = document.getElementById('customer-identity');
  const authStatus = document.getElementById('auth-status');
  const logoutButton = document.getElementById('customer-logout');

  function activateTab(tabToShow, tabToHide, formToShow, formToHide) {
    tabToShow.classList.add('active');
    tabToShow.setAttribute('aria-selected', 'true');
    tabToHide.classList.remove('active');
    tabToHide.setAttribute('aria-selected', 'false');

    formToShow.style.display = 'block';
    formToShow.classList.add('active');
    formToHide.style.display = 'none';
    formToHide.classList.remove('active');
  }

  function showStatus(message, state = 'info') {
    authStatus.textContent = message;
    authStatus.dataset.state = state;
    authStatus.hidden = !message;
  }

  function showAccount(user) {
    tabs.hidden = true;
    formLogin.style.display = 'none';
    formRegister.style.display = 'none';
    accountPanel.hidden = false;
    customerIdentity.textContent = `${user.name} · ${user.email}`;
  }

  function showForms() {
    accountPanel.hidden = true;
    tabs.hidden = false;
    activateTab(tabLogin, tabRegister, formLogin, formRegister);
  }

  async function submitAuthForm(form, path, includeRemember = false) {
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    showStatus('Procesando...', 'info');

    try {
      const fields = Object.fromEntries(new FormData(form).entries());
      if (includeRemember) {
        fields.remember = form.elements.remember.checked;
      }
      const result = await window.KRISABELL_API.request(path, {
        method: 'POST',
        body: JSON.stringify(fields)
      });
      form.reset();
      showAccount(result.user);
      showStatus('Sesión iniciada.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  }

  tabLogin.addEventListener('click', () => {
    activateTab(tabLogin, tabRegister, formLogin, formRegister);
    showStatus('');
  });

  tabRegister.addEventListener('click', () => {
    activateTab(tabRegister, tabLogin, formRegister, formLogin);
    showStatus('');
  });

  formLogin.addEventListener('submit', event => {
    event.preventDefault();
    submitAuthForm(formLogin, '/api/auth/login', true);
  });

  formRegister.addEventListener('submit', event => {
    event.preventDefault();
    submitAuthForm(formRegister, '/api/auth/register');
  });

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await window.KRISABELL_API.request('/api/auth/logout', { method: 'POST' });
      showForms();
      showStatus('Sesión cerrada.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      logoutButton.disabled = false;
    }
  });

  if (!window.KRISABELL_API.configured) {
    showStatus('El registro y el inicio de sesión estarán disponibles al conectar la API.', 'error');
    return;
  }

  window.KRISABELL_API.request('/api/auth/session')
    .then(session => showAccount(session.user))
    .catch(error => {
      if (error.message !== 'Inicia sesión para continuar.') {
        showStatus(error.message, 'error');
      }
    });
}

/* ==========================================================================
   4. FORMULARIO DE CONTACTO
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('form-contacto');
  if (!form) return;

  const confirmation = document.getElementById('contacto-confirmacion');
  const submitButton = form.querySelector('[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    confirmation.style.display = 'block';
    confirmation.dataset.state = 'loading';
    confirmation.textContent = 'Enviando tu mensaje...';
    submitButton.disabled = true;

    try {
      const formData = Object.fromEntries(new FormData(form).entries());
      const result = await window.KRISABELL_API.request('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      confirmation.dataset.state = 'success';
      confirmation.textContent = result.message;
      form.reset();
    } catch (error) {
      confirmation.dataset.state = 'error';
      confirmation.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });
}

/* ==========================================================================
   5. RENDERIZADO DE LA PÁGINA DEL CARRITO
   ========================================================================== */
function renderCartPage() {
  const tableBody = document.getElementById('cart-table-body');
  if (!tableBody) return; // Solo se ejecuta si estamos en Carrito.html

  const emptyMessage = document.getElementById('cart-empty-message');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('btn-checkout');

  function draw() {
    const items = Cart.getItems();
    tableBody.innerHTML = '';

    if (items.length === 0) {
      emptyMessage.style.display = 'block';
      subtotalEl.textContent = formatPrice(0);
      totalEl.textContent = formatPrice(0);
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    emptyMessage.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = false;

    let subtotal = 0;

    items.forEach(item => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;

      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.textContent = item.name;
      const priceCell = document.createElement('td');
      priceCell.textContent = formatPrice(item.price);
      const quantityCell = document.createElement('td');
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.className = 'cart-qty-input';
      quantityInput.min = '1';
      quantityInput.value = String(item.quantity);
      quantityInput.dataset.id = item.id;
      quantityCell.appendChild(quantityInput);
      const subtotalCell = document.createElement('td');
      subtotalCell.textContent = formatPrice(itemSubtotal);
      const actionsCell = document.createElement('td');
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn-remove-item';
      removeButton.dataset.id = item.id;
      removeButton.textContent = 'Eliminar';
      actionsCell.appendChild(removeButton);
      row.append(nameCell, priceCell, quantityCell, subtotalCell, actionsCell);
      tableBody.appendChild(row);
    });

    subtotalEl.textContent = formatPrice(subtotal);
    totalEl.textContent = formatPrice(subtotal);
  }

  // Cambiar cantidad
  tableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('cart-qty-input')) {
      const id = e.target.dataset.id;
      const newQty = Math.max(1, parseInt(e.target.value) || 1);
      const items = Cart.getItems();
      const item = items.find(i => i.id === id);
      if (item) {
        item.quantity = newQty;
        Cart.saveItems(items);
        draw();
      }
    }
  });

  // Eliminar producto
  tableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-item')) {
      const id = e.target.dataset.id;
      const items = Cart.getItems().filter(i => i.id !== id);
      Cart.saveItems(items);
      draw();
    }
  });

  draw();
}

/* ==========================================================================
   6. BUSCADOR
   ========================================================================== */

// ÍNDICE DE PRODUCTOS: agrega aquí cada producto real conforme los vayas definiendo.
// "url" es relativo a la carpeta paginas/ (donde viven Maquillaje.html, Ofertas.html, etc.)
const searchIndex = [
  { name: "Labial Mate", category: "Maquillaje · Labios", url: "Maquillaje.html#Labios" },
  { name: "Paleta de Sombras", category: "Maquillaje · Ojos", url: "Maquillaje.html#Ojos" },
  { name: "Base de Rostro", category: "Maquillaje · Rostro", url: "Maquillaje.html#Rostro" },
  { name: "Sérum Hidratante", category: "Cuidado Facial", url: "Cuidadofacial.html" },
  { name: "Set de Brochas", category: "Accesorios", url: "Accesorios.html" },
  // Agrega el resto de tus productos siguiendo este mismo formato...
];

function initSearch() {
  const searchBtn = document.querySelector('.icon-btn[aria-label="Buscar"]');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const closeBtn = document.getElementById('search-close');
  const resultsList = document.getElementById('search-results');
  const emptyMsg = document.getElementById('search-empty');

  if (!searchBtn || !overlay) return;

  // Detecta si estamos dentro de /paginas/ o en la raíz, para armar bien los links
  const inSubfolder = window.location.pathname.includes('/paginas/');
  const basePath = inSubfolder ? '' : 'paginas/';

  function openSearch() {
    overlay.classList.add('is-open');
    input.value = '';
    resultsList.innerHTML = '';
    emptyMsg.style.display = 'none';
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 50);
  }

  function closeSearch() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function renderResults(query) {
    resultsList.innerHTML = '';

    if (!query.trim()) {
      emptyMsg.style.display = 'none';
      return;
    }

    const products = window.KRISABELL_DATA
      ? window.KRISABELL_DATA.PRODUCTOS.map(product => ({
        name: product.nombre,
        category: `${product.categoria} · ${product.subcategoria}`,
        url: product.url
      }))
      : searchIndex;
    const matches = products.filter(product =>
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    matches.forEach(product => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `${basePath}${product.url}`;
      const name = document.createElement('span');
      name.className = 'search-result-name';
      name.textContent = product.name;
      const category = document.createElement('span');
      category.className = 'search-result-category';
      category.textContent = product.category;
      link.append(name, category);
      li.appendChild(link);
      resultsList.appendChild(li);
    });
  }

  searchBtn.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearch();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeSearch();
    }
  });

  input.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });
}

async function initRemoteCatalog() {
  const pageName = window.location.pathname.split('/').pop().toLowerCase();
  const categoryByPage = {
    'maquillaje.html': 'Maquillaje',
    'cuidadofacial.html': 'Cuidado Facial',
    'accesorios.html': 'Accesorios',
    'novedades.html': 'Novedades',
    'ofertas.html': 'Ofertas'
  };
  const category = categoryByPage[pageName];
  if (!category || !window.KRISABELL_API.configured) return;

  try {
    const products = await window.KRISABELL_API.request('/api/products');
    if (!Array.isArray(products)) {
      throw new Error('El catálogo recibido no tiene el formato esperado.');
    }

    const catalog = window.KRISABELL_DATA && window.KRISABELL_DATA.PRODUCTOS;
    if (Array.isArray(catalog)) {
      catalog.splice(0, catalog.length, ...products);
    }

    const pageProducts = products.filter(product => product.categoria === category);
    if (category === 'Maquillaje') {
      const gridsBySubcategory = {
        Labios: document.querySelector('#Labios .product-grid'),
        Ojos: document.querySelector('#Ojos .product-grid'),
        Rostro: document.querySelector('#Rostro .product-grid')
      };

      Object.entries(gridsBySubcategory).forEach(([subcategory, grid]) => {
        if (grid) {
          renderProducts(grid, pageProducts.filter(product => product.subcategoria === subcategory));
        }
      });
      return;
    }

    const grid = document.querySelector('.product-grid');
    if (grid) {
      renderProducts(grid, pageProducts);
    }
  } catch (error) {
    console.error('No se pudo actualizar el catálogo desde la API:', error);
    const section = document.querySelector('.catalog-section');
    if (section) {
      const notice = document.createElement('p');
      notice.className = 'catalog-api-error';
      notice.setAttribute('role', 'status');
      notice.textContent = 'No se pudo actualizar el catálogo desde el servidor. Se muestran los productos disponibles en esta página.';
      section.prepend(notice);
    }
  }
}

function renderProducts(grid, products) {
  if (products.length === 0) {
    grid.replaceChildren();
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'No hay productos disponibles en esta categoría.';
    grid.appendChild(emptyMessage);
    return;
  }

  const existingCards = new Map(
    Array.from(grid.querySelectorAll('.btn-add-cart[data-id]'))
      .map(button => [button.dataset.id, button.closest('.product-card')])
  );
  const cards = products.map(product => {
    const existingCard = existingCards.get(product.id);
    if (existingCard) {
      existingCard.querySelector('.product-title').textContent = product.nombre;
      existingCard.querySelector('.product-shade').textContent = product.descripcion;
      existingCard.querySelector('.product-price').textContent = formatPrice(product.precio);
      const addButton = existingCard.querySelector('.btn-add-cart');
      addButton.dataset.name = product.nombre;
      addButton.dataset.price = String(product.precio);
      return existingCard;
    }

    const card = document.createElement('article');
    card.className = 'product-card';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-image-container';
    const image = document.createElement('img');
    image.src = '../img/logo.png';
    image.alt = product.nombre;
    image.loading = 'lazy';
    image.className = 'product-img';
    imageContainer.appendChild(image);

    const info = document.createElement('div');
    info.className = 'product-info';
    const title = document.createElement('h3');
    title.className = 'product-title';
    title.textContent = product.nombre;
    const description = document.createElement('p');
    description.className = 'product-shade';
    description.textContent = product.descripcion;
    const price = document.createElement('p');
    price.className = 'product-price';
    price.textContent = formatPrice(product.precio);
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn-add-cart';
    addButton.dataset.id = product.id;
    addButton.dataset.name = product.nombre;
    addButton.dataset.price = String(product.precio);
    addButton.textContent = 'Añadir al Carrito';

    info.append(title, description, price, addButton);
    card.append(imageContainer, info);
    return card;
  });
  grid.replaceChildren(...cards);
}

/* ==========================================================================
   7. UTILIDADES COMPARTIDAS
   ========================================================================== */
function formatPrice(num) {
  const value = typeof num === 'number' && !isNaN(num) ? num : 0;
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
  return formatted;
}