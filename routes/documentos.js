const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { enviarAvisoFirma } = require('../config/mailer');

const upload = multer({ dest: 'temp/' });

// RUTA: Procesar la subida del documento
router.post('/upload', upload.single('archivo'), (req, res) => {
    const { nombreDoc, dni_firmante } = req.body; // dni_firmante viene del formulario
    const tempPath = req.file.path;
    const finalName = Date.now() + "_" + req.file.originalname;
    const targetPath = path.join(__dirname, '../documentos_originales', finalName);

    // Mover de temp a carpeta final
    fs.rename(tempPath, targetPath, (err) => {
        if (err) return res.send("Error al guardar el archivo físico.");

        // INSERT CORREGIDO:
        // Usamos los nombres de columna exactos de tu database.js
        db.run(
            "INSERT INTO documentos (nombre, archivo_original, archivo_firmado, firmantes, estado) VALUES (?, ?, ?, ?, ?)", 
            [nombreDoc, finalName, null, dni_firmante, 'pendiente'], 
            function(err) {
                if (err) {
                    console.error("❌ Error SQL en Documentos:", err.message);
                    return res.send("Error en DB Documentos: " + err.message);
                }

                // Disparar aviso por email
                enviarAvisoFirma(dni_firmante, nombreDoc);
                res.redirect('back');
            }
        );
    });
});

module.exports = router;