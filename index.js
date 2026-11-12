'use strict';

require('dotenv').config({ quiet: true });

const express = require('express');
const {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  scryptSync,
  timingSafeEqual
} = require('node:crypto');
const { promisify } = require('node:util');
const { connectDatabase } = require('./src/database.js');

const CATEGORIAS = ['Maquillaje', 'Cuidado Facial', 'Accesorios', 'Novedades', 'Ofertas'];
const SUBCATEGORIAS_MAQUILLAJE = ['Labios', 'Ojos', 'Rostro'];
const ESTADOS_CONTACTO = ['nuevo', 'leido', 'cerrado'];
const DURACION_SESION = 8 * 60 * 60 * 1000;
const DURACION_RECORDAR = 30 * 24 * 60 * 60 * 1000;
const MAX_LONGITUD_PASSWORD = 128;
const scryptAsync = promisify(scrypt);
const DUMMY_PASSWORD_SALT = 'krisabell-login-timing-salt';
const DUMMY_PASSWORD_HASH = scryptSync('dummy-password-never-used', DUMMY_PASSWORD_SALT, 64).toString('hex');

function createApp(options = {}) {
  if (!options.db) {
    throw new Error('createApp requiere una conexión de base de datos.');
  }

  const db = options.db;
  const adminEmail = options.adminEmail || process.env.ADMIN_EMAIL || '';
  const adminPassword = options.adminPassword || process.env.ADMIN_PASSWORD || '';
  const adminSalt = `KRISABELL_ADMIN:${adminEmail.trim().toLowerCase()}`;
  const adminIsConfigured = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) &&
    adminPassword.length >= 12 &&
    adminPassword.length <= MAX_LONGITUD_PASSWORD;
  const adminPasswordHash = adminIsConfigured
    ? scryptSync(adminPassword, adminSalt, 64)
    : null;
  const configuredOrigins = options.allowedOrigins || (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...configuredOrigins
  ]);
  const loginFailures = new Map();
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = req.get('Origin');
    res.vary('Origin');

    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'Origen no autorizado.' });
    }

    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/products', async (req, res) => {
    res.set('Cache-Control', 'no-store').json(await db.listProducts());
  });

  app.post('/api/contact', async (req, res) => {
    const contact = validateContact(req.body);
    if (!contact) {
      return res.status(400).json({ error: 'Completa correctamente todos los campos.' });
    }

    const id = randomUUID();
    await db.createContact({
      id,
      ...contact,
      estado: 'nuevo',
      created_at: new Date().toISOString()
    });

    res.status(201).json({
      id,
      message: 'Gracias. Recibimos tu mensaje y te responderemos pronto.'
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    const customer = validateCustomer(req.body);
    if (!customer) {
      return res.status(400).json({
        error: 'Ingresa un nombre, correo válido y una contraseña de entre 12 y 128 caracteres.'
      });
    }

    const user = {
      id: randomUUID(),
      name: customer.name,
      email: customer.email,
      passwordHash: await hashPassword(customer.password),
      created_at: new Date().toISOString()
    };

    try {
      await db.createCustomer(user);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
      }
      throw error;
    }

    const remember = req.body.remember === true;
    await establishSession(db, res, {
      kind: 'customer',
      customerId: user.id,
      name: user.name,
      email: user.email,
      duration: remember ? DURACION_RECORDAR : DURACION_SESION,
      isProduction
    });
    res.status(201).json({
      authenticated: true,
      user: { name: user.name, email: user.email }
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const key = `customer:${req.ip}`;
    if (isLoginBlocked(loginFailures, key)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' });
    }

    const email = normalizeEmail(req.body && req.body.email);
    const password = req.body && req.body.password;
    const validInput = isValidEmail(email) &&
      typeof password === 'string' &&
      password.length > 0 &&
      password.length <= MAX_LONGITUD_PASSWORD;
    const customer = validInput ? await db.findCustomerByEmail(email) : null;
    const passwordMatches = await verifyPassword(
      typeof password === 'string' && password.length <= MAX_LONGITUD_PASSWORD ? password : '',
      customer ? customer.passwordHash : DUMMY_PASSWORD_HASH
    );

    if (!customer || !passwordMatches) {
      recordLoginFailure(loginFailures, key);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    loginFailures.delete(key);
    const remember = req.body.remember === true;
    await establishSession(db, res, {
      kind: 'customer',
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      duration: remember ? DURACION_RECORDAR : DURACION_SESION,
      isProduction
    });
    res.json({
      authenticated: true,
      user: { name: customer.name, email: customer.email }
    });
  });

  app.get('/api/auth/session', requireSession(db, 'customer', isProduction), (req, res) => {
    res.json({
      authenticated: true,
      user: { name: req.authSession.name, email: req.authSession.email }
    });
  });

  app.post('/api/auth/logout', requireSession(db, 'customer', isProduction), async (req, res) => {
    await db.deleteSession(req.authTokenHash, 'customer');
    res.clearCookie('kb_customer_session', cookieOptions(isProduction, '/api/auth'));
    res.sendStatus(204);
  });

  app.post('/api/admin/login', async (req, res) => {
    if (!adminPasswordHash) {
      return res.status(503).json({
        error: 'Configura ADMIN_EMAIL válido y ADMIN_PASSWORD de entre 12 y 128 caracteres en el servidor.'
      });
    }

    const key = `admin:${req.ip}`;
    if (isLoginBlocked(loginFailures, key)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const suppliedHash = scryptSync(password.slice(0, MAX_LONGITUD_PASSWORD), adminSalt, 64);
    const emailMatches = email.toLowerCase() === adminEmail.trim().toLowerCase();
    const passwordMatches = timingSafeEqual(suppliedHash, adminPasswordHash);

    if (!emailMatches || !passwordMatches || password.length > MAX_LONGITUD_PASSWORD) {
      recordLoginFailure(loginFailures, key);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    loginFailures.delete(key);
    await establishSession(db, res, {
      kind: 'admin',
      email: adminEmail.trim(),
      duration: DURACION_SESION,
      isProduction
    });
    res.json({ authenticated: true });
  });

  app.post('/api/admin/logout', requireSession(db, 'admin', isProduction), async (req, res) => {
    await db.deleteSession(req.authTokenHash, 'admin');
    res.clearCookie('kb_admin_session', cookieOptions(isProduction, '/api/admin'));
    res.sendStatus(204);
  });

  app.get('/api/admin/session', requireSession(db, 'admin', isProduction), (req, res) => {
    res.json({ authenticated: true, email: req.authSession.email });
  });

  app.get('/api/admin/contacts', requireSession(db, 'admin', isProduction), async (req, res) => {
    res.json(await db.listContacts());
  });

  app.patch('/api/admin/contacts/:id', requireSession(db, 'admin', isProduction), async (req, res) => {
    const id = cleanText(req.params.id, 100);
    const estado = req.body && req.body.estado;
    if (!id || !ESTADOS_CONTACTO.includes(estado)) {
      return res.status(400).json({ error: 'El estado o identificador no es válido.' });
    }

    if (!await db.updateContact(id, estado)) {
      return res.status(404).json({ error: 'No se encontró el mensaje.' });
    }
    res.json({ updated: true });
  });

  app.get('/api/admin/products', requireSession(db, 'admin', isProduction), async (req, res) => {
    res.json(await db.listAdminProducts());
  });

  app.post('/api/admin/products', requireSession(db, 'admin', isProduction), async (req, res) => {
    const product = validateProduct(req.body);
    if (!product) {
      return res.status(400).json({ error: 'Revisa el nombre, categoría, subcategoría, precio y descripción.' });
    }

    const id = `prod-${randomUUID()}`;
    const url = productUrl(product.categoria, product.subcategoria);
    const now = new Date().toISOString();
    const createdProduct = { ...product, id, url, active: true, created_at: now, updated_at: now };
    await db.createProduct(createdProduct);
    res.status(201).json(createdProduct);
  });

  app.put('/api/admin/products/:id', requireSession(db, 'admin', isProduction), async (req, res) => {
    const product = validateProduct(req.body);
    if (!product) {
      return res.status(400).json({ error: 'Revisa el nombre, categoría, subcategoría, precio y descripción.' });
    }

    const url = productUrl(product.categoria, product.subcategoria);
    const updated = await db.updateProduct(req.params.id, {
      ...product,
      url,
      updated_at: new Date().toISOString()
    });
    if (!updated) {
      return res.status(404).json({ error: 'No se encontró el producto.' });
    }
    res.json({ ...product, id: req.params.id, url });
  });

  app.patch('/api/admin/products/:id', requireSession(db, 'admin', isProduction), async (req, res) => {
    const active = req.body && req.body.active;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'El estado del producto no es válido.' });
    }

    const updated = await db.updateProductActive(req.params.id, active, new Date().toISOString());
    if (!updated) {
      return res.status(404).json({ error: 'No se encontró el producto.' });
    }
    res.json({ updated: true, active });
  });

  app.use((error, req, res, next) => {
    console.error('Error en la API:', error);
    if (res.headersSent) {
      return next(error);
    }

    const status = Number.isInteger(error.status) ? error.status : 500;
    const message = status === 413
      ? 'La solicitud es demasiado grande.'
      : status === 400
        ? 'La solicitud no es válida.'
        : 'Ocurrió un error interno.';
    res.status(status).json({ error: message });
  });

  return app;
}

async function establishSession(db, res, session) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + session.duration);
  await db.createSession({
    tokenHash: hashToken(token),
    kind: session.kind,
    email: session.email,
    ...(session.customerId ? { customerId: session.customerId, name: session.name } : {}),
    expiresAt
  });
  const cookieName = session.kind === 'admin' ? 'kb_admin_session' : 'kb_customer_session';
  const cookiePath = session.kind === 'admin' ? '/api/admin' : '/api/auth';
  res.cookie(cookieName, token, {
    ...cookieOptions(session.isProduction, cookiePath),
    maxAge: session.duration
  });
}

