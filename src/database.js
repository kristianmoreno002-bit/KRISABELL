'use strict';

const { MongoClient } = require('mongodb');
const storeData = require('../data/productos.js');

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('Configura MONGODB_URI para conectar la base de datos.');
  }

  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db();
  const products = database.collection('products');
  const contacts = database.collection('contacts');
  const customers = database.collection('customers');
  const sessions = database.collection('sessions');

  try {
    await Promise.all([
      products.createIndex({ id: 1 }, { unique: true }),
      contacts.createIndex({ created_at: -1 }),
      customers.createIndex({ email: 1 }, { unique: true }),
      sessions.createIndex({ tokenHash: 1 }, { unique: true }),
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    ]);

    if (await products.countDocuments() === 0) {
      const now = new Date().toISOString();
      await products.insertMany(storeData.PRODUCTOS.map(product => ({
        ...product,
        active: true,
        created_at: now,
        updated_at: now
      })));
    }
  } catch (error) {
    await client.close();
    throw error;
  }

  return {
    async close() {
      await client.close();
    },
    async listProducts() {
      return products.find(
        { active: true },
        { projection: { _id: 0, id: 1, nombre: 1, categoria: 1, subcategoria: 1, precio: 1, descripcion: 1, url: 1 } }
      ).sort({ id: 1 }).toArray();
    },
    async listAdminProducts() {
      return products.find(
        {},
        { projection: { _id: 0, id: 1, nombre: 1, categoria: 1, subcategoria: 1, precio: 1, descripcion: 1, url: 1, active: 1 } }
      ).sort({ id: 1 }).toArray();
    },
    async createProduct(product) {
      await products.insertOne(product);
    },
    async updateProduct(id, product) {
      const result = await products.updateOne({ id }, { $set: product });
      return result.matchedCount > 0;
    },
    async updateProductActive(id, active, updatedAt) {
      const result = await products.updateOne({ id }, { $set: { active, updated_at: updatedAt } });
      return result.matchedCount > 0;
    },
    async createContact(contact) {
      await contacts.insertOne(contact);
    },
    async listContacts() {
      return contacts.find(
        {},
        { projection: { _id: 0, id: 1, nombre: 1, email: 1, asunto: 1, mensaje: 1, estado: 1, created_at: 1 } }
      ).sort({ created_at: -1 }).toArray();
    },
    async updateContact(id, estado) {
      const result = await contacts.updateOne({ id }, { $set: { estado } });
      return result.matchedCount > 0;
    },
    async findCustomerByEmail(email) {
      return customers.findOne({ email }, { projection: { _id: 0 } });
    },
    async createCustomer(customer) {
      await customers.insertOne(customer);
    },
    async createSession(session) {
      await sessions.insertOne(session);
    },
    async findSession(tokenHash, kind) {
      return sessions.findOne({ tokenHash, kind }, { projection: { _id: 0 } });
    },
    async deleteSession(tokenHash, kind) {
      await sessions.deleteOne({ tokenHash, kind });
    }
  };
}

module.exports = { connectDatabase };
