const express = require('express');
const router = express.Router();
const db = require('../database'); // Ruta correcta apuntando a la raíz del proyecto
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

    // INSERT: Incluye todas las columnas de control de flujo
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

            // 💡 SOLUCIÓN: Consultamos el ID directamente a SQLite de forma secuencial
            // Esto evita que 'this.lastID' devuelva undefined debido al contexto de la función
            db.get("SELECT last_insert_rowid() AS id", (errRow, row) => {
                if (errRow || !row) {
                    console.error("❌ Error al recuperar el last_insert_rowid de SQLite:", errRow);
                    return res.status(500).send("Error al recuperar el identificador del documento");
                }

                const nuevoDocumentoId = row.id; // ID numérico real garantizado
                const primerFirmanteDni = dni_firmante ? dni_firmante.split(',')[0].trim() : null;

                if (primerFirmanteDni) {
                    try {
                        // Enviamos el ID recuperado de forma segura al mailer
                        enviarAvisoFirma(primerFirmanteDni, nombreDoc, nuevoDocumentoId);
                        console.log(`✉️ Aviso inicial encolado para el primer firmante: ${primerFirmanteDni} (ID Doc: ${nuevoDocumentoId})`);
                    } catch (mailErr) {
                        console.error("⚠️ Error al encolar el correo de notificación:", mailErr);
                    }
                }

                res.redirect('back');
            });
        }
    );
});

module.exports = router;