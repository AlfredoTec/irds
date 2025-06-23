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
  }
});

const carritoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Asumiendo que tienes un modelo de Usuario
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