const Carrito = require('../models/Carrito');
const Producto = require('../models/Producto');
const Orden = require('../models/Orden');

// Controlador para ver el carrito
const verCarrito = async (req, res) => {
  try {
    const usuarioId = req.session.user.id;
    
    const carrito = await Carrito.findOne({ usuarioId }).populate('items.producto');
    
    if (!carrito) {
      return res.render('carrito', { 
        items: [], 
        total: 0,
        title: 'Carrito de Compras'
      });
    }
    
    // Calcular total considerando precios por tamaño si es bebida
    const total = carrito.items.reduce((sum, item) => {
      const producto = item.producto;
      let precio = producto.precio;
      
      if (producto.categoria === 'Bebidas' && item.tamanio && producto.precios) {
        precio = producto.precios[item.tamanio] || producto.precio;
      }
      
      return sum + (precio * item.cantidad);
    }, 0);
    
    res.render('carrito', { 
      items: carrito.items, 
      total,
      title: 'Carrito de Compras'
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error al obtener el carrito');
    res.status(500).redirect('/');
  }
};

// Controlador para agregar producto al carrito
const agregarProducto = async (req, res) => {
  // 1. Validación de autenticación
  if (!req.session.user || !req.session.user.id) {
    console.error('Intento de agregar producto sin autenticación');
    req.flash('error_msg', 'Debes iniciar sesión para agregar productos al carrito');
    return res.status(401).redirect('/login');
  }

  // 2. Validación de datos de entrada
  const { productoId, cantidad, tamanio } = req.body;
  if (!productoId || !cantidad) {
    console.error('Datos incompletos:', { productoId, cantidad });
    req.flash('error_msg', 'Datos del producto incompletos');
    return res.status(400).redirect('/');
  }

  try {
    // 3. Validación de cantidad numérica
    const cantidadNum = parseInt(cantidad);
    if (isNaN(cantidadNum) || cantidadNum < 1) {
      console.error('Cantidad inválida:', cantidad);
      req.flash('error_msg', 'La cantidad debe ser un número positivo');
      return res.status(400).redirect('/');
    }

    // 4. Buscar el producto en la base de datos
    const producto = await Producto.findById(productoId);
    if (!producto) {
      console.error('Producto no encontrado:', productoId);
      req.flash('error_msg', 'El producto no existe o ha sido eliminado');
      return res.status(404).redirect('/');
    }

    // 5. Validar stock disponible
    if (producto.stock < cantidadNum) {
      console.error('Stock insuficiente:', {
        stock: producto.stock,
        cantidadSolicitada: cantidadNum
      });
      req.flash('error_msg', `No hay suficiente stock. Disponible: ${producto.stock}`);
      return res.status(400).redirect('/');
    }

    // 6. Validar tamaño para bebidas
    if (producto.categoria === 'Bebidas' && !tamanio) {
      req.flash('error_msg', 'Debes seleccionar un tamaño para la bebida');
      return res.status(400).redirect('/');
    }

    // 7. Buscar o crear carrito
    let carrito = await Carrito.findOne({ usuarioId: req.session.user.id });
    if (!carrito) {
      carrito = new Carrito({
        usuarioId: req.session.user.id,
        items: [],
        total: 0
      });
    }

    // 8. Determinar el precio según el tamaño si es bebida
    let precioUnitario = producto.precio;
    if (producto.categoria === 'Bebidas' && tamanio && producto.precios) {
      precioUnitario = producto.precios[tamanio] || producto.precio;
    }

    // 9. Buscar si el producto ya está en el carrito (mismo producto y mismo tamaño)
    const itemIndex = carrito.items.findIndex(
      item => item.producto.toString() === productoId && 
             (item.tamanio === tamanio || (!item.tamanio && !tamanio))
    );

    // 10. Actualizar o agregar el item
    if (itemIndex > -1) {
      // Producto ya existe en el carrito - actualizar cantidad
      carrito.items[itemIndex].cantidad += cantidadNum;
    } else {
      // Producto nuevo en el carrito - agregar item
      const nuevoItem = {
        producto: productoId,
        cantidad: cantidadNum,
        precioUnitario: precioUnitario
      };

      if (producto.categoria === 'Bebidas' && tamanio) {
        nuevoItem.tamanio = tamanio;
      }
      carrito.items.push(nuevoItem);
    }

    // 11. Calcular total actualizado
    carrito.total = carrito.items.reduce((sum, item) => {
      return sum + (item.precioUnitario * item.cantidad);
    }, 0);

    // 12. Guardar cambios
    await carrito.save();

    // 13. Respuesta exitosa
    req.flash('success_msg', `${producto.nombre} agregado al carrito (${cantidadNum} unidades)`);
    return res.redirect('/carrito');

  } catch (error) {
    console.error('Error en agregarProducto:', error);
    req.flash('error_msg', 'Error al agregar producto al carrito. Por favor intente nuevamente.');
    return res.status(500).redirect('/');
  }
};

// Controlador para eliminar producto del carrito
const eliminarProducto = async (req, res) => {
  try {
    const { itemId } = req.params;
    const usuarioId = req.session.user.id;
    
    const carrito = await Carrito.findOne({ usuarioId });
    
    if (!carrito) {
      req.flash('error_msg', 'Carrito no encontrado');
      return res.status(404).redirect('/carrito');
    }
    
    // Encontrar el item a eliminar para mostrar mensaje
    const itemEliminado = carrito.items.find(item => item._id.toString() === itemId);
    
    carrito.items = carrito.items.filter(
      item => item._id.toString() !== itemId
    );
    
    // Recalcular total
    carrito.total = carrito.items.reduce((sum, item) => {
      return sum + (item.precioUnitario * item.cantidad);
    }, 0);
    
    await carrito.save();
    
    if (itemEliminado) {
      const producto = await Producto.findById(itemEliminado.producto);
      if (producto) {
        req.flash('success_msg', `${producto.nombre} eliminado del carrito`);
      }
    }
    
    res.redirect('/carrito');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error al eliminar producto del carrito');
    res.status(500).redirect('/carrito');
  }
};

// Controlador para actualizar cantidad de un item
const actualizarCantidad = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { cantidad } = req.body;
    const usuarioId = req.session.user.id;
    
    const cantidadNum = parseInt(cantidad);
    if (isNaN(cantidadNum) || cantidadNum < 1) {
      req.flash('error', 'La cantidad debe ser un número positivo');
      return res.redirect('/carrito');
    }
    
    const carrito = await Carrito.findOne({ usuarioId }).populate('items.producto');
    
    if (!carrito) {
      req.flash('error', 'Carrito no encontrado');
      return res.redirect('/carrito');
    }
    
    const item = carrito.items.find(item => item._id.toString() === itemId);
    
    if (!item) {
      req.flash('error', 'Ítem no encontrado en el carrito');
      return res.redirect('/carrito');
    }
    
    // Validar stock disponible
    const producto = await Producto.findById(item.producto._id);
    if (producto.stock < cantidadNum) {
      req.flash('error', `No hay suficiente stock. Disponible: ${producto.stock}`);
      return res.redirect('/carrito');
    }
    
    item.cantidad = cantidadNum;
    
    // Recalcular total
    carrito.total = carrito.items.reduce((sum, item) => {
      const precio = item.producto.categoria === 'Bebidas' && item.tamanio && item.producto.precios 
        ? item.producto.precios[item.tamanio] || item.producto.precio 
        : item.producto.precio;
      
      return sum + (precio * item.cantidad);
    }, 0);
    
    await carrito.save();
    
    req.flash('success', 'Cantidad actualizada correctamente');
    res.redirect('/carrito');
    
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error al actualizar el carrito');
    res.redirect('/carrito');
  }
};

