const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../database');

/**
 * 1. 📤 RUTA DE DESCARGA: AutoFirma llama a esto para obtener el PDF a firmar
 */
router.get('/obtener-documento', (req, res) => {
    const { id } = req.query;
    // Asegúrate de que el archivo existe en tu carpeta uploads
    const rutaPdf = path.join(__dirname, '../uploads', `doc_${id}.pdf`);

    if (fs.existsSync(rutaPdf)) {
        res.sendFile(rutaPdf); // AutoFirma lee el archivo binario directamente
    } else {
        res.status(404).send("Documento original no encontrado");
    }
});

/**
 * 2. 📥 RUTA DE RECEPCIÓN: AutoFirma hace POST aquí con el PDF firmado
 */
router.post('/recibir', (req, res) => {
    // AutoFirma envía el archivo en 'data'
    const archivoBase64 = req.body.data || req.body.archivoBase64;
    const documentoId = req.body.documentoId || req.query.documentoId;

    // Si no llega archivo, respondemos con error
    if (!archivoBase64) {
        console.error("❌ Error: No se recibió ningún documento firmado.");
        return res.status(400).json({ error: 'No se recibió el documento.' });
    }

    const pdfBuffer = Buffer.from(archivoBase64, 'base64');
    const nombreArchivo = `doc_${documentoId}_firmado.pdf`;
    const rutaDestino = path.join(__dirname, '../uploads', nombreArchivo);

    try {
        fs.writeFileSync(rutaDestino, pdfBuffer);

        // Log de éxito en consola
        console.log(`✅ Firma recibida y guardada: ${nombreArchivo}`);
        return res.json({ success: true, message: 'Firma procesada.' });
    } catch (error) {
        console.error('❌ Error guardando:', error);
        return res.status(500).json({ error: 'Fallo al guardar en servidor.' });
    }
});

module.exports = router;