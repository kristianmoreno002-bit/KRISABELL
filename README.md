# KRISABELL

Tienda web de cosméticos con catálogo, carrito, chatbot y una API Express independiente. El sitio está hecho con HTML, CSS y JavaScript; la API usa Mongoose (MongoDB) para el catálogo, los mensajes, las cuentas de clientes y las sesiones.

## Desarrollo local

Requisitos: Node.js 22.13 o superior y MongoDB local o Atlas.

1. Copia `.env.example` como `.env`.
2. Configura `MONGODB_URI`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`. Usa una contraseña administrativa de 12 a 128 caracteres.
3. Inicia MongoDB local o crea una base de datos en MongoDB Atlas.
4. Instala dependencias con `npm install` e inicia la API con `npm start`. Al conectarse, la API crea los índices y carga el catálogo inicial si la colección de productos está vacía.
5. Abre el sitio con un servidor estático local, por ejemplo VS Code Live Server en el puerto 5500. La API local se detecta automáticamente en `http://localhost:3001`.
6. El registro y el inicio de sesión de clientes están en `paginas/Login.html`. El acceso administrativo está en `paginas/Admin.html`.

Las cuentas de clientes requieren un correo válido y una contraseña de 12 a 128 caracteres. Las contraseñas se guardan como hashes scrypt; el servidor entrega cookies HttpOnly y guarda en MongoDB solo el hash de cada token de sesión.

La API ofrece `GET /api/products`, `POST /api/contact`, las rutas de autenticación bajo `/api/auth` y las rutas de administración bajo `/api/admin`.

Los pedidos se registran con `POST /api/auth/orders` (requiere sesión de cliente). El servidor calcula el total con los precios de la base de datos y guarda el pedido como `pendiente_pago`: todavía no hay pasarela de pago. El administrador puede consultarlos en `GET /api/admin/orders`. El sitio muestra mensajes en pantalla al iniciar sesión, cerrar sesión y hacer un pedido.

## Aplicación React (`frontend/`)

Además del sitio estático hay una app en React + Vite que consume la misma API (catálogo, contacto, cuenta de cliente y panel de administración).

```
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:3001
npm install
npm run dev              # http://localhost:5173
```

Flujo de datos: React -> `fetch` (con `credentials: 'include'`) -> API Express -> Mongoose -> MongoDB. React nunca se conecta directamente a la base de datos.

En producción, define la variable de repositorio `API_URL` (Settings -> Secrets and variables -> Actions -> Variables) con la URL HTTPS de la API; el workflow compila la app y la publica en `/app/` junto al sitio estático.

## Estructura

- `index.js`: servidor Express (rutas, sesiones, validaciones).
- `src/database.js`: modelos Mongoose y acceso a datos.
- `data/productos.js`: catálogo inicial compartido por el sitio y la API.
- `frontend/`: app React.
- `index.html`, `paginas/`, `script.js`, `admin.js`, `chatbot/`, `style/`: sitio estático.
- `test/`: pruebas de la API (`npm test`).

## Publicación

El workflow de GitHub Actions publica el sitio estático en GitHub Pages. En el repositorio, selecciona **Settings → Pages → GitHub Actions** como origen.

GitHub Pages no ejecuta Node.js: despliega la API Express por separado en un servicio compatible con Node.js 22.13 o superior. Configura en el servicio:

- `MONGODB_URI` como secreto. Usa una base gestionada o accesible desde el proveedor de la API.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` como secretos.
- `FRONTEND_ORIGINS` con el origen exacto del sitio.
- `NODE_ENV=production`.

En MongoDB Atlas, crea un usuario de base de datos con permisos limitados a la base del proyecto y restringe los orígenes de red a los necesarios. No publiques la URI ni la guardes en el repositorio.

Después, configura `window.KRISABELL_API_URL` en `data/api-config.js` con la URL HTTPS de la API y publica de nuevo el sitio. El frontend debe estar permitido en `FRONTEND_ORIGINS`. Para que las cookies de sesión funcionen de forma fiable entre frontend y API, se recomienda usar dominios propios coordinados, como `tienda.ejemplo.com` y `api.ejemplo.com`.

La guía del proyecto también solicita un mínimo de 15 commits. Ese requisito corresponde al historial de trabajo del equipo; no se crean commits artificiales como parte de esta implementación.
