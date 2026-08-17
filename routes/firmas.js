const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../database');

// Importamos utilidades, mailer, el servicio XAdES y el generador de manifiestos XML
const { generarCopiaAutentica } = require('../utils/preparar');
const { generarCSV } = require('../utils/cryptoUtils');
const { enviarAvisoFirma, enviarCopiaFinal, enviarAlertaFinalizacion } = require('../config/mailer');
const { firmarDocumentosXAdES } = require('../services/xadesService');
const { generarManifiestoXML } = require('../utils/xmlGenerator');

// =====================================================================
// 1. 📤 OBTENER DOCUMENTO (Para visor o cliente de AutoFirma)
// =====================================================================
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

// =====================================================================
// 2. 📥 RECIBIR FIRMA (Registro de evidencia, avance y Socket.io)
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

        // Obtener datos del firmante actual para registrar su evidencia única
        db.get("SELECT nombre, apellidos, cargo FROM usuarios WHERE dni = ?", [userDni], (errUser, usuario) => {
            const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Firmante Autorizado';
            const cargoUsuario = usuario ? usuario.cargo : 'Firmante';
            const uuidFirma = crypto.randomUUID();
            const fechaActual = new Date().toISOString();

            // 🛡️ 1. Extraer XML enviado desde el cliente (si estuviese presente)
            let xmlContenido = req.body.xml_firma || req.body.firmaXml || req.body.xml || null;
            if (!xmlContenido && req.body.xmlBase64) {
                try {
                    xmlContenido = Buffer.from(req.body.xmlBase64, 'base64').toString('utf-8');
                } catch (eXml) {
                    console.error('❌ Error al decodificar xmlBase64:', eXml.message);
                }
            }

            // 🛡️ 2. GENERACIÓN AUTOMÁTICA DEL MANIFIESTO XML (si el cliente no envió uno)
            if (!xmlContenido) {
                try {
                    xmlContenido = generarManifiestoXML({
                        uuid: uuidFirma,
                        documentoId: documentoId,
                        userDni: userDni,
                        nombreFirmante: nombreCompleto,
                        cargo: cargoUsuario,
                        fechaFirma: fechaActual,
                        pdfBuffer: pdfBuffer
                    });
                    console.log(`📄 Manifiesto XML generado en servidor para Doc #${documentoId} (UUID: ${uuidFirma})`);
                } catch (errGenXml) {
                    console.error('❌ Error al generar el manifiesto XML:', errGenXml.message);
                }
            }

            // 🛡️ 3. Guardar el archivo XML físico en disco
            let rutaXmlGuardada = null;
            if (xmlContenido) {
                const nombreArchivoXml = `firma_${uuidFirma}.xml`;
                rutaXmlGuardada = path.join('uploads', nombreArchivoXml);
                try {
                    fs.writeFileSync(rutaXmlGuardada, xmlContenido, 'utf-8');
                    console.log(`📄 Archivo XML guardado correctamente en: ${rutaXmlGuardada}`);
                } catch (errXmlFs) {
                    console.error('❌ Error guardando el archivo XML en disco:', errXmlFs);
                }
            }

            // 1. REGISTRAR EVIDENCIA DE FIRMA CON UUID Y XML
            const sqlEvidencia = `
                INSERT INTO firmas_evidencias (
                    documento_id, usuario_dni, nombre_firmante, cargo, uuid, fecha_firma, xml_firma, archivo_xml
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(sqlEvidencia, [
                documentoId, userDni, nombreCompleto, cargoUsuario, uuidFirma, fechaActual, xmlContenido, rutaXmlGuardada
            ], function (errEvidencia) {
                if (errEvidencia) {
                    console.error('❌ Error guardando evidencia de firma:', errEvidencia.message);
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

                // 🚀 FUNCIÓN DE CIERRE: Actualiza BD, emite eventos y responde al cliente
                const confirmarYResponder = (rutaPdfParaBD) => {
                    db.run("UPDATE documentos SET archivo_firmado = ?, firmados_por = ?, estado = ?, csv = ? WHERE id = ?",
                        [rutaPdfParaBD, stringFirmados, nuevoEstado, csvGenerado, documentoId],
                        function (errUpdate) {
                            if (errUpdate) return res.status(500).json({ success: false, error: 'Fallo al actualizar BD.' });

                            db.run("INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) VALUES (?, ?, 'FIRMA REALIZADA', ?)",
                                [documentoId, userDni, `Firma LTV registrada. Estado: ${nuevoEstado}. UUID: ${uuidFirma}`],
                                function (errAudit) {
                                    console.log(`✅ Firma registrada: Doc #${documentoId} firmado por DNI ${userDni} (UUID: ${uuidFirma})`);

                                    const io = req.app.get('io');
                                    if (io) {
                                        io.to(`sala_${userDni}`).emit('actualizar_paneles');
                                        if (doc.creador_dni) io.to(`sala_${doc.creador_dni}`).emit('actualizar_paneles');

                                        if (nuevoEstado === 'pendiente') {
                                            if (!doc.tipo_flujo || doc.tipo_flujo === 'indistinto') {
                                                arrayFirmantesTotal.forEach(dni => {
                                                    if (!arrayFirmados.includes(dni)) io.to(`sala_${dni}`).emit('actualizar_paneles');
                                                });
                                            } else if (doc.tipo_flujo === 'secuencial') {
                                                const siguienteDni = arrayFirmantesTotal.find(dni => !arrayFirmados.includes(dni));
                                                if (siguienteDni) io.to(`sala_${siguienteDni}`).emit('actualizar_paneles');
                                            }
                                        }

                                        if (nuevoEstado === 'finalizado') {
                                            arrayFirmantesTotal.forEach(dni => {
                                                if (dni !== userDni) io.to(`sala_${dni}`).emit('actualizar_paneles');
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

                    // Recuperar todas las evidencias ordenadas por fecha de firma para maquetar los QR
                    db.all("SELECT * FROM firmas_evidencias WHERE documento_id = ? ORDER BY fecha_firma ASC", [documentoId], async (errEvs, evidencias) => {
                        let rutaDefinitivaDocumento = rutaDestino;

                        if (!errEvs && evidencias && evidencias.length > 0) {
                            try {
                                const firmantesParaMaquetar = evidencias.map(ev => ({
                                    nombre: ev.nombre_firmante,
                                    cargo: ev.cargo,
                                    fecha: ev.fecha_firma,
                                    uuid: ev.uuid
                                }));

                                const rutaOutput = path.join('uploads', `copia_autentica_${documentoId}.pdf`);
                                await generarCopiaAutentica(rutaDestino, rutaOutput, firmantesParaMaquetar, {
                                    csv: csvGenerado, referencia: `DOC-${documentoId}`, nombre: doc.nombre
                                });
                                console.log(`✅ Copia Auténtica con QR interactivos generada: ${rutaOutput}`);

                                rutaDefinitivaDocumento = rutaOutput;

                                // Envío a destinatarios externos
                                let externos = [];
                                try { if (doc.destinatarios_externos) externos = JSON.parse(doc.destinatarios_externos); } catch (e) { }
                                externos.forEach(ext => {
                                    if (ext.email) enviarCopiaFinal(ext.email, doc.nombre, ext.mensaje || doc.mensaje_final, rutaOutput, documentoId);
                                });

                                // Aviso al creador del expediente
                                if (doc.aviso_creador === 1 && doc.creador_dni) {
                                    db.get(`SELECT email FROM usuarios WHERE dni = ?`, [doc.creador_dni], (eCr, rCr) => {
                                        if (!eCr && rCr && rCr.email) enviarAlertaFinalizacion(rCr.email, doc.nombre, documentoId);
                                    });
                                }

                                // Envío a personal interno
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
    });
});

// =====================================================================
// 3. 🔐 GENERAR MANIFIESTO FIRMADO XAdES-BES (Solo si hay certificado de servidor explícito)
// =====================================================================
router.post('/generar-xades', async (req, res) => {
    const documentoId = req.body.documentoId ? parseInt(req.body.documentoId, 10) : null;

    if (!documentoId) {
        return res.status(400).json({ success: false, error: 'Se requiere documentoId.' });
    }

    const certPath = process.env.CERT_PATH;
    if (!certPath || !fs.existsSync(certPath)) {
        return res.status(500).json({ success: false, error: 'No hay un certificado de servidor configurado en CERT_PATH.' });
    }

    db.get("SELECT * FROM documentos WHERE id = ?", [documentoId], async (err, doc) => {
        if (err || !doc) return res.status(404).json({ success: false, error: 'Documento no encontrado.' });

        const archivoALeer = doc.archivo_firmado ? doc.archivo_firmado : doc.archivo_original;
        const rutaPdf = path.resolve(archivoALeer);

        if (!fs.existsSync(rutaPdf)) {
            return res.status(404).json({ success: false, error: 'El archivo PDF no existe en el servidor.' });
        }

        try {
            const archivos = [
                { nombre: doc.nombre || path.basename(rutaPdf), path: rutaPdf }
            ];

            const certPassword = process.env.CERT_PASSWORD || '';
            const xmlFirmado = await firmarDocumentosXAdES(archivos, certPath, certPassword);

            // Guardar manifiesto firmado en disk
            const nombreXml = `manifiesto_xades_${documentoId}_${Date.now()}.xml`;
            const rutaXml = path.join('uploads', nombreXml);
            fs.writeFileSync(rutaXml, xmlFirmado, 'utf-8');

            return res.json({
                success: true,
                message: 'Manifiesto XAdES-BES generado correctamente.',
                archivoXml: rutaXml,
                xml: xmlFirmado
            });
        } catch (errorXades) {
            console.error('❌ Error generando firma XAdES-BES:', errorXades);
            return res.status(500).json({ success: false, error: 'Error al generar la firma XAdES-BES.' });
        }
    });
});

module.exports = router;