const express = require('express');
const router = express.Router();
const db = require('../views/database'); // 🛠️ CORREGIDO: Apunta a views/database.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { enviarAvisoFirma } = require('../config/mailer');

// CONFIGURACIÓN DE MULTER (Unificada con la carpeta central de la plataforma)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// RUTA: Procesar la subida del documento
router.post('/upload', upload.single('archivo'), (req, res) => {
    const { nombreDoc, dni_firmante } = req.body; // dni_firmante viene del formulario

    if (!req.file) {
        return res.status(400).send("No se ha subido ningún archivo o el formato no es un PDF válido.");
    }

    // Guardamos la ruta relativa tal como la gestionan admin.js y usuarios.js
    const archivoPath = req.file.path;

    // INSERT ACTUALIZADO: Incluye todas las nuevas columnas de control de flujo
    // Evita valores NULL en firmados_por para que no explote el .includes() del panel de firmas
    const query = `
        INSERT INTO documentos (
            nombre, archivo_original, archivo_firmado, firmantes, firmados_por, 
            estado, tipo_flujo, destinatarios_internos, destinatarios_externos, mensaje_final
        ) VALUES (?, ?, ?, ?, ?, 'pendiente', 'indistinto', '[]', '[]', '')
    `;

    db.run(
        query,
        [nombreDoc, archivoPath, null, dni_firmante, ""],
        function (err) {
            if (err) {
                console.error("❌ Error SQL al insertar documento desde ruta directa:", err.message);
                return res.status(500).send("Error interno en la base de datos al registrar el documento");
            }

            const nuevoDocumentoId = this.lastID; // 💡 Capturamos el ID del documento recién creado en la BD

            // ✉️ NUEVO: Extraemos el primer firmante en caso de que la variable contenga varios DNIs separados por coma
            const primerFirmanteDni = dni_firmante ? dni_firmante.split(',')[0].trim() : null;

            if (primerFirmanteDni) {
                try {
                    // 🛠️ CORREGIDO: Pasamos el ID del documento como tercer parámetro
                    enviarAvisoFirma(primerFirmanteDni, nombreDoc, nuevoDocumentoId);
                    console.log(`✉️ Aviso inicial encolado para el primer firmante: ${primerFirmanteDni}`);
                } catch (mailErr) {
                    console.error("⚠️ Error al encolar el correo de notificación:", mailErr);
                    // No bloqueamos la respuesta al cliente aunque falle el servidor de correo
                }
            }

            res.redirect('back');
        }
    );
});

module.exports = router;