const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  categoria: {
    type: String,
    required: true
  },
  descripcion: {
    type: String,
    required: true
  },
  precio: {
    type: Number,
    required: true,
    min: 0
  },
  tamanio: {
    type: String,
    required: true
  },
  imagen: {
    type: String,
    default: 'default-product.jpg'
  },
  stock: {
    type: Number
  }
});

module.exports = mongoose.model('Producto', productoSchema, 'products');