const User = require('../models/User');

module.exports = {
  mostrarConfiguracion: (req, res) => {
  const startDate = new Date();
  startDate.setMonth(5); // Junio (0-11)
  startDate.setDate(30);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setMonth(6); // Julio
  endDate.setHours(23, 59, 59, 999);

    const subscriptionData = {
      active: true,
      plan: 'Mensual',
      startDate: startDate,
      expiresAt: endDate
    };
    
    res.render('configuracion', {
      user: req.session.user,
      subscription: subscriptionData,
      success_msg: req.flash('success_msg')[0],
      error_msg: req.flash('error_msg')[0]
    });
  },

  actualizarPerfil: async (req, res) => {
    try {
      const { nombre, apellido } = req.body;
      await User.findByIdAndUpdate(req.session.user.id, { nombre, apellido });
      
      // Actualizar los datos en la sesión
      req.user.nombre = nombre;
      req.user.apellido = apellido;
      
      req.flash('success_msg', 'Perfil actualizado correctamente');
      res.redirect('/configuracion');
    } catch (error) {
      req.flash('error_msg', 'Error al actualizar el perfil');
      res.redirect('/configuracion');
    }
  },

  actualizarPassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Validar que las contraseñas coincidan
      if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'Las nuevas contraseñas no coinciden');
        return res.redirect('/configuracion#password');
      }
      
      // Verificar la contraseña actual
      const user = await User.findById(req.session.user.id);
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        req.flash('error_msg', 'La contraseña actual es incorrecta');
        return res.redirect('/configuracion#password');
      }
      
      // Actualizar la contraseña
      user.passwordHash = newPassword; // El pre-save hook se encargará del hashing
      await user.save();
      
      req.flash('success_msg', 'Contraseña actualizada correctamente');
      res.redirect('/configuracion#password');
    } catch (error) {
      req.flash('error_msg', 'Error al cambiar la contraseña');
      res.redirect('/configuracion#password');
    }
  }
};