'use strict';

const { afterEach, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const storeData = require('../data/productos.js');
const { createApp } = require('../index.js');

let db;
let server;
let baseUrl;

function createMemoryDatabase() {
  const products = new Map(storeData.PRODUCTOS.map(product => [product.id, {
    ...product,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }]));
  const contacts = new Map();
  const customers = new Map();
  const sessions = new Map();

  return {
    async close() {},
    async listProducts() {
      return [...products.values()]
        .filter(product => product.active)
        .map(({ id, nombre, categoria, subcategoria, precio, descripcion, url }) => ({
          id, nombre, categoria, subcategoria, precio, descripcion, url
        }));
    },
    async listAdminProducts() {
      return [...products.values()].map(product => ({ ...product }));
    },
    async createProduct(product) {
      products.set(product.id, { ...product });
    },
    async updateProduct(id, changes) {
      const product = products.get(id);
      if (!product) return false;
      products.set(id, { ...product, ...changes });
      return true;
    },
    async updateProductActive(id, active, updated_at) {
      const product = products.get(id);
      if (!product) return false;
      products.set(id, { ...product, active, updated_at });
      return true;
    },
    async createContact(contact) {
      contacts.set(contact.id, { ...contact });
    },
    async listContacts() {
      return [...contacts.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async updateContact(id, estado) {
      const contact = contacts.get(id);
      if (!contact) return false;
      contacts.set(id, { ...contact, estado });
      return true;
    },
    async findCustomerByEmail(email) {
      return [...customers.values()].find(customer => customer.email === email) || null;
    },
    async createCustomer(customer) {
      if ([...customers.values()].some(entry => entry.email === customer.email)) {
        const error = new Error('Duplicate email');
        error.code = 11000;
        throw error;
      }
      customers.set(customer.id, { ...customer });
    },
    async createSession(session) {
      sessions.set(session.tokenHash, { ...session });
    },
    async findSession(tokenHash, kind) {
      const session = sessions.get(tokenHash);
      return session && session.kind === kind ? { ...session } : null;
    },
    async deleteSession(tokenHash, kind) {
      const session = sessions.get(tokenHash);
      if (session && session.kind === kind) sessions.delete(tokenHash);
    }
  };
}

beforeEach(async () => {
  db = createMemoryDatabase();
  const app = createApp({
    db,
    adminEmail: 'admin@example.com',
    adminPassword: 'a-secure-test-password',
    allowedOrigins: ['http://localhost:4173']
  });
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
  await db.close();
});

test('exposes seeded products and persists valid contact requests', async () => {
  const productsResponse = await fetch(`${baseUrl}/api/products`);
  assert.equal(productsResponse.status, 200);
  const products = await productsResponse.json();
  assert.ok(products.length > 0);
  assert.ok(products.every(product => product.active === undefined));

  const contactResponse = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Ana Pérez',
      email: 'ana@example.com',
      asunto: 'Consulta',
      mensaje: '¿Cuánto tarda el envío?'
    })
  });
  assert.equal(contactResponse.status, 201);
  assert.ok((await contactResponse.json()).id);
});

test('registers customers, authenticates sessions, and prevents duplicate accounts', async () => {
  const invalidRegistration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'short'
    })
  });
  assert.equal(invalidRegistration.status, 400);

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ana Pérez',
      email: 'ANA@example.com',
      password: 'secure-customer-password',
      remember: true
    })
  });
  assert.equal(registration.status, 201);
  const registrationBody = await registration.json();
  assert.deepEqual(registrationBody.user, { name: 'Ana Pérez', email: 'ana@example.com' });
  assert.equal(registration.headers.get('set-cookie').includes('HttpOnly'), true);
  assert.equal(registration.headers.get('set-cookie').includes('Max-Age=2592000'), true);
  assert.equal(registrationBody.user.password, undefined);
  const cookie = registration.headers.get('set-cookie').split(';')[0];

  const session = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
  assert.equal(session.status, 200);
  assert.deepEqual((await session.json()).user, { name: 'Ana Pérez', email: 'ana@example.com' });

  const duplicate = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Otra Ana',
      email: 'ana@example.com',
      password: 'another-secure-password'
    })
  });
  assert.equal(duplicate.status, 409);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie }
  });
  assert.equal(logout.status, 204);
  const expiredSession = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
  assert.equal(expiredSession.status, 401);

  const wrongLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ana@example.com', password: 'wrong-password' })
  });
  assert.equal(wrongLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ana@example.com', password: 'secure-customer-password' })
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).authenticated, true);
});

test('protects the admin panel and allows authenticated catalog management', async () => {
  const contactResponse = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Ana Pérez',
      email: 'ana@example.com',
      asunto: 'Consulta',
      mensaje: 'Quisiera conocer el estado de mi pedido.'
    })
  });
  assert.equal(contactResponse.status, 201);

  const unauthorized = await fetch(`${baseUrl}/api/admin/products`);
  assert.equal(unauthorized.status, 401);

  const wrongLogin = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'wrong-password' })
  });
  assert.equal(wrongLogin.status, 401);

  const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'a-secure-test-password' })
  });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get('set-cookie').split(';')[0];

  const contacts = await fetch(`${baseUrl}/api/admin/contacts`, { headers: { Cookie: cookie } });
  assert.equal(contacts.status, 200);
  assert.equal((await contacts.json())[0].email, 'ana@example.com');

  const createResponse = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      nombre: 'Crema de prueba',
      categoria: 'Cuidado Facial',
      subcategoria: 'Hidratación',
      precio: 25000,
      descripcion: 'Crema hidratante para uso diario.'
    })
  });
  assert.equal(createResponse.status, 201);
  const product = await createResponse.json();
  assert.match(product.url, /Cuidadofacial\.html$/);

  const deactivateResponse = await fetch(`${baseUrl}/api/admin/products/${product.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ active: false })
  });
  assert.equal(deactivateResponse.status, 200);

  const publicProducts = await (await fetch(`${baseUrl}/api/products`)).json();
  assert.ok(!publicProducts.some(item => item.id === product.id));
});

test('rejects invalid contact data and requests from unconfigured origins', async () => {
  const allowedOrigin = await fetch(`${baseUrl}/api/products`, {
    headers: { Origin: 'http://localhost:4173' }
  });
  assert.equal(allowedOrigin.status, 200);
  assert.equal(allowedOrigin.headers.get('access-control-allow-origin'), 'http://localhost:4173');

  const invalidContact = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Ana', email: 'not-an-email', asunto: '', mensaje: '' })
  });
  assert.equal(invalidContact.status, 400);

  const forbiddenOrigin = await fetch(`${baseUrl}/api/products`, {
    headers: { Origin: 'https://otro-sitio.example' }
  });
  assert.equal(forbiddenOrigin.status, 403);
});
