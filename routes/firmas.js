const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../database');

// 1. 📤 OBTENER DOCUMENTO: Lee el archivo físico de la BD y lo pasa a Base64
router.get('/obtener-documento', (req, res) => {
    const { id } = req.query;

    db.get("SELECT archivo_original, archivo_firmado FROM documentos WHERE id = ?", [id], (err, doc) => {
        if (err || !doc) {
            return res.status(404).json({ success: false, error: "Documento no encontrado en la base de datos." });
        }

        // LÓGICA MULTIFIRMA: Si ya hay un archivo firmado previamente, servimos ese para apilar la nueva firma.
        const archivoALeer = doc.archivo_firmado ? doc.archivo_firmado : doc.archivo_original;
        const rutaPdf = path.resolve(archivoALeer);

        if (fs.existsSync(rutaPdf)) {
            try {
                const pdfBase64 = fs.readFileSync(rutaPdf, { encoding: 'base64' });
                res.json({ success: true, base64: pdfBase64 });
            } catch (readErr) {
                res.status(500).json({ success: false, error: "Error interno leyendo el archivo físico." });
            }
        } else {
            res.status(404).json({ success: false, error: "El archivo físico no existe en el servidor." });
        }
    });
});

// 2. 📥 RECIBIR FIRMA: Guarda el PDF, actualiza el estado y registra la auditoría
router.post('/recibir', (req, res) => {
    const archivoBase64 = req.body.archivoBase64;
    const documentoId = req.query.documentoId;
    const userDni = req.query.dni;

    if (!archivoBase64 || !documentoId || !userDni) {
        return res.status(400).json({ success: false, error: 'Faltan parámetros de seguridad para procesar la firma.' });
    }

    db.get("SELECT * FROM documentos WHERE id = ?", [documentoId], (err, doc) => {
        if (err || !doc) return res.status(404).json({ success: false, error: 'Documento no encontrado en BD.' });

        const pdfBuffer = Buffer.from(archivoBase64, 'base64');
        const nombreArchivoFirmado = `firmado_${Date.now()}_doc_${documentoId}.pdf`;
        const rutaDestino = path.join('uploads', nombreArchivoFirmado);

        try {
            // Guardamos el PDF con la nueva huella criptográfica
            fs.writeFileSync(rutaDestino, pdfBuffer);

            // Añadimos al usuario a la lista de "ya han firmado"
            let arrayFirmados = doc.firmados_por ? doc.firmados_por.split(',').filter(d => d.trim() !== '') : [];
            if (!arrayFirmados.includes(userDni)) {
                arrayFirmados.push(userDni);
            }
            const stringFirmados = arrayFirmados.join(',');

            // Evaluamos si el documento ya está completado
            const arrayFirmantesTotal = doc.firmantes ? doc.firmantes.split(',').filter(d => d.trim() !== '') : [];
            let nuevoEstado = 'pendiente';

            if (arrayFirmados.length >= arrayFirmantesTotal.length) {
                nuevoEstado = 'finalizado';
                // NOTA: Aquí en el futuro podrías añadir la llamada al mailer para avisar de que el proceso ha terminado
            }

            db.serialize(() => {
                // Actualizamos el documento
                db.run("UPDATE documentos SET archivo_firmado = ?, firmados_por = ?, estado = ? WHERE id = ?",
                    [rutaDestino, stringFirmados, nuevoEstado, documentoId]);

                // Dejamos constancia inmutable en auditoría
                db.run("INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) VALUES (?, ?, 'FIRMA REALIZADA', ?)",
                    [documentoId, userDni, `Firma LTV aplicada con éxito. Estado del trámite: ${nuevoEstado}`]);
            });

            console.log(`✅ Firma registrada: Doc #${documentoId} firmado por DNI ${userDni}`);
            return res.json({ success: true, message: 'Firma procesada y guardada.' });

        } catch (error) {
            console.error('❌ Error guardando la firma:', error);
            return res.status(500).json({ success: false, error: 'Fallo crítico al escribir el archivo en el servidor.' });
        }
    });
});

module.exports = router;