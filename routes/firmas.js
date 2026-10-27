const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../database');

const { generarCopiaAutentica } = require('../utils/preparar');
const { generarCSV } = require('../utils/cryptoUtils');
const { enviarAvisoFirma, enviarCopiaFinal, enviarAlertaFinalizacion } = require('../config/mailer');
const { firmarDocumentosXAdES } = require('../services/xadesService');
const { generarManifiestoXML } = require('../utils/xmlGenerator');

// Almacén temporal en memoria para los lotes pendientes (guarda el XML y el DNI del usuario)
const lotesTemporales = new Map();

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
<<<<<<< HEAD
// 2. 📦 PREPARAR LOTE DE FIRMAS
=======
// 2. 📦 PREPARAR LOTE DE FIRMAS (Generación XML Cruda y Pura)
>>>>>>> 7101aa46e0dedaeede8a2c9cbf9db644e5179dcf
// =====================================================================
router.post('/preparar-lote', (req, res) => {
    const { ids } = req.body;
    const userDni = req.body.dni || req.session?.usuario?.dni;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Lista de IDs no válida o vacía.' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT id, nombre, archivo_original, archivo_firmado FROM documentos WHERE id IN (${placeholders})`;

    db.all(sql, ids, (err, docs) => {
        if (err || !docs || docs.length === 0) {
            return res.status(404).json({ success: false, error: 'No se encontraron los documentos solicitados.' });
        }

        try {
            const extraParamsString = "signatureProfile=PAdES-B"; 
            const extraParamsBase64 = Buffer.from(extraParamsString).toString('base64');

            let itemsXml = '';
            let procesados = 0;

            for (const doc of docs) {
                const archivoALeer = doc.archivo_firmado ? doc.archivo_firmado : doc.archivo_original;
                const rutaPdf = path.resolve(archivoALeer);

<<<<<<< HEAD
                if (!fs.existsSync(rutaPdf)) continue;
=======
                if (!fs.existsSync(rutaPdf)) {
                    console.warn(`⚠️ Archivo no encontrado para lote (Doc ID: ${doc.id})`);
                    continue;
                }
>>>>>>> 7101aa46e0dedaeede8a2c9cbf9db644e5179dcf

                const pdfBase64 = fs.readFileSync(rutaPdf, { encoding: 'base64' }).replace(/\s/g, '');

<<<<<<< HEAD
                itemsXml += `
        <sign id="${doc.id}">
            <datasource>${pdfBase64}</datasource>
            <format>PDF</format>
            <suboperation>sign</suboperation>
            <extraparams>${extraParamsBase64}</extraparams>
        </sign>`;
=======
                // XML Oficial @Firma: Sin atributos raros. ID limpio ("d" + número).
                itemsXml += `<sign id="d${doc.id}">
<datasource>${pdfBase64}</datasource>
<format>PAdES</format>
<extraparams>${extraParamsBase64}</extraparams>
</sign>\n`;
>>>>>>> 7101aa46e0dedaeede8a2c9cbf9db644e5179dcf
                procesados++;
            }

            if (procesados === 0) {
                return res.status(400).json({ success: false, error: 'Ninguno de los archivos físicos existe en el servidor.' });
            }

<<<<<<< HEAD
            const batchXml = `<?xml version="1.0" encoding="UTF-8"?>
<signbatch stoponerror="false">${itemsXml}
</signbatch>`;

            const batchToken = crypto.randomUUID();
            lotesTemporales.set(batchToken, { batchXml, userDni });

            setTimeout(() => lotesTemporales.delete(batchToken), 300000);
=======
            // Raíz limpia. Ni un solo atributo extra en signbatch.
            const batchXml = `<?xml version="1.0" encoding="UTF-8"?>\n<signbatch stoponerror="false">\n${itemsXml}</signbatch>`;
            
            // Generamos el Base64 puro sin saltos de línea
            const xmlBatchBase64 = Buffer.from(batchXml, 'utf-8').toString('base64').replace(/\s/g, '');
>>>>>>> 7101aa46e0dedaeede8a2c9cbf9db644e5179dcf

            // Devolvemos AMBOS formatos para que el frontend pueda elegir el correcto
            res.json({
                success: true,
<<<<<<< HEAD
                batchToken: batchToken,
=======
                xmlBatchBase64: xmlBatchBase64,
                xmlBatchRaw: batchXml,
>>>>>>> 7101aa46e0dedaeede8a2c9cbf9db644e5179dcf
                totalDocs: procesados
            });

        } catch (error) {
            console.error("❌ Error construyendo el lote XML:", error);
            res.status(500).json({ success: false, error: "Error al construir el paquete de firma." });
        }
    });
});

router.get('/servir-lote/:token', (req, res) => {
    const token = req.params.token;
    if (!token || !lotesTemporales.has(token)) {
        return res.status(404).send("Lote no encontrado o expirado.");
    }
    const data = lotesTemporales.get(token);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(data.batchXml);
});

