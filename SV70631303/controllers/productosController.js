const Producto = require('../models/Producto');
const Carrito = require('../models/Carrito');

const productosController = {
  // Obtener conteo de items en el carrito
  getCartCount: async (req, res) => {
    try {
      const usuarioId = req.session.user.id; // Ahora usa el usuario autenticado
      const carrito = await Carrito.findOne({ usuarioId });
      
      const count = carrito ? carrito.items.reduce((sum, item) => sum + item.cantidad, 0) : 0;
      
      res.json({ success: true, count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Error al obtener conteo' });
    }
  },

  // Listar productos con paginación
  listProducts: async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    try {
      const productos = await Producto.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const count = await Producto.countDocuments();
      const totalPages = Math.ceil(count / limit);

      res.render('productos', {
        productos,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1
      });
    } catch (err) {
      console.error(err);
      res.render('productos', { productos: [] });
    }
  },

  // Mostrar formulario para nuevo producto
  showNewProductForm: (req, res) => {
    res.render('nuevo-producto');
  },

  // Crear nuevo producto
createProduct: async (req, res) => {
  try {
    const { nombre, categoria, descripcion, precio, stock } = req.body;
    const imagen = req.file ? req.file.filename : 'default-product.jpg';
    
    const productoData = {
      nombre,
      categoria,
      descripcion,
      imagen,
      stock
    };

    if (categoria === 'Bebidas') {
      productoData.precios = {
        pequeno: parseFloat(req.body.precios.pequeno),
        mediano: parseFloat(req.body.precios.mediano),
        grande: parseFloat(req.body.precios.grande)
      };
    } else {
      productoData.precio = parseFloat(precio);
    }

    const nuevoProducto = new Producto(productoData);
    await nuevoProducto.save();
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el producto');
  }
},

  // Mostrar detalle de producto
  showProductDetail: async (req, res) => {
    try {
      const producto = await Producto.findById(req.params.id).lean();
      if (!producto) {
        return res.status(404).send('Producto no encontrado');
      }
      res.render('producto-detalle', { producto });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al cargar el producto');
    }
  },

  // Mostrar carrito
  showCart: (req, res) => {
    res.render('carrito');
  },
  
  buscarProductos: async (req, res) => {
    try {
      const query = req.query.q; // Obtiene el término de búsqueda
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      // Búsqueda con expresión regular para coincidencias parciales
      const productos = await Producto.find({
        $or: [
          { nombre: { $regex: query, $options: 'i' } }, // Búsqueda insensible a mayúsculas
          { descripcion: { $regex: query, $options: 'i' } }
        ]
      })
      .skip(skip)
      .limit(limit);

      const total = await Producto.countDocuments({
        $or: [
          { nombre: { $regex: query, $options: 'i' } },
          { descripcion: { $regex: query, $options: 'i' } }
        ]
      });

      res.render('resultadosBusqueda', {
        productos,
        query,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        title: `Resultados para "${query}"`
      });
    } catch (error) {
      console.error(error);
      req.flash('error_msg', 'Error al realizar la búsqueda');
      res.redirect('/');
    }
  }
};

module.exports = productosController;