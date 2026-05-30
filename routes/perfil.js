const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para Avatars
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/avatars';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Guardamos la foto con el DNI del usuario para que sea única
        const userDni = req.body.dni || 'temp';
        cb(null, `avatar-${userDni}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Límite de 2MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype) return cb(null, true);
        cb(new Error("Solo se permiten imágenes (jpg, png)"));
    }
});

// 1. OBTENER DATOS DEL PERFIL (Para rellenar el modal)
router.get('/:dni', (req, res) => {
    const dni = req.params.dni;
    db.get("SELECT nombre, apellidos, dni, email, cargo, rol, foto_url, notif_email FROM usuarios WHERE dni = ?", [dni], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(row);
    });
});

// 2. ACTUALIZAR FOTO DE PERFIL
router.post('/update-avatar', upload.single('avatar'), (req, res) => {
    const { dni } = req.body;
    if (!req.file) return res.status(400).send("No se subió ninguna imagen");

    const fotoUrl = `/uploads/avatars/${req.file.filename}`;

    db.run("UPDATE usuarios SET foto_url = ? WHERE dni = ?", [fotoUrl, dni], (err) => {
        if (err) return res.status(500).send("Error al actualizar la foto");
        res.redirect('back'); // Recarga la página para ver los cambios
    });
});

// 3. ACTUALIZAR SEGURIDAD (PASSWORD) Y PREFERENCIAS
router.post('/update-settings', (req, res) => {
    const { dni, currentPassword, newPassword, notif_email } = req.body;
    const receiveNotif = notif_email ? 1 : 0;

    // Primero verificamos la contraseña actual
    db.get("SELECT password FROM usuarios WHERE dni = ?", [dni], (err, user) => {
        if (err || !user) return res.status(404).send("Error de usuario");

        // Si el usuario quiere cambiar la contraseña
        if (newPassword && newPassword.trim() !== "") {
            if (user.password !== currentPassword) {
                return res.status(403).send("La contraseña actual es incorrecta");
            }
            // Actualizamos pass y notificaciones
            db.run("UPDATE usuarios SET password = ?, notif_email = ? WHERE dni = ?", [newPassword, receiveNotif, dni], (err) => {
                if (err) return res.status(500).send("Error al actualizar");
                res.send("<script>alert('Ajustes actualizados correctamente'); window.location.href='/usuario/" + dni + "';</script>");
            });
        } else {
            // Solo actualizamos notificaciones
            db.run("UPDATE usuarios SET notif_email = ? WHERE dni = ?", [receiveNotif, dni], (err) => {
                if (err) return res.status(500).send("Error al actualizar preferencias");
                res.send("<script>alert('Preferencias guardadas'); window.location.href='/usuario/" + dni + "';</script>");
            });
        }
    });
});

module.exports = router;