/**
 * KRISABELL - Funcionalidades principales
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar componentes
  initMobileMenu();
  initCartCounter();
  initAuthTabs();
  renderCartPage();
  initContactForm();
  initSearch();
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

  tabLogin.addEventListener('click', () => {
    activateTab(tabLogin, tabRegister, formLogin, formRegister);
  });

  tabRegister.addEventListener('click', () => {
    activateTab(tabRegister, tabLogin, formRegister, formLogin);
  });
}

/* ==========================================================================
   4. FORMULARIO DE CONTACTO
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('form-contacto');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('contacto-confirmacion').style.display = 'block';
    form.reset();
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
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${formatPrice(item.price)}</td>
        <td>
          <input type="number" class="cart-qty-input" min="1" value="${item.quantity}" data-id="${item.id}">
        </td>
        <td>${formatPrice(itemSubtotal)}</td>
        <td>
          <button type="button" class="btn-remove-item" data-id="${item.id}">Eliminar</button>
        </td>
      `;
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

    const matches = searchIndex.filter(product =>
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
      li.innerHTML = `
        <a href="${basePath}${product.url}">
          <span class="search-result-name">${product.name}</span>
          <span class="search-result-category">${product.category}</span>
        </a>
      `;
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