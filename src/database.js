'use strict';

/**
 * Capa de datos de KRISABELL con Mongoose.
 *
 * Decisión técnica: index.js solo conoce la interfaz que devuelve
 * connectDatabase() (listProducts, createContact, ...). Así el servidor y las
 * pruebas no dependen de Mongoose y la base de datos se puede cambiar sin
 * tocar las rutas de la API.
 */

const mongoose = require('mongoose');
const storeData = require('../data/productos.js');

// Opciones comunes: sin campo __v y sin _id propio de Mongo en las respuestas.
const schemaOptions = { versionKey: false };

// Producto del catálogo. "id" es el identificador público (ej. "lab-01").
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  nombre: { type: String, required: true, trim: true, maxlength: 100 },
  categoria: { type: String, required: true, trim: true },
  subcategoria: { type: String, default: 'General', trim: true },
  precio: { type: Number, required: true, min: 1 },
  descripcion: { type: String, required: true, trim: true, maxlength: 1000 },
  url: { type: String, default: '' },
  active: { type: Boolean, default: true },
  created_at: { type: String },
  updated_at: { type: String }
}, schemaOptions);

// Mensaje enviado desde el formulario de contacto.
const contactSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  asunto: { type: String, required: true },
  mensaje: { type: String, required: true },
  estado: { type: String, enum: ['nuevo', 'leido', 'cerrado'], default: 'nuevo' },
  created_at: { type: String, index: -1 }
}, schemaOptions);

// Cliente registrado. La contraseña se guarda como hash scrypt, nunca en claro.
const customerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  created_at: { type: String }
}, schemaOptions);

// Sesión: se guarda solo el hash del token. Mongo borra la sesión sola
// cuando llega expiresAt (índice TTL con expireAfterSeconds: 0).
const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  kind: { type: String, enum: ['customer', 'admin'], required: true },
  email: { type: String },
  customerId: { type: String },
  name: { type: String },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
}, schemaOptions);

// Pedido: guarda copia del nombre y precio al momento de comprar, para que
// cambios futuros en el catálogo no alteren pedidos antiguos.
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String },
  customerEmail: { type: String, required: true },
  items: [{
    _id: false,
    productId: { type: String, required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true, min: 1 },
    cantidad: { type: Number, required: true, min: 1, max: 99 }
  }],
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  estado: { type: String, enum: ['pendiente_pago', 'pagado', 'enviado', 'cancelado'], default: 'pendiente_pago' },
  created_at: { type: String, index: -1 }
}, schemaOptions);

// Campos que se devuelven al público (sin "active" ni fechas internas).
const PUBLIC_PRODUCT_FIELDS = '-_id id nombre categoria subcategoria precio descripcion url';
const ADMIN_PRODUCT_FIELDS = `${PUBLIC_PRODUCT_FIELDS} active`;
const CONTACT_FIELDS = '-_id id nombre email asunto mensaje estado created_at';

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('Configura MONGODB_URI para conectar la base de datos.');
  }

  // Conexión propia (no global) para poder abrir y cerrar en pruebas.
  const connection = await mongoose.createConnection(uri).asPromise();

  const Product = connection.model('Product', productSchema, 'products');
  const Contact = connection.model('Contact', contactSchema, 'contacts');
  const Customer = connection.model('Customer', customerSchema, 'customers');
  const Session = connection.model('Session', sessionSchema, 'sessions');
  const Order = connection.model('Order', orderSchema, 'orders');

  try {
    // Crea los índices declarados en los esquemas (únicos y TTL).
    await Promise.all([Product, Contact, Customer, Session, Order].map(model => model.init()));

    // Primera ejecución: carga el catálogo inicial de data/productos.js.
    if (await Product.countDocuments() === 0) {
      const now = new Date().toISOString();
      await Product.insertMany(storeData.PRODUCTOS.map(product => ({
        ...product,
        active: true,
        created_at: now,
        updated_at: now
      })));
    }
  } catch (error) {
    await connection.close();
    throw error;
  }

  return {
    async close() {
      await connection.close();
    },
    async listProducts() {
      return Product.find({ active: true }).select(PUBLIC_PRODUCT_FIELDS).sort({ id: 1 }).lean();
    },
    async listAdminProducts() {
      return Product.find({}).select(ADMIN_PRODUCT_FIELDS).sort({ id: 1 }).lean();
    },
    async createProduct(product) {
      await Product.create(product);
    },
    async updateProduct(id, product) {
      const result = await Product.updateOne({ id }, { $set: product }, { runValidators: true });
      return result.matchedCount > 0;
    },
    async updateProductActive(id, active, updatedAt) {
      const result = await Product.updateOne({ id }, { $set: { active, updated_at: updatedAt } });
      return result.matchedCount > 0;
    },
    async findProductsByIds(ids) {
      // Solo productos activos: un producto oculto no se puede comprar.
      return Product.find({ id: { $in: ids }, active: true }).select(PUBLIC_PRODUCT_FIELDS).lean();
    },
    async createOrder(order) {
      await Order.create(order);
    },
    async listOrders() {
      return Order.find({}).select('-_id').sort({ created_at: -1 }).lean();
    },
    async createContact(contact) {
      await Contact.create(contact);
    },
    async listContacts() {
      return Contact.find({}).select(CONTACT_FIELDS).sort({ created_at: -1 }).lean();
    },
    async updateContact(id, estado) {
      const result = await Contact.updateOne({ id }, { $set: { estado } }, { runValidators: true });
      return result.matchedCount > 0;
    },
    async findCustomerByEmail(email) {
      return Customer.findOne({ email }).select('-_id').lean();
    },
    async createCustomer(customer) {
      // Un correo repetido lanza un error con code 11000 (lo maneja index.js).
      await Customer.create(customer);
    },
    async createSession(session) {
      await Session.create(session);
    },
    async findSession(tokenHash, kind) {
      return Session.findOne({ tokenHash, kind }).select('-_id').lean();
    },
    async deleteSession(tokenHash, kind) {
      await Session.deleteOne({ tokenHash, kind });
    }
  };
}

module.exports = { connectDatabase };
