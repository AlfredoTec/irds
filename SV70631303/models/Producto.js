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
    required: function() {
      return this.categoria !== 'Bebidas';
    },
    min: 0
  },
  precios: {
    pequeno: {
      type: Number,
      required: function() {
        return this.categoria === 'Bebidas';
      },
      min: 0
    },
    mediano: {
      type: Number,
      required: function() {
        return this.categoria === 'Bebidas';
      },
      min: 0
    },
    grande: {
      type: Number,
      required: function() {
        return this.categoria === 'Bebidas';
      },
      min: 0
    }
  },
  imagen: {
    type: String,
    default: 'default-product.jpg'
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  }
});

module.exports = mongoose.model('Producto', productoSchema, 'products');