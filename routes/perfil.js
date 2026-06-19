const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 📦 CONFIGURACIÓN DE ALMACENAMIENTO SEGURO PARA AVATARS
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/avatars';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // 🚀 SOLUCIÓN AL BUG DE MULTER: Usamos la sesión en lugar del req.body.
        // Esto previene que el DNI llegue como 'temp' si el archivo se procesa antes en el buffer multipart.
        const userDni = (req.session && req.session.usuario) ? req.session.usuario.dni : 'anonimo';
        cb(null, `avatar-${userDni}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Límite estricto de 2MB por imagen
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Solo se permiten imágenes en formato válido (jpg, jpeg, png)"));
    }
});

// 1. 🔍 OBTENER DATOS DEL PERFIL (Protección de Privacidad de Datos PII)
router.get('/:dni', (req, res) => {
    // 🔒 Control de sesión básico
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({ error: "Sesión no válida o expirada." });
    }

    const dniSolicitado = req.params.dni;
    const usuarioLogueado = req.session.usuario;

    // 🔒 Blindaje: Un usuario común solo puede consultar su propio perfil. Solo administradores saltan esta regla.
    if (usuarioLogueado.dni !== dniSolicitado && usuarioLogueado.rol !== 'admin' && usuarioLogueado.rol !== 'superadmin') {
        return res.status(403).json({ error: "Acceso denegado: No tienes permisos para consultar este perfil." });
    }

    db.get("SELECT nombre, apellidos, dni, email, cargo, rol, foto_url, notif_email FROM usuarios WHERE dni = ?", [dniSolicitado], (err, row) => {
        if (err) {
            console.error("❌ Error al obtener perfil de usuario:", err);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
        if (!row) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(row);
    });
});

// 2. 📸 ACTUALIZAR FOTO DE PERFIL (Protección anti-suplantación)
router.post('/update-avatar', (req, res, next) => {
    // Validamos sesión antes de dejar que Multer guarde nada en el disco duro
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Operación denegada: Sesión inactiva.");
    }
    next();
}, upload.single('avatar'), (req, res) => {
    // Forzamos el DNI de la sesión activa del servidor, ignorando cualquier DNI inyectado en el body
    const userDni = req.session.usuario.dni;

    if (!req.file) return res.status(400).send("No se subió ninguna imagen o el formato no es válido.");

    // Normalizamos la ruta del archivo para evitar inconsistencias multiplataforma
    const fotoUrl = `/uploads/avatars/${req.file.filename}`.replace(/\\/g, '/');

    db.run("UPDATE usuarios SET foto_url = ? WHERE dni = ?", [fotoUrl, userDni], function (err) {
        if (err) {
            console.error("❌ Error al actualizar foto_url en la Base de Datos:", err);
            return res.status(500).send("Error al actualizar la foto de perfil en el sistema.");
        }

        // 🔄 MUTACIÓN EN CALIENTE DE LA SESIÓN: Sincronizamos la UI de la plataforma al instante
        req.session.usuario.foto_url = fotoUrl;

        res.redirect('back');
    });
});

// 3. ⚙️ ACTUALIZAR SEGURIDAD (PASSWORD) Y PREFERENCIAS
router.post('/update-settings', (req, res) => {
    // 🔒 Validación estricta de sesión
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Operación denegada: Sesión inactiva.");
    }

    // Ignoramos el DNI del body y forzamos la identidad real del servidor
    const userDni = req.session.usuario.dni;
    const { currentPassword, newPassword, notif_email } = req.body;
    const receiveNotif = notif_email ? 1 : 0;

    // Verificamos de forma segura la existencia del usuario y validamos credenciales
    db.get("SELECT password FROM usuarios WHERE dni = ?", [userDni], (err, user) => {
        if (err) {
            console.error("❌ Error al buscar usuario para configuraciones de seguridad:", err);
            return res.status(500).send("Error interno del servidor");
        }
        if (!user) return res.status(404).send("Error: Cuenta de usuario no localizada.");

        // CASO A: El usuario solicita cambiar su contraseña además de sus notificaciones
        if (newPassword && newPassword.trim() !== "") {
            if (user.password !== currentPassword) {
                return res.status(403).send("La contraseña actual introducida es incorrecta.");
            }

            db.run("UPDATE usuarios SET password = ?, notif_email = ? WHERE dni = ?", [newPassword, receiveNotif, userDni], (errUpdate) => {
                if (errUpdate) {
                    console.error("❌ Error al actualizar contraseña y preferencias globales:", errUpdate);
                    return res.status(500).send("Error al actualizar los datos de seguridad.");
                }

                // Sincronizamos las preferencias en la sesión del usuario
                req.session.usuario.notif_email = receiveNotif;

                res.send(`<script>
                    alert('Ajustes de perfil y contraseña actualizados correctamente.'); 
                    window.location.href = document.referrer || '/';
                </script>`);
            });
        } else {
            // CASO B: El usuario solo altera su estado de alertas de correo (notif_email)
            db.run("UPDATE usuarios SET notif_email = ? WHERE dni = ?", [receiveNotif, userDni], (errPrefs) => {
                if (errPrefs) {
                    console.error("❌ Error al actualizar las preferencias de correo:", errPrefs);
                    return res.status(500).send("Error al guardar tus preferencias de notificación.");
                }

                // Sincronizamos las preferencias en la sesión del usuario
                req.session.usuario.notif_email = receiveNotif;

                res.send(`<script>
                    alert('Preferencias de notificación guardadas con éxito.'); 
                    window.location.href = document.referrer || '/';
                </script>`);
            });
        }
    });
});

module.exports = router;