// =====================================================================
// 3. 📥 RECIBIR FIRMA INDIVIDUAL
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

        db.get("SELECT nombre, apellidos, cargo FROM usuarios WHERE dni = ?", [userDni], (errUser, usuario) => {
            const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Firmante Autorizado';
            const cargoUsuario = usuario ? usuario.cargo : 'Firmante';
            const uuidFirma = crypto.randomUUID();
            const fechaActual = new Date().toISOString();

            let xmlContenido = req.body.xml_firma || req.body.firmaXml || req.body.xml || null;
            if (!xmlContenido && req.body.xmlBase64) {
                try {
                    xmlContenido = Buffer.from(req.body.xmlBase64, 'base64').toString('utf-8');
                } catch (eXml) {
                    console.error('❌ Error al decodificar xmlBase64:', eXml.message);
                }
            }

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
                } catch (errGenXml) {
                    console.error('❌ Error al generar el manifiesto XML:', errGenXml.message);
                }
            }

            let rutaXmlGuardada = null;
            if (xmlContenido) {
                const nombreArchivoXml = `firma_${uuidFirma}.xml`;
                rutaXmlGuardada = path.join('uploads', nombreArchivoXml);
                try {
                    fs.writeFileSync(rutaXmlGuardada, xmlContenido, 'utf-8');
                } catch (errXmlFs) {
                    console.error('❌ Error guardando el archivo XML en disco:', errXmlFs);
                }
            }

            const sqlEvidencia = `
                INSERT INTO firmas_evidencias (
                    documento_id, usuario_dni, nombre_firmante, cargo, uuid, fecha_firma, xml_firma, archivo_xml
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(sqlEvidencia, [
                documentoId, userDni, nombreCompleto, cargoUsuario, uuidFirma, fechaActual, xmlContenido, rutaXmlGuardada
            ], function (errEvidencia) {
                let arrayFirmados = doc.firmados_por ? doc.firmados_por.split(',').map(d => d.trim()).filter(Boolean) : [];
                if (!arrayFirmados.includes(userDni)) arrayFirmados.push(userDni);
                const stringFirmados = arrayFirmados.join(',');

                const arrayFirmantesTotal = doc.firmantes ? doc.firmantes.split(',').map(d => d.trim()).filter(Boolean) : [];
                let nuevoEstado = 'pendiente';
                let csvGenerado = doc.csv || null;

                if (arrayFirmados.length >= arrayFirmantesTotal.length) {
                    nuevoEstado = 'finalizado';
                }

                const confirmarYResponder = (rutaPdfParaBD) => {
                    db.run("UPDATE documentos SET archivo_firmado = ?, firmados_por = ?, estado = ?, csv = ? WHERE id = ?",
                        [rutaPdfParaBD, stringFirmados, nuevoEstado, csvGenerado, documentoId],
                        function (errUpdate) {
                            if (errUpdate) return res.status(500).json({ success: false, error: 'Fallo al actualizar BD.' });

                            db.run("INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) VALUES (?, ?, 'FIRMA REALIZADA', ?)",
                                [documentoId, userDni, `Firma PAdES registrada. Estado: ${nuevoEstado}. UUID: ${uuidFirma}`],
                                function () {
                                    const io = req.app.get('io');
                                    if (io) {
                                        io.to(`sala_${userDni}`).emit('actualizar_paneles');
                                        if (doc.creador_dni) io.to(`sala_${doc.creador_dni}`).emit('actualizar_paneles');
                                    }
                                    return res.json({ success: true, message: 'Firma procesada y guardada correctamente.' });
                                }
                            );
                        }
                    );
                };

                if (nuevoEstado === 'finalizado') {
                    if (!csvGenerado) csvGenerado = generarCSV('SABI');

                    db.all("SELECT * FROM firmas_evidencias WHERE documento_id = ? ORDER BY fecha_firma ASC", [documentoId], async (errEvs, evidencias) => {
                        let rutaDefinitivaDocumento = rutaDestino;

                        if (!errEvs && evidencias && evidencias.length > 0) {
                            try {
                                const firmantesParaMaquetar = evidencias.map(ev => ({
                                    nombre: ev.nombre_firmante, cargo: ev.cargo, fecha: ev.fecha_firma, uuid: ev.uuid
                                }));

                                const rutaOutput = path.join('uploads', `copia_autentica_${documentoId}.pdf`);
                                await generarCopiaAutentica(rutaDestino, rutaOutput, firmantesParaMaquetar, {
                                    csv: csvGenerado, referencia: `DOC-${documentoId}`, nombre: doc.nombre
                                });

                                rutaDefinitivaDocumento = rutaOutput;

                                let externos = [];
                                try { if (doc.destinatarios_externos) externos = JSON.parse(doc.destinatarios_externos); } catch (e) { }
                                externos.forEach(ext => {
                                    if (ext.email) enviarCopiaFinal(ext.email, doc.nombre, ext.mensaje || doc.mensaje_final, rutaOutput, documentoId);
                                });

                                if (doc.aviso_creador === 1 && doc.creador_dni) {
                                    db.get(`SELECT email FROM usuarios WHERE dni = ?`, [doc.creador_dni], (eCr, rCr) => {
                                        if (!eCr && rCr && rCr.email) enviarAlertaFinalizacion(rCr.email, doc.nombre, documentoId);
                                    });
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
                            try { enviarAvisoFirma(siguienteDni, doc.nombre, documentoId); } catch (e) {}
                        }
                    }
                    confirmarYResponder(rutaDestino);
                }
            });
        });
    });
});

// =====================================================================
<<<<<<< HEAD
// 4. 📥 RECIBIR LOTE DE FIRMAS
=======
// 4. 📥 RECIBIR LOTE DE FIRMAS (Desempaqueta el XML)
>>>>>>> 7101aa46e0dedaeede8a2c9cbf9db644e5179dcf
// =====================================================================
router.post('/recibir-lote/:token', async (req, res) => {
    const token = req.params.token;
    const loteData = lotesTemporales.get(token);
    const userDni = loteData ? loteData.userDni : (req.session?.usuario?.dni || req.body.dni);

    let xmlResultBase64 = req.body.xmlResultBase64 || req.body.xmlResult || req.body.signature || req.body.result;

    if (!xmlResultBase64) {
        if (typeof req.body === 'string') {
            xmlResultBase64 = req.body;
        } else if (Buffer.isBuffer(req.body)) {
            xmlResultBase64 = req.body.toString('utf-8');
        } else if (req.body && typeof req.body === 'object') {
            const keys = Object.keys(req.body);
            const possibleKey = keys.find(k => k.trim().startsWith('<') || k.length > 100);
            if (possibleKey) xmlResultBase64 = possibleKey;
        }
    }

    if (!xmlResultBase64 || !userDni) {
<<<<<<< HEAD
        console.error("❌ Faltan parámetros en recibir-lote. Token:", token, "DNI:", userDni);
        return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos (xmlResultBase64 o DNI).' });
=======
        return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos.' });
>>>>>>> 7101aa46e0dedaeede8a2c9cbf9db644e5179dcf
    }

    try {
        let xmlString = xmlResultBase64;
        if (!xmlResultBase64.trim().startsWith('<')) {
            try {
                xmlString = Buffer.from(xmlResultBase64, 'base64').toString('utf-8');
            } catch (e) {}
        }

<<<<<<< HEAD
        const itemRegex = /<sign\s+id=["']([^"']+)["'][^>]*>(.*?)<\/sign>/gs;
=======
        // CAMBIO CRÍTICO: Regex a prueba de bombas para capturar el ID pase lo que pase
        // Captura cualquier número que venga dentro del id="..."
        const itemRegex = /<sign\s+id=["'][^0-9]*(\d+)["'][^>]*>(.*?)<\/sign>/gs;
>>>>>>> 7101aa46e0dedaeede8a2c9cbf9db644e5179dcf
        let match;
        const resultadosLote = [];

        while ((match = itemRegex.exec(xmlString)) !== null) {
            const docId = parseInt(match[1], 10);
            const itemContent = match[2];

            const isError = /status=["'](error|BERR|false)["']/i.test(match[0]);
            const resultMatch = /<result>(.*?)<\/result>/s.exec(itemContent);
            const base64Firmado = resultMatch ? resultMatch[1].trim() : null;

            if (!isError && base64Firmado && !isNaN(docId)) {
                resultadosLote.push({ id: docId, base64: base64Firmado });
            }
        }

        if (resultadosLote.length === 0) {
            return res.status(400).json({ success: false, error: 'No se encontraron documentos válidos firmados en la respuesta del lote.' });
        }

        const procesarDoc = (item) => {
            return new Promise((resolve) => {
                const documentoId = item.id;
                const archivoBase64 = item.base64;

                db.get("SELECT * FROM documentos WHERE id = ?", [documentoId], async (err, doc) => {
                    if (err || !doc) return resolve({ id: documentoId, success: false, error: 'Documento no encontrado' });

                    const pdfBuffer = Buffer.from(archivoBase64, 'base64');
                    const nombreArchivoFirmado = `firmado_${Date.now()}_doc_${documentoId}.pdf`;
                    const rutaDestino = path.join('uploads', nombreArchivoFirmado);

                    try {
                        fs.writeFileSync(rutaDestino, pdfBuffer);
                    } catch (errFs) {
                        return resolve({ id: documentoId, success: false, error: 'Error al escribir PDF' });
                    }

                    db.get("SELECT nombre, apellidos, cargo FROM usuarios WHERE dni = ?", [userDni], (errUser, usuario) => {
                        const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Firmante Autorizado';
                        const cargoUsuario = usuario ? usuario.cargo : 'Firmante';
                        const uuidFirma = crypto.randomUUID();
                        const fechaActual = new Date().toISOString();

                        let xmlContenido = null;
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
                        } catch (eXml) {}

                        let rutaXmlGuardada = null;
                        if (xmlContenido) {
                            const nombreXml = `firma_${uuidFirma}.xml`;
                            rutaXmlGuardada = path.join('uploads', nombreXml);
                            try { fs.writeFileSync(rutaXmlGuardada, xmlContenido, 'utf-8'); } catch (e) {}
                        }

                        db.run(`
                            INSERT INTO firmas_evidencias (
                                documento_id, usuario_dni, nombre_firmante, cargo, uuid, fecha_firma, xml_firma, archivo_xml
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            documentoId, userDni, nombreCompleto, cargoUsuario, uuidFirma, fechaActual, xmlContenido, rutaXmlGuardada
                        ], function (errEv) {

                            let arrayFirmados = doc.firmados_por ? doc.firmados_por.split(',').map(d => d.trim()).filter(Boolean) : [];
                            if (!arrayFirmados.includes(userDni)) arrayFirmados.push(userDni);
                            const stringFirmados = arrayFirmados.join(',');

                            const arrayFirmantesTotal = doc.firmantes ? doc.firmantes.split(',').map(d => d.trim()).filter(Boolean) : [];
                            let nuevoEstado = (arrayFirmados.length >= arrayFirmantesTotal.length) ? 'finalizado' : 'pendiente';
                            let csvGenerado = doc.csv || null;

                            const finalizarProcesoDoc = (rutaPdfBD) => {
                                db.run("UPDATE documentos SET archivo_firmado = ?, firmados_por = ?, estado = ?, csv = ? WHERE id = ?",
                                    [rutaPdfBD, stringFirmados, nuevoEstado, csvGenerado, documentoId],
                                    function (errUpd) {
                                        if (errUpd) return resolve({ id: documentoId, success: false, error: 'Fallo al actualizar BD' });

                                        db.run("INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) VALUES (?, ?, 'FIRMA REALIZADA', ?)",
                                            [documentoId, userDni, `Firma PAdES en Lote. Estado: ${nuevoEstado}. UUID: ${uuidFirma}`],
                                            function () {
                                                const io = req.app.get('io');
                                                if (io) {
                                                    io.to(`sala_${userDni}`).emit('actualizar_paneles');
                                                    if (doc.creador_dni) io.to(`sala_${doc.creador_dni}`).emit('actualizar_paneles');
                                                }
                                                resolve({ id: documentoId, success: true });
                                            }
                                        );
                                    }
                                );
                            };

                            if (nuevoEstado === 'finalizado') {
                                if (!csvGenerado) csvGenerado = generarCSV('SABI');

                                db.all("SELECT * FROM firmas_evidencias WHERE documento_id = ? ORDER BY fecha_firma ASC", [documentoId], async (errEvs, evidencias) => {
                                    let rutaDefinitiva = rutaDestino;
                                    if (!errEvs && evidencias && evidencias.length > 0) {
                                        try {
                                            const firmantesParaMaquetar = evidencias.map(ev => ({
                                                nombre: ev.nombre_firmante, cargo: ev.cargo, fecha: ev.fecha_firma, uuid: ev.uuid
                                            }));
                                            const rutaOutput = path.join('uploads', `copia_autentica_${documentoId}.pdf`);
                                            await generarCopiaAutentica(rutaDestino, rutaOutput, firmantesParaMaquetar, {
                                                csv: csvGenerado, referencia: `DOC-${documentoId}`, nombre: doc.nombre
                                            });
                                            rutaDefinitiva = rutaOutput;
                                        } catch (eMaq) {}
                                    }
                                    finalizarProcesoDoc(rutaDefinitiva);
                                });
                            } else {
                                finalizarProcesoDoc(rutaDestino);
                            }
                        });
                    });
                });
            });
        };

        const resultados = await Promise.all(resultadosLote.map(procesarDoc));
        const completados = resultados.filter(r => r.success);

        lotesTemporales.delete(token);

        return res.json({
            success: true,
            totalRecibidos: resultadosLote.length,
            totalProcesados: completados.length,
            detalles: resultados
        });

    } catch (errGlobal) {
        console.error("❌ Error procesando respuesta de lote:", errGlobal);
        return res.status(500).json({ success: false, error: "Error interno al desempaquetar la firma por lote." });
    }
});

// =====================================================================
// 5. 🔐 GENERAR MANIFIESTO FIRMADO XAdES-BES
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