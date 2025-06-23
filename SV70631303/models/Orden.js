const mongoose = require('mongoose');

const itemOrdenSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  nombreProducto: {
    type: String,
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  tamanio: {
    type: String,
    enum: ['pequeno', 'mediano', 'grande', null],
    default: null
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
});

const direccionSchema = new mongoose.Schema({
  direccion: {
    type: String,
    required: true
  },
  ciudad: {
    type: String,
    required: true
  },
  departamento: {
    type: String,
    required: true
  },
  codigoPostal: {
    type: String,
    required: true
  },
  referencia: {
    type: String
  },
  telefono: {
    type: String,
    required: true
  }
});

const ordenSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [itemOrdenSchema],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  metodoDePago: {
    type: String,
    enum: ['tarjeta', 'transferencia', 'efectivo', 'paypal'],
    required: true
  },
  direccionEnvio: direccionSchema,
  status: {
    type: String,
    enum: ['pendiente', 'procesando', 'enviado', 'completada', 'cancelada'],
    default: 'pendiente'
  },
  numeroOrden: {
    type: String,
    unique: true
  },
  contadorUsuario: {  // Nuevo campo para el contador por usuario
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para generar número de orden y contador antes de guardar
ordenSchema.pre('save', async function(next) {
  if (this.isNew) {
    const ordenCount = await this.constructor.countDocuments({ usuarioId: this.usuarioId });
    this.contadorUsuario = ordenCount + 1;
    this.numeroOrden = `ORD-${this.usuarioId.toString().slice(-6)}-${Date.now().toString().slice(-4)}-${this.contadorUsuario}`;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Orden', ordenSchema, 'orders');