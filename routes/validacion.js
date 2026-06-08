const express = require('express');
const router = express.Router();
const db = require('../database');
const path = require('path');
const fs = require('fs');

// 🔍 Endpoint 1: Consultar los metadatos del documento usando el CSV
router.get('/consultar/:csv', (req, res) => {
    // Limpiamos el input para evitar inyecciones y homogeneizar el formato
    const csvLimpio = req.params.csv.trim().toUpperCase();

    db.get("SELECT id, nombre, estado, fecha_creacion FROM documentos WHERE csv = ?", [csvLimpio], (err, doc) => {
        if (err) {
            console.error("Error al consultar CSV:", err);
            return res.status(500).json({ success: false, error: "Error interno del servidor." });
        }
        if (!doc) {
            return res.status(404).json({ success: false, error: "No se ha encontrado ningún documento asociado a este código." });
        }

        // Devolvemos los datos básicos para mostrar en la pantalla de éxito
        res.json({ success: true, documento: doc });
    });
});

// 📥 Endpoint 2: Descargar la Copia Auténtica visual
router.get('/descargar/:csv', (req, res) => {
    const csvLimpio = req.params.csv.trim().toUpperCase();

    db.get("SELECT id FROM documentos WHERE csv = ?", [csvLimpio], (err, doc) => {
        if (err || !doc) return res.status(404).send("Documento no encontrado.");

        // Apuntamos directamente a la copia visual que generó preparar.js
        const rutaArchivo = path.join(__dirname, '../uploads', `copia_autentica_${doc.id}.pdf`);

        if (fs.existsSync(rutaArchivo)) {
            // Forzamos la descarga con un nombre limpio y profesional
            res.download(rutaArchivo, `Copia_Autentica_${csvLimpio}.pdf`);
        } else {
            res.status(404).send("El archivo físico de la copia auténtica no está disponible en el servidor.");
        }
    });
});

module.exports = router;