function cookieOptions(isProduction, path) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path
  };
}

function requireSession(db, kind, isProduction) {
  const cookieName = kind === 'admin' ? 'kb_admin_session' : 'kb_customer_session';
  const cookiePath = kind === 'admin' ? '/api/admin' : '/api/auth';
  const unauthorizedMessage = kind === 'admin'
    ? 'Inicia sesión como administrador.'
    : 'Inicia sesión para continuar.';

  return async (req, res, next) => {
    const token = getCookie(req, cookieName);
    const tokenHash = token ? hashToken(token) : '';
    const session = tokenHash ? await db.findSession(tokenHash, kind) : null;
    const expiresAt = session ? new Date(session.expiresAt).getTime() : 0;
    if (!session || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      if (session) {
        await db.deleteSession(tokenHash, kind);
      }
      if (token) {
        res.clearCookie(cookieName, cookieOptions(isProduction, cookiePath));
      }
      return res.status(401).json({ error: unauthorizedMessage });
    }

    req.authSession = session;
    req.authTokenHash = tokenHash;
    next();
  };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function getCookie(req, name) {
  const cookies = (req.get('Cookie') || '').split(';');
  const cookie = cookies.find(value => value.trim().startsWith(`${name}=`));
  return cookie ? cookie.trim().slice(name.length + 1) : '';
}

function isLoginBlocked(failures, key) {
  const failure = failures.get(key);
  if (!failure || failure.resetAt <= Date.now()) {
    failures.delete(key);
    return false;
  }
  return failure.count >= 10;
}

function recordLoginFailure(failures, key) {
  const now = Date.now();
  const current = failures.get(key);
  const failure = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + 15 * 60 * 1000 };
  failure.count += 1;
  failures.set(key, failure);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateCustomer(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const name = cleanText(input.name, 100);
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (name.length < 2 || !isValidEmail(email) ||
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > MAX_LONGITUD_PASSWORD) {
    return null;
  }
  return { name, email, password };
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, saltHex, hashHex] = typeof encodedHash === 'string' ? encodedHash.split('$') : [];
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(hashHex)) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