// Controlador para mostrar checkout
const mostrarCheckout = async (req, res) => {
  try {
    const usuarioId = req.session.user.id;
    const carrito = await Carrito.findOne({ usuarioId }).populate('items.producto');
    
    if (!carrito || carrito.items.length === 0) {
      req.flash('error_msg', 'Tu carrito está vacío');
      return res.redirect('/carrito');
    }
    
    // Verificar stock antes de mostrar checkout
    const itemsSinStock = [];
    await Promise.all(carrito.items.map(async (item) => {
      const producto = await Producto.findById(item.producto._id);
      if (producto.stock < item.cantidad) {
        itemsSinStock.push({
          producto: producto.nombre,
          stockDisponible: producto.stock,
          cantidadSolicitada: item.cantidad
        });
      }
    }));
    
    if (itemsSinStock.length > 0) {
      const mensajeError = itemsSinStock.map(item => 
        `${item.producto}: Stock disponible ${item.stockDisponible} (solicitado ${item.cantidadSolicitada})`
      ).join(', ');
      
      req.flash('error_msg', `Stock insuficiente para: ${mensajeError}`);
      return res.redirect('/carrito');
    }
    
    const total = carrito.items.reduce((sum, item) => {
      const producto = item.producto;
      let precio = producto.precio;
      
      if (producto.categoria === 'Bebidas' && item.tamanio && producto.precios) {
        precio = producto.precios[item.tamanio] || producto.precio;
      }
      
      return sum + (precio * item.cantidad);
    }, 0);
    
    res.render('checkout', { 
      carrito,
      items: carrito.items, 
      total,
      title: 'Checkout - Finalizar Compra'
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error al mostrar checkout');
    res.status(500).redirect('/carrito');
  }
};

// Controlador para mostrar orden confirmada
const mostrarOrdenConfirmada = async (req, res) => {
  try {
    const orden = await Orden.findById(req.params.id)
  .populate('items.producto')
  .populate({
    path: 'usuarioId',
    model: 'User' // Especifica explícitamente el modelo correcto
  });
    
    if (!orden) {
      req.flash('error_msg', 'Orden no encontrada');
      return res.status(404).redirect('/');
    }
    
    // Verificar que el usuario sea el dueño de la orden
    if (orden.usuarioId._id.toString() !== req.session.user.id) {
      req.flash('error_msg', 'No tienes permiso para ver esta orden');
      return res.status(403).redirect('/');
    }
    
    res.render('ordenConfirmada', { 
      orden,
      title: 'Orden Confirmada'
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error al mostrar orden');
    res.status(500).redirect('/');
  }
};

// Controlador para crear orden desde el carrito
const crearOrden = async (req, res) => {
  try {
    const carritoId = req.params.id;
    const { metodoDePago, direccion, referencia, departamento, ciudad, codigoPostal, telefono } = req.body;
    const usuarioId = req.session.user.id;

    const carrito = await Carrito.findOne({ _id: carritoId, usuarioId }).populate('items.producto');
    
    if (!carrito) {
      req.flash('error_msg', 'Carrito no encontrado');
      return res.status(404).redirect('/carrito');
    }
    
    if (carrito.items.length === 0) {
      req.flash('error_msg', 'El carrito está vacío');
      return res.status(400).redirect('/carrito');
    }

    // Verificar stock nuevamente antes de crear la orden
    const itemsSinStock = [];
    await Promise.all(carrito.items.map(async (item) => {
      const producto = await Producto.findById(item.producto._id);
      if (producto.stock < item.cantidad) {
        itemsSinStock.push({
          producto: producto.nombre,
          stockDisponible: producto.stock,
          cantidadSolicitada: item.cantidad
        });
      }
    }));
    
    if (itemsSinStock.length > 0) {
      const mensajeError = itemsSinStock.map(item => 
        `${item.producto}: Stock disponible ${item.stockDisponible} (solicitado ${item.cantidadSolicitada})`
      ).join(', ');
      
      req.flash('error_msg', `Stock insuficiente para: ${mensajeError}`);
      return res.redirect('/carrito');
    }

    // Obtener el contador de órdenes del usuario
    const ordenCount = await Orden.countDocuments({ usuarioId });
    const contadorUsuario = ordenCount + 1;

    // Preparar items para la orden
    const itemsParaOrden = carrito.items.map(item => {
      const producto = item.producto;
      let precio = producto.precio;
      
      if (producto.categoria === 'Bebidas' && item.tamanio && producto.precios) {
        precio = producto.precios[item.tamanio] || producto.precio;
      }
      
      return {
        producto: producto._id,
        nombreProducto: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: precio,
        tamanio: item.tamanio || null,
        subtotal: precio * item.cantidad
      };
    });

    const total = itemsParaOrden.reduce((sum, item) => sum + item.subtotal, 0);

    const direccionEnvio = {
      direccion,
      ciudad,
      departamento,
      codigoPostal,
      referencia: referencia || '',
      telefono
    };

    // Crear la nueva orden con el contador
    const orden = new Orden({
      usuarioId,
      items: itemsParaOrden,
      total,
      metodoDePago,
      direccionEnvio,
      contadorUsuario, // Añadimos el contador
      status: 'pendiente'
    });

    // Actualizar stock de productos y guardar orden
    await Promise.all([
      ...itemsParaOrden.map(item => 
        Producto.findByIdAndUpdate(item.producto, {
          $inc: { stock: -item.cantidad }
        })
      ),
      orden.save()
    ]);

    // Vaciar carrito
    carrito.items = [];
    carrito.total = 0;
    await carrito.save();

    res.redirect(`/carrito/orden-confirmada/${orden._id}`);
  } catch (error) {
    console.error('Error al crear orden:', error);
    req.flash('error_msg', 'Error al crear la orden. Por favor intente nuevamente.');
    res.status(500).redirect('/carrito');
  }
};

const cancelarOrden = async (req, res) => {
  try {
    const ordenId = req.params.id;
    const usuarioId = req.session.user.id;

    // Verificar que la orden pertenece al usuario
    const orden = await Orden.findOne({ _id: ordenId, usuarioId }).populate('items.producto');
    
    if (!orden) {
      req.flash('error_msg', 'Orden no encontrada o no tienes permiso para cancelarla');
      return res.redirect('/carrito/mis-ordenes');
    }

    // Solo se pueden cancelar órdenes pendientes
    if (orden.status !== 'pendiente') {
      req.flash('error_msg', 'Solo se pueden cancelar órdenes con estado "pendiente"');
      return res.redirect('/carrito/mis-ordenes');
    }

    // Devolver el stock a los productos
    await Promise.all(orden.items.map(item => 
      Producto.findByIdAndUpdate(item.producto, {
        $inc: { stock: item.cantidad }
      })
    ));

    // Actualizar el estado de la orden a "cancelada"
    orden.status = 'cancelada';
    await orden.save();

    req.flash('success_msg', 'Orden cancelada correctamente');
    res.redirect('/carrito/mis-ordenes');
  } catch (error) {
    console.error('Error al cancelar orden:', error);
    req.flash('error_msg', 'Error al cancelar la orden');
    res.status(500).redirect('/carrito/mis-ordenes');
  }
};

// Controlador para mostrar historial de órdenes
const mostrarOrdenes = async (req, res) => {
  try {
    const usuarioId = req.session.user.id;
    
    const ordenes = await Orden.find({ usuarioId })
      .populate('items.producto')
      .sort({ createdAt: -1 });
    
    res.render('misOrdenes', {
      ordenes,
      title: 'Mis Órdenes'
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error al obtener las órdenes');
    res.status(500).redirect('/');
  }
};

module.exports = {
  verCarrito,
  agregarProducto,
  eliminarProducto,
  actualizarCantidad,
  mostrarCheckout,
  mostrarOrdenConfirmada,
  crearOrden,
  cancelarOrden,
  mostrarOrdenes
};