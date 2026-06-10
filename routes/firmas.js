const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 🛠️ CORREGIDO: Ajustado al nuevo path para asegurar que usa la BD con la tabla 'notificaciones'
const db = require('../views/database');

// 🚀 Importamos las utilidades necesarias
const { generarCopiaAutentica } = require('../utils/preparar');
const { generarCSV } = require('../utils/cryptoUtils');

// ✉️ NUEVO: Importamos el motor de correos
const { enviarAvisoFirma } = require('../config/mailer');

// 1. 📤 OBTENER DOCUMENTO: Lee el archivo físico de la BD y lo pasa a Base64
router.get('/obtener-documento', (req, res) => {
    const { id } = req.query;

    db.get("SELECT archivo_original, archivo_firmado FROM documentos WHERE id = ?", [id], (err, doc) => {
        if (err || !doc) {
            return res.status(404).json({ success: false, error: "Documento no encontrado en la base de datos." });
        }

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

// 2. 📥 RECIBIR FIRMA: Guarda el PDF, actualiza el estado y genera la Copia Auténtica final
router.post('/recibir', (req, res) => {
    const archivoBase64 = req.body.archivoBase64;
    const documentoId = req.query.documentoId;
    const userDni = req.query.dni;

    if (!archivoBase64 || !documentoId || !userDni) {
        return res.status(400).json({ success: false, error: 'Faltan parámetros de seguridad para procesar la firma.' });
    }

    db.get("SELECT * FROM documentos WHERE id = ?", [documentoId], async (err, doc) => {
        if (err || !doc) return res.status(404).json({ success: false, error: 'Documento no encontrado en BD.' });

        const pdfBuffer = Buffer.from(archivoBase64, 'base64');
        const nombreArchivoFirmado = `firmado_${Date.now()}_doc_${documentoId}.pdf`;
        const rutaDestino = path.join('uploads', nombreArchivoFirmado);

        try {
            fs.writeFileSync(rutaDestino, pdfBuffer);

            let arrayFirmados = doc.firmados_por ? doc.firmados_por.split(',').filter(d => d.trim() !== '') : [];
            if (!arrayFirmados.includes(userDni)) {
                arrayFirmados.push(userDni);
            }
            const stringFirmados = arrayFirmados.join(',');

            const arrayFirmantesTotal = doc.firmantes ? doc.firmantes.split(',').filter(d => d.trim() !== '') : [];
            let nuevoEstado = 'pendiente';
            let csvGenerado = doc.csv || null;

            // Verificamos si ya han firmado todos
            if (arrayFirmados.length >= arrayFirmantesTotal.length) {
                nuevoEstado = 'finalizado';

                if (!csvGenerado) {
                    csvGenerado = generarCSV('SABI');
                }

                try {
                    const placeholders = arrayFirmantesTotal.map(() => '?').join(',');
                    db.all(`SELECT dni, nombre, apellidos, cargo FROM usuarios WHERE dni IN (${placeholders})`, arrayFirmantesTotal, async (errDb, rows) => {
                        if (errDb) return console.error("Error al buscar firmantes:", errDb);

                        const firmantesParaMaquetar = arrayFirmantesTotal.map(dni => {
                            const user = rows.find(r => r.dni === dni);
                            return {
                                nombre: user ? `${user.nombre} ${user.apellidos}` : "Desconocido",
                                cargo: user ? user.cargo : "Firmante",
                                fecha: new Date()
                            };
                        });

                        const rutaOutput = path.join('uploads', `copia_autentica_${documentoId}.pdf`);

                        await generarCopiaAutentica(rutaDestino, rutaOutput, firmantesParaMaquetar, {
                            csv: csvGenerado,
                            referencia: `DOC-${documentoId}`,
                            nombre: doc.nombre
                        });

                        console.log(`✅ Copia Auténtica generada: ${rutaOutput}`);
                    });
                } catch (errorMaquetacion) {
                    console.error('❌ Error al generar la Copia Auténtica visual:', errorMaquetacion);
                }
            } else {
                // ✉️ NUEVO: Flujo de firmas incompleto. Buscamos al siguiente en la lista.
                // .find() devuelve el primer DNI de la lista original que NO está en la lista de los que ya han firmado.
                const siguienteFirmanteDni = arrayFirmantesTotal.find(dni => !arrayFirmados.includes(dni));

                if (siguienteFirmanteDni) {
                    console.log(`✉️ Turno del siguiente firmante. Gatillando notificación para el DNI: ${siguienteFirmanteDni}`);
                    enviarAvisoFirma(siguienteFirmanteDni, doc.nombre, documentoId);
                }
            }

            // Guardamos todo en la base de datos
            db.serialize(() => {
                db.run("UPDATE documentos SET archivo_firmado = ?, firmados_por = ?, estado = ?, csv = ? WHERE id = ?",
                    [rutaDestino, stringFirmados, nuevoEstado, csvGenerado, documentoId]);

                db.run("INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) VALUES (?, ?, 'FIRMA REALIZADA', ?)",
                    [documentoId, userDni, `Firma LTV aplicada con éxito. Estado: ${nuevoEstado}. CSV: ${csvGenerado || 'N/A'}`]);
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