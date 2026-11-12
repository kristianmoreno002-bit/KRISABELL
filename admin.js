'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const api = window.KRISABELL_API;
  const loginSection = document.getElementById('admin-login-section');
  const dashboard = document.getElementById('admin-dashboard');
  const status = document.getElementById('admin-status');
  const loginForm = document.getElementById('admin-login-form');
  const productForm = document.getElementById('admin-product-form');
  const productList = document.getElementById('admin-product-list');
  const contactList = document.getElementById('admin-contact-list');
  const productId = document.getElementById('product-id');
  const productSave = document.getElementById('product-save');
  const productCancel = document.getElementById('product-cancel');
  const logoutButton = document.getElementById('admin-logout');

  function showStatus(message, state = 'info') {
    status.textContent = message;
    status.dataset.state = state;
  }

  function setLoggedIn(email) {
    loginSection.hidden = true;
    dashboard.hidden = false;
    document.getElementById('admin-identity').textContent = email;
  }

  function setLoggedOut() {
    dashboard.hidden = true;
    loginSection.hidden = false;
  }

  async function loadDashboard() {
    const [contacts, products] = await Promise.all([
      api.request('/api/admin/contacts'),
      api.request('/api/admin/products')
    ]);
    renderContacts(contacts);
    renderProducts(products);
  }

  async function checkSession() {
    if (!api.configured) {
      showStatus('Configura la URL de la API en data/api-config.js para habilitar el panel.', 'error');
      return;
    }

    try {
      const session = await api.request('/api/admin/session');
      setLoggedIn(session.email);
      await loadDashboard();
    } catch (error) {
      if (error.message !== 'Inicia sesión como administrador.') {
        showStatus(error.message, 'error');
      }
    }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    showStatus('Verificando credenciales...');

    try {
      const credentials = Object.fromEntries(new FormData(loginForm).entries());
      await api.request('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      setLoggedIn(credentials.email);
      await loadDashboard();
      showStatus('Sesión iniciada.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });

  logoutButton.addEventListener('click', async () => {
    try {
      await api.request('/api/admin/logout', { method: 'POST' });
      setLoggedOut();
      showStatus('Sesión cerrada.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    }
  });

  productForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = productForm.querySelector('[type="submit"]');
    submit.disabled = true;
    const fields = Object.fromEntries(new FormData(productForm).entries());
    const id = fields.id;
    delete fields.id;
    fields.precio = Number(fields.precio);

    try {
      await api.request(id ? `/api/admin/products/${encodeURIComponent(id)}` : '/api/admin/products', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(fields)
      });
      resetProductForm();
      await loadDashboard();
      showStatus('Producto guardado.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });

  productCancel.addEventListener('click', resetProductForm);

  function resetProductForm() {
    productForm.reset();
    productId.value = '';
    productSave.textContent = 'Guardar producto';
    productCancel.hidden = true;
  }

  function renderProducts(products) {
    productList.replaceChildren();
    products.forEach(product => {
      const row = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = product.nombre;
      const category = document.createElement('td');
      category.textContent = `${product.categoria} · ${product.subcategoria}`;
      const price = document.createElement('td');
      price.textContent = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(product.precio);
      const state = document.createElement('td');
      state.textContent = product.active ? 'Activo' : 'Inactivo';
      const actions = document.createElement('td');
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'admin-action-button';
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => editProduct(product));
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'admin-action-button';
      toggle.textContent = product.active ? 'Desactivar' : 'Activar';
      toggle.addEventListener('click', () => toggleProduct(product));
      actions.append(edit, toggle);
      row.append(name, category, price, state, actions);
      productList.appendChild(row);
    });
  }

  function editProduct(product) {
    productId.value = product.id;
    productForm.elements.nombre.value = product.nombre;
    productForm.elements.categoria.value = product.categoria;
    productForm.elements.subcategoria.value = product.subcategoria;
    productForm.elements.precio.value = product.precio;
    productForm.elements.descripcion.value = product.descripcion;
    productSave.textContent = 'Actualizar producto';
    productCancel.hidden = false;
    productForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function toggleProduct(product) {
    try {
      await api.request(`/api/admin/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !product.active })
      });
      await loadDashboard();
      showStatus('Estado del producto actualizado.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  function renderContacts(contacts) {
    contactList.replaceChildren();
    if (contacts.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = 'Todavía no hay mensajes de contacto.';
      contactList.appendChild(empty);
      return;
    }

    contacts.forEach(contact => {
      const card = document.createElement('article');
      card.className = 'admin-contact-card';
      const details = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = contact.asunto;
      const sender = document.createElement('p');
      sender.textContent = `${contact.nombre} · ${contact.email}`;
      const message = document.createElement('p');
      message.className = 'admin-contact-message';
      message.textContent = contact.mensaje;
      const date = document.createElement('small');
      date.textContent = new Date(contact.created_at).toLocaleString('es-CO');
      details.append(heading, sender, message, date);

      const select = document.createElement('select');
      select.setAttribute('aria-label', `Estado del mensaje ${contact.id}`);
      [['nuevo', 'Nuevo'], ['leido', 'Leído'], ['cerrado', 'Cerrado']].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = contact.estado === value;
        select.appendChild(option);
      });

      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'admin-action-button';
      save.textContent = 'Guardar estado';
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          await api.request(`/api/admin/contacts/${contact.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ estado: select.value })
          });
          showStatus('Estado del mensaje actualizado.', 'success');
        } catch (error) {
          showStatus(error.message, 'error');
        } finally {
          save.disabled = false;
        }
      });
      card.append(details, select, save);
      contactList.appendChild(card);
    });
  }

  checkSession();
});
