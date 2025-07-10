const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

module.exports = () => {
  // Rutas de configuración de usuario
  router.get('/configuracion', isAuthenticated, userController.mostrarConfiguracion);
  router.post('/configuracion/actualizar-perfil', isAuthenticated, userController.actualizarPerfil);
  router.post('/configuracion/actualizar-password', isAuthenticated, userController.actualizarPassword);

  return router;
};