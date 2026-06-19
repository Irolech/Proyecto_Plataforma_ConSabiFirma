const express = require('express');
const router = express.Router();
const db = require('../database');

// 📦 CONFIGURACIÓN CENTRALIZADA: Importación de Multer y Sistema de Correos
const upload = require('../config/multer');
const { enviarAvisoFirma } = require('../config/mailer');

// RUTA: Procesar la subida rápida del documento
router.post('/upload', upload.single('archivo'), (req, res) => {
    // 🔒 1. Control de seguridad básico (Evitar inyecciones o subidas anónimas)
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Sesión expirada o no válida para realizar esta operación.");
    }

    // 🔒 2. Control de modo consulta (Bloqueo estricto de escritura sin certificado digital)
    if (req.session.autenticado_via_cert === false) {
        return res.status(403).send("🔒 Operación denegada: El modo consulta restringe la creación de nuevos flujos de firmas.");
    }

    const { nombreDoc, dni_firmante } = req.body;
    const creadorDni = req.session.usuario.dni; // Trazabilidad garantizada del autor

    if (!req.file) {
        return res.status(400).send("⚠️ Por favor, selecciona un archivo PDF válido.");
    }

    // 🚀 NORMALIZACIÓN MULTIPLATAFORMA: Forzamos barras diagonales para evitar rutas rotas en entornos Linux/Render
    const archivoPath = req.file.path.replace(/\\/g, '/');

    // Extraemos de forma limpia el primer firmante introducido
    const primerFirmanteDni = dni_firmante ? dni_firmante.split(',')[0].trim() : "";

    // 🔄 3. Query armonizado con el esquema de admin.js (soporte para creador_dni y aviso_creador)
    const query = `
        INSERT INTO documentos (
            nombre, archivo_original, firmantes, firmados_por, 
            estado, tipo_flujo, destinatarios_internos, destinatarios_externos, 
            mensaje_final, creador_dni, aviso_creador
        ) VALUES (?, ?, ?, '', 'pendiente', 'indistinto', '[]', '[]', '', ?, 0)
    `;

    // 🔄 4. Uso de 'function(err)' tradicional para capturar 'this.lastID' nativamente de forma limpia
    db.run(
        query,
        [nombreDoc, archivoPath, primerFirmanteDni, creadorDni],
        function (err) {
            if (err) {
                console.error("❌ Error SQL al insertar documento desde ruta directa:", err.message);
                return res.status(500).send("Error interno en la base de datos al registrar el documento");
            }

            // Captura directa y limpia del ID autonumérico generado en SQLite
            const nuevoDocumentoId = this.lastID;

            if (primerFirmanteDni) {
                try {
                    // Envío del ID real recuperado directamente al encolador de correos
                    enviarAvisoFirma(primerFirmanteDni, nombreDoc, nuevoDocumentoId);
                    console.log(`✉️ Aviso inicial encolado para el primer firmante: ${primerFirmanteDni} (ID Doc: ${nuevoDocumentoId})`);
                } catch (mailErr) {
                    console.error("⚠️ Error al encolar el correo de notificación:", mailErr);
                }
            }

            res.redirect('back');
        }
    );
});

module.exports = router;