const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  tamanio: {
    type: String,
    enum: ['pequeno', 'mediano', 'grande', 'unico'],
    default: 'unico'
  },
  precioUnitario: {
    type: Number,
    required: true
  },
  personalizacion: {
    type: String,
    default: ''
  }
});

const carritoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [itemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

carritoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Carrito', carritoSchema, 'cart');