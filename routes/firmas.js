const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../database');

// Importamos utilidades y mailer
const { generarCopiaAutentica } = require('../utils/preparar');
const { generarCSV } = require('../utils/cryptoUtils');
const { enviarAvisoFirma, enviarCopiaFinal, enviarAlertaFinalizacion } = require('../config/mailer');

// 1. 📤 OBTENER DOCUMENTO
router.get('/obtener-documento', (req, res) => {
    const { id } = req.query;

    db.get("SELECT archivo_original, archivo_firmado FROM documentos WHERE id = ?", [id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ success: false, error: "Documento no encontrado." });

        const archivoALeer = doc.archivo_firmado ? doc.archivo_firmado : doc.archivo_original;
        const rutaPdf = path.resolve(archivoALeer);

        if (fs.existsSync(rutaPdf)) {
            try {
                const pdfBase64 = fs.readFileSync(rutaPdf, { encoding: 'base64' });
                res.json({ success: true, base64: pdfBase64 });
            } catch (readErr) {
                res.status(500).json({ success: false, error: "Error leyendo el archivo físico." });
            }
        } else {
            res.status(404).json({ success: false, error: "El archivo físico no existe." });
        }
    });
});

// 2. 📥 RECIBIR FIRMA (Con guardado síncrono blindado)
router.post('/recibir', (req, res) => {
    const archivoBase64 = req.body.archivoBase64;
    const documentoId = req.query.documentoId ? parseInt(req.query.documentoId, 10) : null;
    const userDni = req.query.dni ? req.query.dni.trim() : null;

    if (!archivoBase64 || !documentoId || !userDni) {
        return res.status(400).json({ success: false, error: 'Faltan parámetros de seguridad.' });
    }

    db.get("SELECT * FROM documentos WHERE id = ?", [documentoId], async (err, doc) => {
        if (err || !doc) return res.status(404).json({ success: false, error: 'Documento no encontrado.' });

        const pdfBuffer = Buffer.from(archivoBase64, 'base64');
        const nombreArchivoFirmado = `firmado_${Date.now()}_doc_${documentoId}.pdf`;
        const rutaDestino = path.join('uploads', nombreArchivoFirmado);

        try {
            fs.writeFileSync(rutaDestino, pdfBuffer);
        } catch (errFs) {
            console.error('❌ Error guardando el PDF:', errFs);
            return res.status(500).json({ success: false, error: 'Fallo al escribir en el servidor.' });
        }

        let arrayFirmados = doc.firmados_por ? doc.firmados_por.split(',').map(d => d.trim()).filter(d => d !== '') : [];
        if (!arrayFirmados.includes(userDni)) arrayFirmados.push(userDni);
        const stringFirmados = arrayFirmados.join(',');

        const arrayFirmantesTotal = doc.firmantes ? doc.firmantes.split(',').map(d => d.trim()).filter(d => d !== '') : [];
        let nuevoEstado = 'pendiente';
        let csvGenerado = doc.csv || null;

        // 🚀 FUNCIÓN CLAVE: Guarda en BD y responde SÓLO cuando ha terminado
        const confirmarYResponder = () => {
            db.run("UPDATE documentos SET archivo_firmado = ?, firmados_por = ?, estado = ?, csv = ? WHERE id = ?",
                [rutaDestino, stringFirmados, nuevoEstado, csvGenerado, documentoId],
                function (errUpdate) {
                    if (errUpdate) return res.status(500).json({ success: false, error: 'Fallo al actualizar BD.' });

                    db.run("INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) VALUES (?, ?, 'FIRMA REALIZADA', ?)",
                        [documentoId, userDni, `Firma LTV aplicada. Estado: ${nuevoEstado}. CSV: ${csvGenerado || 'N/A'}`],
                        function (errAudit) {
                            console.log(`✅ Firma registrada y guardada: Doc #${documentoId} firmado por DNI ${userDni}`);
                            // ¡Ahora sí le damos permiso al navegador para recargar!
                            return res.json({ success: true, message: 'Firma procesada y guardada correctamente.' });
                        }
                    );
                }
            );
        };

        // Verificamos si ya han firmado todos
        if (arrayFirmados.length >= arrayFirmantesTotal.length) {
            nuevoEstado = 'finalizado';
            if (!csvGenerado) csvGenerado = generarCSV('SABI');

            const placeholders = arrayFirmantesTotal.map(() => '?').join(', ');
            db.all(`SELECT dni, nombre, apellidos, cargo FROM usuarios WHERE dni IN (${placeholders})`, arrayFirmantesTotal, async (errDb, rows) => {
                if (!errDb && rows) {
                    try {
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
                            csv: csvGenerado, referencia: `DOC-${documentoId}`, nombre: doc.nombre
                        });
                        console.log(`✅ Copia Auténtica generada: ${rutaOutput}`);

                        // Correos Externos
                        let externos = [];
                        try { if (doc.destinatarios_externos) externos = JSON.parse(doc.destinatarios_externos); } catch (e) { }
                        externos.forEach(ext => {
                            if (ext.email) enviarCopiaFinal(ext.email, doc.nombre, ext.mensaje || doc.mensaje_final, rutaOutput, documentoId);
                        });

                        // Correos Internos
                        let internos = [];
                        try { if (doc.destinatarios_internos) internos = JSON.parse(doc.destinatarios_internos); } catch (e) { }
                        if (internos.length > 0) {
                            const dnisInternos = internos.map(i => i.dni);
                            db.all(`SELECT dni, email FROM usuarios WHERE dni IN (${dnisInternos.map(() => '?').join(',')})`, dnisInternos, (eInt, rInt) => {
                                if (!eInt && rInt) {
                                    internos.forEach(int => {
                                        const uDb = rInt.find(r => r.dni === int.dni);
                                        if (uDb && uDb.email) enviarCopiaFinal(uDb.email, doc.nombre, int.mensaje || doc.mensaje_final, rutaOutput, documentoId);
                                    });
                                }
                            });
                        }

                        // Aviso al creador
                        if (doc.aviso_creador === 1 && doc.creador_dni) {
                            db.get(`SELECT email FROM usuarios WHERE dni = ?`, [doc.creador_dni], (eCr, rCr) => {
                                if (!eCr && rCr && rCr.email) enviarAlertaFinalizacion(rCr.email, doc.nombre, documentoId);
                            });
                        }

                    } catch (errMaq) {
                        console.error('❌ Error generando la Copia Auténtica visual:', errMaq);
                    }
                }
                // Terminada la gestión final, guardamos en BD
                confirmarYResponder();
            });
        } else {
            // Flujo en cascada
            const siguienteDni = arrayFirmantesTotal.find(dni => !arrayFirmados.includes(dni));
            if (siguienteDni) {
                try { enviarAvisoFirma(siguienteDni, doc.nombre, documentoId); }
                catch (errEnvio) { console.error('❌ Error disparando correo en cascada:', errEnvio); }
            }
            // Aún quedan firmantes, guardamos estado intermedio en BD
            confirmarYResponder();
        }
    });
});

module.exports = router;