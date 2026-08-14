const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../database');

// Importamos utilidades y mailer
const { generarCopiaAutentica } = require('../utils/preparar');
const { generarCSV } = require('../utils/cryptoUtils');
const { enviarAvisoFirma, enviarCopiaFinal, enviarAlertaFinalizacion } = require('../config/mailer');

// =====================================================================
// 1. 📤 OBTENER DOCUMENTO (Para visor o cliente de AutoFirma)
// =====================================================================
router.get('/obtener-documento', (req, res) => {
    const { id } = req.query;

    db.get("SELECT archivo_original, archivo_firmado FROM documentos WHERE id = ?", [id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ success: false, error: "Documento no encontrado." });

        // Si ya existen firmas previas, enviamos la versión con firmas acumuladas
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

// =====================================================================
// 2. 📥 RECIBIR FIRMA (Guardado síncrono, avance de turno y Socket.io)
// =====================================================================
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

        // Actualización de la lista de firmados
        let arrayFirmados = doc.firmados_por ? doc.firmados_por.split(',').map(d => d.trim()).filter(Boolean) : [];
        if (!arrayFirmados.includes(userDni)) arrayFirmados.push(userDni);
        const stringFirmados = arrayFirmados.join(',');

        const arrayFirmantesTotal = doc.firmantes ? doc.firmantes.split(',').map(d => d.trim()).filter(Boolean) : [];
        let nuevoEstado = 'pendiente';
        let csvGenerado = doc.csv || null;

        if (arrayFirmados.length >= arrayFirmantesTotal.length) {
            nuevoEstado = 'finalizado';
        }

        // 🚀 FUNCIÓN DE CIERRE: Actualiza BD, emite eventos en tiempo real y responde al cliente
        const confirmarYResponder = (rutaPdfParaBD) => {
            db.run("UPDATE documentos SET archivo_firmado = ?, firmados_por = ?, estado = ?, csv = ? WHERE id = ?",
                [rutaPdfParaBD, stringFirmados, nuevoEstado, csvGenerado, documentoId],
                function (errUpdate) {
                    if (errUpdate) return res.status(500).json({ success: false, error: 'Fallo al actualizar BD.' });

                    db.run("INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) VALUES (?, ?, 'FIRMA REALIZADA', ?)",
                        [documentoId, userDni, `Firma LTV aplicada. Estado: ${nuevoEstado}. CSV: ${csvGenerado || 'N/A'}`],
                        function (errAudit) {
                            console.log(`✅ Firma registrada: Doc #${documentoId} firmado por DNI ${userDni}`);

                            // 🔌 NOTIFICACIONES SOCKET.IO EN TIEMPO REAL
                            const io = req.app.get('io');
                            if (io) {
                                // 1. Refrescar panel del usuario que acaba de firmar
                                io.to(`sala_${userDni}`).emit('actualizar_paneles');

                                // 2. Notificar al creador del documento
                                if (doc.creador_dni) {
                                    io.to(`sala_${doc.creador_dni}`).emit('actualizar_paneles');
                                }

                                // 3. Flujo Intermedio (Documento aún pendiente)
                                if (nuevoEstado === 'pendiente') {
                                    if (!doc.tipo_flujo || doc.tipo_flujo === 'indistinto') {
                                        // Avisamos a todos los firmantes pendientes
                                        arrayFirmantesTotal.forEach(dni => {
                                            if (!arrayFirmados.includes(dni)) {
                                                io.to(`sala_${dni}`).emit('actualizar_paneles');
                                            }
                                        });
                                    } else if (doc.tipo_flujo === 'secuencial') {
                                        // Avisamos de inmediato al SIGUIENTE firmante de la cola
                                        const siguienteDni = arrayFirmantesTotal.find(dni => !arrayFirmados.includes(dni));
                                        if (siguienteDni) {
                                            io.to(`sala_${siguienteDni}`).emit('actualizar_paneles');
                                        }
                                    }
                                }

                                // 4. Circuito Finalizado: Actualizar paneles de todos los participantes
                                if (nuevoEstado === 'finalizado') {
                                    arrayFirmantesTotal.forEach(dni => {
                                        if (dni !== userDni) {
                                            io.to(`sala_${dni}`).emit('actualizar_paneles');
                                        }
                                    });
                                }
                            }

                            return res.json({ success: true, message: 'Firma procesada y guardada correctamente.' });
                        }
                    );
                }
            );
        };

        // Comprobamos si se ha alcanzado la totalidad de firmas requeridas
        if (nuevoEstado === 'finalizado') {
            if (!csvGenerado) csvGenerado = generarCSV('SABI');

            const placeholders = arrayFirmantesTotal.map(() => '?').join(', ');
            db.all(`SELECT dni, nombre, apellidos, cargo FROM usuarios WHERE dni IN (${placeholders})`, arrayFirmantesTotal, async (errDb, rows) => {
                let rutaDefinitivaDocumento = rutaDestino;

                if (!errDb && rows) {
                    try {
                        // ✅ Usamos arrayFirmados para maquetar respetando el orden cronológico real de firmas
                        const firmantesParaMaquetar = arrayFirmados.map(dni => {
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
                        console.log(`✅ Copia Auténtica generada con orden real de firmas: ${rutaOutput}`);

                        rutaDefinitivaDocumento = rutaOutput;

                        // ✉️ ENVÍO A DESTINATARIOS EXTERNOS
                        let externos = [];
                        try { if (doc.destinatarios_externos) externos = JSON.parse(doc.destinatarios_externos); } catch (e) { }
                        externos.forEach(ext => {
                            if (ext.email) enviarCopiaFinal(ext.email, doc.nombre, ext.mensaje || doc.mensaje_final, rutaOutput, documentoId);
                        });

                        // ✉️ AVISO AL CREADOR DEL EXPEDIENTE
                        if (doc.aviso_creador === 1 && doc.creador_dni) {
                            db.get(`SELECT email FROM usuarios WHERE dni = ?`, [doc.creador_dni], (eCr, rCr) => {
                                if (!eCr && rCr && rCr.email) enviarAlertaFinalizacion(rCr.email, doc.nombre, documentoId);
                            });
                        }

                        // ✉️ ENVÍO A PERSONAL INTERNO
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
                                confirmarYResponder(rutaDefinitivaDocumento);
                            });
                            return;
                        }

                    } catch (errMaq) {
                        console.error('❌ Error generando la Copia Auténtica visual:', errMaq);
                    }
                }

                confirmarYResponder(rutaDefinitivaDocumento);
            });
        } else {
            // FLUJO INTERMEDIO: Si es secuencial, notificamos por correo al siguiente firmante
            if (doc.tipo_flujo === 'secuencial') {
                const siguienteDni = arrayFirmantesTotal.find(dni => !arrayFirmados.includes(dni));
                if (siguienteDni) {
                    try {
                        enviarAvisoFirma(siguienteDni, doc.nombre, documentoId);
                    } catch (errEnvio) {
                        console.error('❌ Error enviando correo en cascada secuencial:', errEnvio);
                    }
                }
            }

            confirmarYResponder(rutaDestino);
        }
    });
});

module.exports = router;