function validateContact(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const nombre = cleanText(input.nombre, 100);
  const email = normalizeEmail(input.email);
  const asunto = cleanText(input.asunto, 150);
  const mensaje = cleanText(input.mensaje, 3000);
  if (!nombre || !asunto || !mensaje || !isValidEmail(email)) {
    return null;
  }
  return { nombre, email, asunto, mensaje };
}

function validateProduct(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const nombre = cleanText(input.nombre, 100);
  const categoria = cleanText(input.categoria, 50);
  const subcategoria = cleanText(input.subcategoria, 50);
  const descripcion = cleanText(input.descripcion, 1000);
  const precio = Number(input.precio);

  if (!nombre || !CATEGORIAS.includes(categoria) || !descripcion ||
      !Number.isSafeInteger(precio) || precio < 1 || precio > 1000000000) {
    return null;
  }

  if (categoria === 'Maquillaje' && !SUBCATEGORIAS_MAQUILLAJE.includes(subcategoria)) {
    return null;
  }

  return { nombre, categoria, subcategoria: subcategoria || 'General', precio, descripcion };
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }
  const text = value.trim();
  return text && text.length <= maxLength ? text : '';
}

function productUrl(categoria, subcategoria) {
  const pages = {
    'Maquillaje': 'Maquillaje.html',
    'Cuidado Facial': 'Cuidadofacial.html',
    'Accesorios': 'Accesorios.html',
    'Novedades': 'Novedades.html',
    'Ofertas': 'Ofertas.html'
  };
  const page = pages[categoria];
  return categoria === 'Maquillaje' ? `${page}#${subcategoria}` : page;
}

async function start() {
  const db = await connectDatabase();
  const app = createApp({ db });
  const port = Number(process.env.PORT) || 3001;
  const server = app.listen(port, () => {
    console.log(`API KRISABELL escuchando en el puerto ${port}.`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ADMIN_EMAIL || '') ||
        (process.env.ADMIN_PASSWORD || '').length < 12 ||
        (process.env.ADMIN_PASSWORD || '').length > MAX_LONGITUD_PASSWORD) {
      console.warn('Acceso admin deshabilitado: configura ADMIN_EMAIL válido y ADMIN_PASSWORD de entre 12 y 128 caracteres.');
    }
  });

  const close = () => {
    server.close(async error => {
      try {
        await db.close();
      } catch (closeError) {
        console.error('Error al cerrar MongoDB:', closeError);
        process.exitCode = 1;
      }
      if (error) {
        console.error('Error al cerrar la API:', error);
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

if (require.main === module) {
  start().catch(error => {
    console.error('No se pudo iniciar la API:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  createApp,
  isValidEmail,
  validateContact,
  validateCustomer,
  validateProduct
};
