/**
 * KRISABELL · Asistente virtual "Bell"
 * ---------------------------------------------------------------
 * Chatbot por reglas (sin servidor, sin claves, sin dependencias).
 * Se incluye en cualquier página con UNA sola línea antes de </body>:
 *
 *   index.html          →  <script src="chatbot/chatbot.js"></script>
 *   paginas/*.html      →  <script src="../chatbot/chatbot.js"></script>
 *
 * Para cambiar lo que el bot responde, edita SOLO la sección
 * "BASE DE CONOCIMIENTO" (datos de la tienda e INTENCIONES).
 */
(function () {
  'use strict';

  /* ======================================================================
     0. RUTAS (funcionan desde index.html, desde /paginas/ e incluso file://)
     ====================================================================== */
  const scriptSrc = (document.currentScript && document.currentScript.src) || '';
  const RAIZ = new URL('../', scriptSrc || location.href);          // carpeta del proyecto
  const pagina = (archivo) => new URL('paginas/' + archivo, RAIZ).href;
  const inicio = () => new URL('index.html', RAIZ).href;

  // Carga la hoja de estilos del chatbot automáticamente
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('chatbot.css', scriptSrc || location.href).href;
  document.head.appendChild(css);

  /* ======================================================================
     1. BASE DE CONOCIMIENTO  (todo viene de las páginas del sitio)
     ====================================================================== */
  // Los datos salen de data/productos.js (misma fuente que el servidor y las páginas)
  const DATA = window.KRISABELL_DATA || null;
  const cop = (n) => DATA ? DATA.formatoCOP(n) : '$' + Math.round(n).toLocaleString('es-CO') + ' COP';
  const T = DATA ? DATA.TIENDA : { envioGratisDesde: 230000, envioDias: '3 y 7 días hábiles', diasDevolucion: 15, respuestaContacto: '24 a 48 horas hábiles' };
  const TIENDA = {
    nombre: 'KRISABELL',
    envioGratisDesde: cop(T.envioGratisDesde),
    envioDias: T.envioDias,
    diasDevolucion: T.diasDevolucion,
    respuestaContacto: T.respuestaContacto
  };

  const LINKS = {
    maquillaje:  { texto: 'Maquillaje',        url: () => pagina('Maquillaje.html') },
    labios:      { texto: 'Labios',            url: () => pagina('Maquillaje.html#Labios') },
    ojos:        { texto: 'Ojos',              url: () => pagina('Maquillaje.html#Ojos') },
    rostro:      { texto: 'Rostro',            url: () => pagina('Maquillaje.html#Rostro') },
    facial:      { texto: 'Cuidado Facial',    url: () => pagina('Cuidadofacial.html') },
    accesorios:  { texto: 'Accesorios',        url: () => pagina('Accesorios.html') },
    novedades:   { texto: 'Novedades',         url: () => pagina('Novedades.html') },
    ofertas:     { texto: 'Ofertas',           url: () => pagina('Ofertas.html') },
    nosotros:    { texto: 'Nosotros',          url: () => pagina('Nosotros.html') },
    contacto:    { texto: 'Contacto',          url: () => pagina('Contacto.html') },
    ayuda:       { texto: 'Centro de Ayuda',   url: () => pagina('Ayuda.html') },
    envios:      { texto: 'Ver envíos',        url: () => pagina('Ayuda.html#envios') },
    cambios:     { texto: 'Ver devoluciones',  url: () => pagina('Ayuda.html#cambios') },
    pagos:       { texto: 'Ver medios de pago',url: () => pagina('Ayuda.html#pagos') },
    privacidad:  { texto: 'Política de privacidad', url: () => pagina('Ayuda.html#privacidad') },
    terminos:    { texto: 'Términos y condiciones', url: () => pagina('Ayuda.html#terminos') },
    carrito:     { texto: 'Ir al carrito',     url: () => pagina('Carrito.html') },
    login:       { texto: 'Ingresar / Registrarme', url: () => pagina('Login.html') },
    inicio:      { texto: 'Ir al inicio',      url: inicio }
  };

  /**
   * Cada intención:
   *  - claves:  palabras/frases (sin tildes, en minúscula). Frases largas pesan más.
   *  - texto:   string o función que devuelve string
   *  - links:   claves de LINKS que se muestran como botones
   *  - chips:   sugerencias de siguiente pregunta
   */
  const INTENCIONES = [
    {
      id: 'saludo',
      claves: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'saludos', 'que tal'],
      texto: () => saludoSegunHora() + ' Soy Bell, la asistente de KRISABELL 💄 ¿En qué te puedo ayudar?',
      chips: ['Envíos', 'Devoluciones', 'Ofertas', 'Medios de pago']
    },
    {
      id: 'gracias',
      claves: ['gracias', 'muchas gracias', 'genial', 'perfecto', 'excelente', 'listo', 'vale'],
      texto: '¡Con gusto! Si necesitas algo más, aquí estaré ✨',
      chips: ['Ver ofertas', 'Contacto']
    },
    {
      id: 'despedida',
      claves: ['adios', 'chao', 'chau', 'hasta luego', 'bye', 'nos vemos'],
      texto: '¡Hasta pronto! Gracias por visitar KRISABELL. Resalta tu belleza 💛'
    },
    {
      id: 'quien',
      claves: ['quien eres', 'que eres', 'eres un bot', 'eres humana', 'eres persona', 'como te llamas', 'tu nombre'],
      texto: 'Soy Bell, la asistente virtual de KRISABELL. Respondo dudas sobre productos, envíos, pagos y devoluciones. ' +
             'Si necesitas atención de una persona, escríbenos desde Contacto.',
      links: ['contacto']
    },
    {
      id: 'envios',
      claves: ['envio', 'envios', 'enviar', 'entrega', 'entregan', 'domicilio', 'demora', 'tarda', 'cuanto tarda',
               'cuando llega', 'llegar', 'despacho', 'paqueteria', 'costo de envio', 'envio gratis', 'envio gratuito'],
      texto: () =>
        `Los envíos nacionales tardan entre ${TIENDA.envioDias}, según tu ubicación.\n\n` +
        `El envío es gratis en compras mayores a ${TIENDA.envioGratisDesde}. Por debajo de ese monto, el costo se calcula en el checkout.`,
      links: ['envios'],
      chips: ['Devoluciones', 'Medios de pago']
    },
    {
      id: 'devoluciones',
      claves: ['devolver', 'devolucion', 'devoluciones', 'cambio', 'cambios', 'cambiar', 'reembolso', 'garantia',
               'no me gusto', 'me llego mal', 'producto danado', 'retornar', 'reclamo'],
      texto: () =>
        `Tienes ${TIENDA.diasDevolucion} días naturales desde que recibes tu pedido para solicitar un cambio o devolución, ` +
        `siempre que el producto esté sin abrir.\n\n` +
        `Para iniciarla, escríbenos desde Contacto con tu número de pedido y el motivo.`,
      links: ['contacto', 'cambios'],
      chips: ['Envíos', 'Tiempo de respuesta']
    },
    {
      id: 'pagos',
      claves: ['pago', 'pagos', 'pagar', 'tarjeta', 'visa', 'mastercard', 'master card', 'american express', 'amex',
               'efectivo', 'credito', 'debito', 'metodo de pago', 'medios de pago', 'como pago', 'transferencia', 'paypal', 'nequi', 'pse'],
      texto: 'Aceptamos tarjetas de crédito y débito, y pagos en efectivo en tiendas afiliadas.\n\n' +
             'Tus datos de pago se procesan de forma segura.',
      links: ['pagos'],
      chips: ['Privacidad', 'Envíos']
    },
    {
      id: 'privacidad',
      claves: ['privacidad', 'datos personales', 'mis datos', 'proteccion de datos', 'seguridad', 'segura', 'seguro', 'compra segura', 'confiable', 'terceros'],
      texto: 'Tus datos personales y de pago se procesan de forma segura y nunca se comparten con terceros sin tu consentimiento.',
      links: ['privacidad', 'terminos']
    },
    {
      id: 'terminos',
      claves: ['terminos', 'condiciones', 'politicas', 'legal', 'inventario', 'disponibilidad'],
      texto: 'Al comprar en KRISABELL aceptas nuestras políticas de precios, disponibilidad de inventario y condiciones de envío vigentes al momento de la transacción.',
      links: ['terminos']
    },
    {
      id: 'contacto',
      claves: ['contacto', 'contactar', 'contactarlos', 'escribir', 'escribirles', 'hablar con', 'asesor', 'asesora', 'agente',
               'persona real', 'atencion al cliente', 'servicio al cliente', 'soporte', 'ayuda humana', 'queja', 'sugerencia', 'correo', 'email', 'telefono', 'whatsapp', 'llamar'],
      texto: `Puedes escribirnos desde la página de Contacto con tu nombre, correo, asunto y mensaje. Respondemos en un plazo de ${TIENDA.respuestaContacto}.`,
      links: ['contacto', 'ayuda']
    },
    {
      id: 'tiempo_respuesta',
      claves: ['tiempo de respuesta', 'cuanto demoran en responder', 'en cuanto responden', 'cuando responden'],
      texto: `Respondemos los mensajes de Contacto en un plazo de ${TIENDA.respuestaContacto}.`,
      links: ['contacto']
    },
    {
      id: 'ofertas',
      claves: ['oferta', 'ofertas', 'descuento', 'descuentos', 'promocion', 'promociones', 'rebaja', 'rebajas', 'barato', 'precio especial', 'cupon', 'outlet', 'liquidacion'],
      texto: 'En Ofertas encuentras precios especiales por tiempo limitado, con descuentos de entre -15% y -30% en tus favoritos. ' +
             'Cada semana hay ofertas exclusivas, ¡hasta agotar stock!',
      links: ['ofertas'],
      chips: ['Novedades', 'Envío gratis']
    },
    {
      id: 'novedades',
      claves: ['novedad', 'novedades', 'nuevo', 'nuevos', 'nueva', 'lanzamiento', 'lanzamientos', 'recien llegado', 'tendencia', 'tendencias', 'edicion limitada', 'ultimo'],
      texto: 'En Novedades están nuestras adiciones más recientes: tendencias, fórmulas innovadoras y lanzamientos exclusivos, incluida una edición limitada.',
      links: ['novedades']
    },
    {
      id: 'mas_vendido',
      claves: ['mas vendido', 'mas popular', 'favorito', 'favoritos', 'recomiendas', 'recomendacion', 'recomendar', 'color riche', 'estrella', 'best seller'],
      texto: 'Nuestro más vendido es el Color Riche Labial en tono Nude Rosado, a $16.999 COP. ' +
             'En Cuidado Facial también tenemos productos marcados como “Favorito”.',
      links: ['labios', 'facial'],
      chips: ['Maquillaje', 'Cuidado facial']
    },
    {
      id: 'labios',
      claves: ['labial', 'labiales', 'labios', 'brillo', 'brillos', 'delineador de labios', 'gloss', 'lipstick', 'mate', 'nude'],
      texto: 'En Labios hay labiales mate, brillos humectantes y delineadores de alta duración. Nuestro más vendido es el Color Riche Labial en Nude Rosado ($16.999 COP).',
      links: ['labios']
    },
    {
      id: 'ojos',
      claves: ['ojos', 'sombra', 'sombras', 'paleta', 'paletas', 'mascara de pestanas', 'pestanas', 'rimel', 'delineador de ojos', 'delineador'],
      texto: 'En Ojos encuentras paletas de sombras pigmentadas, máscaras y delineadores precisos.',
      links: ['ojos']
    },
    {
      id: 'rostro',
      claves: ['rostro', 'base', 'bases', 'iluminador', 'iluminadores', 'rubor', 'rubores', 'cobertura', 'corrector', 'polvo'],
      texto: 'En Rostro tenemos bases de cobertura adaptable, iluminadores y rubores en crema.',
      links: ['rostro']
    },
    {
      id: 'maquillaje',
      claves: ['maquillaje', 'maquillarme', 'makeup', 'colores', 'tonos', 'coleccion'],
      texto: 'Nuestra colección de Maquillaje se divide en tres categorías: Labios, Ojos y Rostro. ¿Cuál te interesa?',
      links: ['labios', 'ojos', 'rostro'],
      chips: ['Labios', 'Ojos', 'Rostro']
    },
    {
      id: 'facial',
      claves: ['cuidado facial', 'skincare', 'serum', 'hidratante', 'hidratar', 'crema', 'limpiador', 'limpieza facial', 'piel', 'rutina', 'proteccion solar', 'protector solar', 'acne', 'arrugas', 'antiedad'],
      texto: 'En Cuidado Facial tenemos rutinas pensadas para nutrir, hidratar y proteger tu piel todos los días, con fórmulas dermatológicamente probadas.\n\n' +
             'Si tienes una condición de piel específica, te recomendamos consultar a un dermatólogo antes de cambiar tu rutina.',
      links: ['facial'],
      chips: ['Ingredientes', 'Accesorios']
    },
    {
      id: 'accesorios',
      claves: ['accesorio', 'accesorios', 'brocha', 'brochas', 'esponja', 'esponjas', 'herramienta', 'herramientas', 'set de brochas', 'aplicador', 'complemento'],
      texto: 'En Accesorios encuentras herramientas y complementos diseñados para una aplicación precisa y una rutina impecable.',
      links: ['accesorios']
    },
    {
      id: 'ingredientes',
      claves: ['ingrediente', 'ingredientes', 'formula', 'formulas', 'parabeno', 'parabenos', 'limpio', 'limpias', 'vegano', 'natural', 'alergia', 'alergico', 'sensible', 'dermatologic'],
      texto: 'Priorizamos activos nutritivos e ingredientes seguros para la piel, libres de parabenos y componentes nocivos. ' +
             'Para ingredientes de un producto en particular, revisa su ficha o escríbenos desde Contacto.',
      links: ['nosotros', 'contacto']
    },
    {
      id: 'crueltyfree',
      claves: ['cruelty', 'cruelty free', 'animales', 'testeo', 'probado en animales', 'pruebas en animales', 'bienestar animal'],
      texto: 'Sí, somos Cruelty Free 🐰 Ninguno de nuestros productos o ingredientes es probado en animales.',
      links: ['nosotros']
    },
    {
      id: 'nosotros',
      claves: ['nosotros', 'quienes son', 'quienes somos', 'marca', 'historia', 'mision', 'pilares', 'sobre krisabell', 'que es krisabell'],
      texto: 'KRISABELL es una marca de cosmética sofisticada pero accesible. Creemos que la belleza celebra la individualidad.\n\n' +
             'Nuestros pilares: Cruelty Free, Fórmulas Limpias y Elegancia Accesible.',
      links: ['nosotros']
    },
    {
      id: 'cuenta',
      claves: ['cuenta', 'registrarme', 'registro', 'registrar', 'crear cuenta', 'iniciar sesion', 'login', 'ingresar', 'contrasena', 'sesion', 'usuario'],
      texto: 'Puedes iniciar sesión o crear tu cuenta desde la página Mi cuenta (el ícono de persona en el menú superior).',
      links: ['login']
    },
    {
      id: 'como_comprar',
      claves: ['como compro', 'como comprar', 'comprar', 'hacer un pedido', 'pedido', 'anadir al carrito', 'agregar al carrito', 'checkout', 'finalizar compra'],
      texto: 'Es muy sencillo: 1) elige tus productos y pulsa “Añadir al Carrito”, 2) revisa cantidades en tu carrito y 3) finaliza la compra eligiendo tu medio de pago.',
      links: ['carrito'],
      chips: ['Medios de pago', 'Envíos']
    },
    {
      id: 'carrito',
      // Intención dinámica: lee el carrito real del visitante (localStorage)
      claves: ['mi carrito', 'que tengo en el carrito', 'carrito', 'total de mi compra', 'cuanto llevo', 'mi compra'],
      texto: () => resumenCarrito(),
      links: ['carrito']
    },
    {
      id: 'precios',
      claves: ['precio', 'precios', 'cuanto cuesta', 'cuanto vale', 'costo', 'valor', 'cuesta'],
      texto: 'Los precios aparecen en cada producto, en pesos colombianos (COP). Por ejemplo, el Color Riche Labial cuesta ' + cop(16999) + '. ' +
             'Para precios rebajados, visita Ofertas. También puedes preguntarme por un producto concreto, como “set de brochas”.',
      links: ['ofertas', 'maquillaje']
    },
    {
      id: 'buscar',
      claves: ['buscar', 'busco', 'encontrar', 'donde esta', 'donde encuentro', 'no encuentro'],
      texto: 'Puedes usar el buscador (la lupa en el menú superior) o dime qué estás buscando: maquillaje, cuidado facial, accesorios…',
      links: ['maquillaje', 'facial', 'accesorios']
    },
    {
      id: 'ayuda',
      claves: ['ayuda', 'preguntas frecuentes', 'faq', 'duda', 'dudas', 'problema'],
      texto: 'Puedo ayudarte con envíos, devoluciones, medios de pago, productos y ofertas. También tienes el Centro de Ayuda con las preguntas frecuentes.',
      links: ['ayuda'],
      chips: ['Envíos', 'Devoluciones', 'Medios de pago', 'Contacto']
    }
  ];

  const MENU_INICIAL = ['Envíos', 'Devoluciones', 'Medios de pago', 'Ofertas', 'Maquillaje', 'Contacto'];

  const FALLBACK = {
    texto: 'Mmm, no estoy segura de haberte entendido 🤔 Prueba con una de estas opciones o escríbenos desde Contacto y una persona te ayudará.',
    links: ['contacto', 'ayuda'],
    chips: ['Envíos', 'Devoluciones', 'Ofertas', 'Maquillaje']
  };

  /* ======================================================================
     2. MOTOR DE RESPUESTAS
     ====================================================================== */
  function normalizar(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita tildes
      .replace(/[^a-z0-9ñ\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function contiene(textoNorm, clave) {
    // Coincide por palabra/frase completa (evita que "hola" active "cola")
    return (' ' + textoNorm + ' ').includes(' ' + clave + ' ');
  }

  // ---- Búsqueda de productos concretos en el catálogo ----
  const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'con', 'para', 'y', 'un', 'una', 'por']);
  const palabras = (s) => normalizar(s).split(' ').filter(w => w.length >= 3 && !STOP.has(w));

  function buscarProductos(textoNorm) {
    if (!DATA) return [];
    const dicho = palabras(textoNorm);
    const coincide = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
    const puntuados = DATA.PRODUCTOS.map(p => {
      const toks = palabras(p.nombre);
      const score = toks.filter(tk => dicho.some(d => coincide(tk, d))).length;
      return { p, score, ok: score >= 2 || (score === 1 && toks.length === 1) };
    }).filter(x => x.ok);
    if (!puntuados.length) return [];
    const max = Math.max(...puntuados.map(x => x.score));
    return puntuados.filter(x => x.score === max).slice(0, 3).map(x => x.p);
  }

  function respuestaProductos(lista) {
    const linea = (p) => p.descuento
      ? `${p.nombre} (${p.detalle}): ${cop(p.precioFinal)} — antes ${cop(p.precio)}, -${p.descuento}%`
      : `${p.nombre} (${p.detalle}): ${cop(p.precio)}`;
    const texto = lista.length === 1
      ? `Sí, tenemos ${linea(lista[0])}.`
      : 'Encontré estas opciones:\n' + lista.map(p => '• ' + linea(p)).join('\n');
    const links = lista.map(p => {
      const pag = DATA.PAGINAS[p.categoria];
      return { texto: p.nombre, url: pagina(pag.archivo + '#' + p.id) };
    });
    return { texto, links, chips: ['Envíos', 'Medios de pago', 'Ofertas'] };
  }

  function responder(entrada) {
    const t = normalizar(entrada);
    if (!t) return null;

    const prods = buscarProductos(t);
    if (prods.length) return respuestaProductos(prods);

    let mejor = null;
    let mejorPuntaje = 0;

    for (const intencion of INTENCIONES) {
      let puntaje = 0;
      for (const clave of intencion.claves) {
        if (contiene(t, clave)) puntaje += clave.split(' ').length * 2 + clave.length / 10;
      }
      if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = intencion; }
    }

    if (!mejor) return FALLBACK;
    return {
      texto: typeof mejor.texto === 'function' ? mejor.texto() : mejor.texto,
      links: mejor.links, chips: mejor.chips
    };
  }

  function saludoSegunHora() {
    const h = new Date().getHours();
    return h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';
  }

  function resumenCarrito() {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('krisabell_cart') || '[]'); } catch (e) { /* sin acceso */ }
    if (!Array.isArray(items) || items.length === 0) {
      return 'Tu carrito está vacío por ahora. ¡Explora nuestras colecciones y añade tus favoritos!';
    }
    const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const unidades = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const lista = items.map(i => `• ${i.name} × ${i.quantity}`).join('\n');
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total);
    return `Llevas ${unidades} ${unidades === 1 ? 'producto' : 'productos'} en tu carrito:\n${lista}\n\nSubtotal: ${fmt}`;
  }

  /* ======================================================================
     3. INTERFAZ
     ====================================================================== */
  const CLAVE_HISTORIAL = 'krisabell_chat';
  let historial = [];           // [{rol:'bot'|'user', texto, links, chips}]
  let ui = {};

  function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;   // textContent: nunca interpreta HTML (seguro ante XSS)
    return n;
  }

  function construir() {
    const lanzador = el('button', 'kb-launcher');
    lanzador.type = 'button';
    lanzador.setAttribute('aria-label', 'Abrir chat con la asistente de KRISABELL');
    lanzador.setAttribute('aria-expanded', 'false');
    lanzador.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="9" cy="10.5" r="1" fill="currentColor"/><circle cx="12.5" cy="10.5" r="1" fill="currentColor"/><circle cx="16" cy="10.5" r="1" fill="currentColor"/></svg>';

    const ventana = el('section', 'kb-window');
    ventana.setAttribute('role', 'dialog');
    ventana.setAttribute('aria-label', 'Asistente virtual KRISABELL');
    ventana.hidden = true;

    const cab = el('header', 'kb-header');
    const avatar = el('span', 'kb-avatar', 'K');
    const info = el('div', 'kb-header-info');
    info.append(el('strong', '', 'Bell · KRISABELL'), el('small', '', 'Asistente virtual'));
    const reiniciar = el('button', 'kb-icon-btn', '↺');
    reiniciar.type = 'button'; reiniciar.title = 'Reiniciar conversación'; reiniciar.setAttribute('aria-label', 'Reiniciar conversación');
    const cerrar = el('button', 'kb-icon-btn', '×');
    cerrar.type = 'button'; cerrar.setAttribute('aria-label', 'Cerrar chat');
    cab.append(avatar, info, reiniciar, cerrar);

    const mensajes = el('div', 'kb-messages');
    mensajes.setAttribute('role', 'log');
    mensajes.setAttribute('aria-live', 'polite');

    const chips = el('div', 'kb-chips');

    const form = el('form', 'kb-form');
    const input = el('input', 'kb-input');
    input.type = 'text'; input.placeholder = 'Escribe tu pregunta…'; input.autocomplete = 'off';
    input.maxLength = 300; input.setAttribute('aria-label', 'Escribe tu pregunta');
    const enviar = el('button', 'kb-send', 'Enviar');
    enviar.type = 'submit';
    form.append(input, enviar);

    ventana.append(cab, mensajes, chips, form);
    document.body.append(lanzador, ventana);
    ui = { lanzador, ventana, mensajes, chips, form, input, cerrar, reiniciar };

    lanzador.addEventListener('click', () => alternar());
    cerrar.addEventListener('click', () => alternar(false));
    reiniciar.addEventListener('click', reiniciarChat);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = input.value.trim();
      if (!txt) return;
      input.value = '';
      preguntar(txt);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !ui.ventana.hidden) alternar(false);
    });
  }

  function alternar(forzar) {
    const abrir = typeof forzar === 'boolean' ? forzar : ui.ventana.hidden;
    ui.ventana.hidden = !abrir;
    ui.lanzador.setAttribute('aria-expanded', String(abrir));
    ui.lanzador.classList.toggle('kb-hidden-mobile', abrir);
    if (abrir) {
      if (historial.length === 0) bienvenida();
      setTimeout(() => ui.input.focus(), 50);
      bajar();
    } else {
      ui.lanzador.focus();
    }
  }

  function bajar() { ui.mensajes.scrollTop = ui.mensajes.scrollHeight; }

  function pintarMensaje(m) {
    const burbuja = el('div', 'kb-msg kb-' + m.rol);
    burbuja.append(el('p', '', m.texto));
    if (m.links && m.links.length) {
      const fila = el('div', 'kb-links');
      m.links.forEach(k => {
        const l = typeof k === 'string' ? LINKS[k] : { texto: k.texto, url: () => k.url };
        if (!l) return;
        const a = el('a', 'kb-link', l.texto + ' →');
        a.href = l.url();
        fila.append(a);
      });
      burbuja.append(fila);
    }
    ui.mensajes.append(burbuja);
    bajar();
  }

  function pintarChips(lista) {
    ui.chips.replaceChildren();
    (lista || []).forEach(c => {
      const b = el('button', 'kb-chip', c);
      b.type = 'button';
      b.addEventListener('click', () => preguntar(c));
      ui.chips.append(b);
    });
  }

  function agregar(m) {
    historial.push(m);
    pintarMensaje(m);
    guardar();
  }

  function preguntar(texto) {
    agregar({ rol: 'user', texto });
    pintarChips([]);
    ui.input.disabled = true;

    const typing = el('div', 'kb-msg kb-bot kb-typing');
    typing.setAttribute('aria-label', 'Bell está escribiendo');
    typing.innerHTML = '<span></span><span></span><span></span>';
    ui.mensajes.append(typing); bajar();

    const r = responder(texto);
    setTimeout(() => {
      typing.remove();
      ui.input.disabled = false;
      if (r) {
        agregar({ rol: 'bot', texto: r.texto, links: r.links });
        pintarChips(r.chips || MENU_INICIAL.slice(0, 4));
      }
      ui.input.focus();
    }, 450);
  }

  function bienvenida() {
    agregar({
      rol: 'bot',
      texto: saludoSegunHora() + ' Soy Bell, la asistente virtual de KRISABELL 💄\nPuedo ayudarte con productos, envíos, pagos y devoluciones. ¿Qué necesitas?'
    });
    pintarChips(MENU_INICIAL);
  }

  function reiniciarChat() {
    historial = [];
    ui.mensajes.replaceChildren();
    guardar();
    bienvenida();
  }

  /* Persistencia por pestaña (sessionStorage puede fallar: siempre en try/catch) */
  function guardar() {
    try { sessionStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial.slice(-40))); } catch (e) { /* ignorar */ }
  }
  function restaurar() {
    try {
      const raw = sessionStorage.getItem(CLAVE_HISTORIAL);
      const datos = raw ? JSON.parse(raw) : [];
      if (Array.isArray(datos)) { historial = datos; historial.forEach(pintarMensaje); }
    } catch (e) { historial = []; }
    if (historial.length) pintarChips(MENU_INICIAL.slice(0, 4));
  }

  function iniciar() { construir(); restaurar(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
