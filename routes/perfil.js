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
        // Funciona perfectamente porque el input hidden de DNI está posicionado ANTES que el input file en el HTML
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

// 1. OBTENER DATOS DEL PERFIL (Para rellenar el modal mediante API si fuera necesario)
router.get('/:dni', (req, res) => {
    const dni = req.params.dni;
    db.get("SELECT nombre, apellidos, dni, email, cargo, rol, foto_url, notif_email FROM usuarios WHERE dni = ?", [dni], (err, row) => {
        if (err) {
            console.error("Error al obtener perfil de usuario:", err);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
        if (!row) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(row);
    });
});

// 2. ACTUALIZAR FOTO DE PERFIL
router.post('/update-avatar', upload.single('avatar'), (req, res) => {
    const { dni } = req.body;
    if (!req.file) return res.status(400).send("No se subió ninguna imagen");

    const fotoUrl = `/uploads/avatars/${req.file.filename}`;

    db.run("UPDATE usuarios SET foto_url = ? WHERE dni = ?", [fotoUrl, dni], (err) => {
        if (err) {
            console.error("Error al actualizar foto_url en BD:", err);
            return res.status(500).send("Error al actualizar la foto de perfil");
        }
        // res.redirect('back') funciona de maravilla aquí porque recarga la página exacta 
        // donde se originó la petición (sea /admin o /usuario)
        res.redirect('back');
    });
});

// 3. ACTUALIZAR SEGURIDAD (PASSWORD) Y PREFERENCIAS
router.post('/update-settings', (req, res) => {
    const { dni, currentPassword, newPassword, notif_email } = req.body;
    const receiveNotif = notif_email ? 1 : 0;

    // Verificamos la existencia del usuario y su contraseña actual
    db.get("SELECT password FROM usuarios WHERE dni = ?", [dni], (err, user) => {
        if (err) {
            console.error("Error al buscar usuario para configuraciones:", err);
            return res.status(500).send("Error interno del servidor");
        }
        if (!user) return res.status(404).send("Error: Usuario no encontrado");

        // Caso A: El usuario ha rellenado el campo de nueva contraseña
        if (newPassword && newPassword.trim() !== "") {
            if (user.password !== currentPassword) {
                return res.status(403).send("La contraseña actual es incorrecta");
            }

            // Actualizamos tanto la contraseña como las notificaciones por email
            db.run("UPDATE usuarios SET password = ?, notif_email = ? WHERE dni = ?", [newPassword, receiveNotif, dni], (err) => {
                if (err) {
                    console.error("Error al actualizar contraseña y preferencias:", err);
                    return res.status(500).send("Error al actualizar los datos de seguridad");
                }
                // CORRECCIÓN ARQUITECTURA: document.referrer devuelve al usuario a la URL exacta de donde venía (/admin o /usuario)
                res.send(`<script>
                    alert('Ajustes y contraseña actualizados correctamente'); 
                    window.location.href = document.referrer || '/usuario/${dni}';
                </script>`);
            });
        } else {
            // Caso B: El usuario solo cambia el checkbox de recibir notificaciones
            db.run("UPDATE usuarios SET notif_email = ? WHERE dni = ?", [receiveNotif, dni], (err) => {
                if (err) {
                    console.error("Error al actualizar solo preferencias de email:", err);
                    return res.status(500).send("Error al actualizar preferencias");
                }
                // CORRECCIÓN ARQUITECTURA: document.referrer evita romper el flujo del administrador
                res.send(`<script>
                    alert('Preferencias de notificación guardadas'); 
                    window.location.href = document.referrer || '/usuario/${dni}';
                </script>`);
            });
        }
    });
});

module.exports = router;