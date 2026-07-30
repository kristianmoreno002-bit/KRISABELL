/**
 * KRISABELL - Funcionalidades principales
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar componentes
  initMobileMenu();
  initCartCounter();
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
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-add-cart')) {
    const btn = e.target;
    const product = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: parseFloat(btn.dataset.price),
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