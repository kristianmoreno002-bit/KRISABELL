(function () {
  'use strict';

  const TIENDA = {
    envioGratisDesde: 230000,
    envioDias: '3 a 7 días hábiles',
    diasDevolucion: 15,
    respuestaContacto: '24 a 48 horas hábiles'
  };

  const PRODUCTOS = [
    {
      id: 'lab-01',
      nombre: 'Color Riche Labial',
      categoria: 'Maquillaje',
      subcategoria: 'Labios',
      precio: 16999,
      descripcion: 'Labial nude rosado con acabado suave y duradero.',
      url: 'Maquillaje.html#Labios'
    },

    { id: 'lab-02', 
      nombre: 'Velvet Kiss Tint', 
      categoria: 'Maquillaje', 
      subcategoria: 'Labios', 
      precio: 22490, 
      descripcion: 'Tint labial líquido con acabado satinado y toque ligero.', 
      url: 'Maquillaje.html#Labios' 
    },

    { id: 'ojo-01', 
      nombre: 'Lash Lift Mascara', 
      categoria: 'Maquillaje', 
      subcategoria: 'Ojos', 
      precio: 31500, 
      descripcion: 'Máscara de volumen para una mirada más definida y larga.', 
      url: 'Maquillaje.html#Ojos' 
    },

    { id: 'ojo-02', 
      nombre: 'Rose Glow Palette', 
      categoria: 'Maquillaje', 
      subcategoria: 'Ojos', 
      precio: 41900, 
      descripcion: 'Paleta con tonos rosa, café y dorado para looks versátiles.', 
      url: 'Maquillaje.html#Ojos' 
    },
    { id: 'ros-01', 
      nombre: 'Glow Finish Foundation', 
      categoria: 'Maquillaje', 
      subcategoria: 'Rostro', 
      precio: 38900, 
      descripcion: 'Base de acabado natural con cobertura ligera a media.', 
      url: 'Maquillaje.html#Rostro' 
    },
    { id: 'ros-02', 
      nombre: 'Sunbeam Glow', 
      categoria: 'Maquillaje', 
      subcategoria: 'Rostro', 
      precio: 26300, 
      descripcion: 'Iluminador líquido para un brillo saludable y luminoso.', 
      url: 'Maquillaje.html#Rostro' 
    },
    { id: 'cf-01', 
      nombre: 'Hydra Boost Serum', 
      categoria: 'Cuidado Facial', 
      subcategoria: 'Skincare', 
      precio: 29900, 
      descripcion: 'Suero hidratante para piel cansada y con pérdida de luminosidad.', 
      url: 'Cuidadofacial.html' 
    },
    { id: 'cf-02', 
      nombre: 'Velvet Cleanser', 
      categoria: 'Cuidado Facial', 
      subcategoria: 'Skincare', 
      precio: 24500, 
      descripcion: 'Limpiador suave ideal para una limpieza diaria sin resecar.', 
      url: 'Cuidadofacial.html' 
    },
    { id: 'cf-03', 
      nombre: 'Night Repair Cream', 
      categoria: 'Cuidado Facial', 
      subcategoria: 'Skincare', 
      precio: 34000, 
      descripcion: 'Crema nocturna que ayuda a reparar y nutrir la piel.', 
      url: 'Cuidadofacial.html' 
    },
    { id: 'cf-04', 
      nombre: 'SPF Daily Protect', 
      categoria: 'Cuidado Facial', 
      subcategoria: 'Skincare', 
      precio: 31900, 
      descripcion: 'Protector solar con FPS 50 para uso diario.', 
      url: 'Cuidadofacial.html' 
    },
    { id: 'acc-01', 
      nombre: 'Beauty Blender Pro', 
      categoria: 'Accesorios', 
      subcategoria: 'Aplicación', 
      precio: 18900, 
      descripcion: 'Esponja de maquillaje para una aplicación uniforme.', 
      url: 'Accesorios.html' 
    },
    { id: 'acc-02', 
      nombre: 'Precision Brush Set', 
      categoria: 'Accesorios', 
      subcategoria: 'Brochas', 
      precio: 22500, 
      descripcion: 'Set de brochas para precisión en ojos y rostro.', 
      url: 'Accesorios.html' 
    },
    { id: 'acc-03', 
      nombre: 'Makeup Organizer', 
      categoria: 'Accesorios', 
      subcategoria: 'Almacenamiento', 
      precio: 32000, 
      descripcion: 'Organizador elegante para herramientas y cosméticos.', 
      url: 'Accesorios.html' 
    },
    { id: 'acc-04', 
      nombre: 'Silk Cosmetic Pouch', 
      categoria: 'Accesorios', 
      subcategoria: 'Bolso', 
      precio: 16500, 
      descripcion: 'Bolso cosmético portátil y con diseño sofisticado.', 
      url: 'Accesorios.html' 
    },

    { id: 'nov-01', 
      nombre: 'Glow Booster Drops', 
      categoria: 'Novedades', 
      subcategoria: 'Lanzamientos', 
      precio: 52000, 
      descripcion: 'Suero iluminador con efecto brillo instantáneo.', 
      url: 'Novedades.html'
    },

    { id: 'nov-02', 
      nombre: 'Soft Tint Lip Oil', 
      categoria: 'Novedades', 
      subcategoria: 'Lanzamientos', 
      precio: 31000, 
      descripcion: 'Tinte para labios con brillo y humectación.', 
      url: 'Novedades.html' 
    },

    { id: 'nov-03', 
      nombre: 'Velvet Eye Trio', 
      categoria: 'Novedades', 
      subcategoria: 'Lanzamientos', 
      precio: 38000, descripcion: 'Paleta compacta con tonos satinados para crear looks suaves.',
      url: 'Novedades.html' 
    },

    { id: 'nov-04', 
      nombre: 'Moon Recovery Cream', 
      categoria: 'Novedades', 
      subcategoria: 'Lanzamientos', 
      precio: 45000, 
      descripcion: 'Crema reparadora con ácido hialurónico y ceramidas.', 
      url: 'Novedades.html' 
    },

    { id: 'ofe-01', 
      nombre: 'Kiss Velvet Lip', 
      categoria: 'Ofertas', 
      subcategoria: 'Descuento', 
      precio: 22400, 
      descripcion: 'Labial mate con descuento por temporada.', 
      url: 'Ofertas.html' 
    },

    { id: 'ofe-02', 
      nombre: 'Hydra Dew Serum', 
      categoria: 'Ofertas', 
      subcategoria: 'Descuento', 
      precio: 31200, 
      descripcion: 'Suero hidratante con descuento especial.', 
      url: 'Ofertas.html' 
    },

    { id: 'ofe-03', 
      nombre: 'Petal Bloom Palette', 
      categoria: 'Ofertas', 
      subcategoria: 'Descuento', 
      precio: 36000, 
      descripcion: 'Paleta de sombras con tonos suaves y promocionales.', 
      url: 'Ofertas.html' 
    },

    { id: 'ofe-04', 
      nombre: 'Solar Shield SPF50', 
      categoria: 'Ofertas', 
      subcategoria: 'Descuento', 
      precio: 35700, 
      descripcion: 'Protector solar con descuento y alta protección.', 
      url: 'Ofertas.html' 
    }
  ];

  function formatoCOP(valor) {
    const numero = Number(valor) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numero);
  }

  const storeData = {
    TIENDA,
    PRODUCTOS,
    formatoCOP,
    buscar: function (texto) {
      const query = (texto || '').toString().trim().toLowerCase();
      if (!query) return PRODUCTOS;

      return PRODUCTOS.filter((producto) => {
        const hayCoincidencia = [
          producto.nombre,
          producto.categoria,
          producto.subcategoria,
          producto.descripcion
        ].join(' ').toLowerCase();

        return hayCoincidencia.includes(query);
      });
    }
  };

  if (typeof window !== 'undefined') {
    window.KRISABELL_DATA = storeData;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = storeData;
  }

})();
