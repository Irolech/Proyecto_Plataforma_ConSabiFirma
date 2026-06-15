const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 🛠️ PATH AJUSTADO: Asegura el uso de la BD con la tabla 'notificaciones'
const db = require('../database');

// 🚀 Importamos las utilidades necesarias
const { generarCopiaAutentica } = require('../utils/preparar');
const { generarCSV } = require('../utils/cryptoUtils');

// ✉️ Importamos el motor de correos completo (Añadido enviarAlertaFinalizacion)
const { enviarAvisoFirma, enviarCopiaFinal, enviarAlertaFinalizacion } = require('../config/mailer');

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

    // 🛡️ Saneamos los parámetros de entrada eliminando espacios y asegurando el tipo numérico
    const documentoId = req.query.documentoId ? parseInt(req.query.documentoId, 10) : null;
    const userDni = req.query.dni ? req.query.dni.trim() : null;

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

            // 🛡️ Limpieza estricta de los DNI que ya han firmado
            let arrayFirmados = doc.firmados_por
                ? doc.firmados_por.split(',').map(d => d.trim()).filter(d => d !== '')
                : [];

            if (!arrayFirmados.includes(userDni)) {
                arrayFirmados.push(userDni);
            }
            const stringFirmados = arrayFirmados.join(',');

            // 🛡️ Limpieza estricta de la lista completa de firmantes requeridos
            const arrayFirmantesTotal = doc.firmantes
                ? doc.firmantes.split(',').map(d => d.trim()).filter(d => d !== '')
                : [];

            let nuevoEstado = 'pendiente';
            let csvGenerado = doc.csv || null;

            // Verificamos si ya han firmado todos
            if (arrayFirmados.length >= arrayFirmantesTotal.length) {
                nuevoEstado = 'finalizado';

                if (!csvGenerado) {
                    csvGenerado = generarCSV('SABI');
                }

                try {
                    const placeholders = arrayFirmantesTotal.map(() => '?').join(', ');
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

                        console.log(`✅ Copia Auténtica generada con éxito: ${rutaOutput}`);

                        // =========================================================================
                        // 🚀 REPARTO AUTOMÁTICO DE COPIAS AUTÉNTICAS Y AVISOS DE FINALIZACIÓN
                        // =========================================================================

                        // 1. REPARTO A EXTERNOS (CC)
                        let externos = [];
                        try { if (doc.destinatarios_externos) externos = JSON.parse(doc.destinatarios_externos); } catch (e) { console.error("Error parseando externos", e); }

                        externos.forEach(ext => {
                            if (ext.email) {
                                // Usamos el mensaje específico o caemos en el mensaje común del documento
                                const mensajeAUsar = ext.mensaje || doc.mensaje_final;
                                enviarCopiaFinal(ext.email, doc.nombre, mensajeAUsar, rutaOutput, documentoId);
                            }
                        });

                        // 2. REPARTO A INTERNOS (CC)
                        let internos = [];
                        try { if (doc.destinatarios_internos) internos = JSON.parse(doc.destinatarios_internos); } catch (e) { console.error("Error parseando internos", e); }

                        if (internos.length > 0) {
                            const dnisInternos = internos.map(i => i.dni);
                            const placeholdersInt = dnisInternos.map(() => '?').join(',');

                            // Transformamos los DNI en emails consultando la BD
                            db.all(`SELECT dni, email FROM usuarios WHERE dni IN (${placeholdersInt})`, dnisInternos, (errInt, rowsInt) => {
                                if (!errInt && rowsInt) {
                                    internos.forEach(int => {
                                        const usuarioDb = rowsInt.find(r => r.dni === int.dni);
                                        if (usuarioDb && usuarioDb.email) {
                                            const mensajeAUsar = int.mensaje || doc.mensaje_final;
                                            enviarCopiaFinal(usuarioDb.email, doc.nombre, mensajeAUsar, rutaOutput, documentoId);
                                        }
                                    });
                                }
                            });
                        }

                        // 3. 🚀 NUEVO: AVISO AL CREADOR DEL DOCUMENTO
                        if (doc.aviso_creador === 1 && doc.creador_dni) {
                            db.get(`SELECT email FROM usuarios WHERE dni = ?`, [doc.creador_dni], (errCreador, creadorDb) => {
                                if (!errCreador && creadorDb && creadorDb.email) {
                                    console.log(`✉️ El creador solicitó aviso. Notificando a ${creadorDb.email}`);
                                    enviarAlertaFinalizacion(creadorDb.email, doc.nombre, documentoId);
                                } else {
                                    console.log(`⚠️ No se pudo notificar al creador (DNI: ${doc.creador_dni}): Email no encontrado o error en BD.`);
                                }
                            });
                        }
                        // =========================================================================
                    });
                } catch (errorMaquetacion) {
                    console.error('❌ Error al generar la Copia Auténtica visual:', errorMaquetacion);
                }
            } else {
                // ✉️ Flujo en cascada: Buscamos al siguiente firmante en la lista limpia
                const siguienteFirmanteDni = arrayFirmantesTotal.find(dni => !arrayFirmados.includes(dni));

                if (siguienteFirmanteDni) {
                    console.log(`✉️ Turno del siguiente firmante. Gatillando notificación para el DNI: ${siguienteFirmanteDni}`);
                    try {
                        // Pasamos el documentoId ya convertido a número de forma segura
                        enviarAvisoFirma(siguienteFirmanteDni, doc.nombre, documentoId);
                    } catch (errEnvio) {
                        console.error('❌ Error al disparar el correo en cascada:', errEnvio);
                    }
                }
            }

            // Guardamos el estado y la auditoría en la base de datos
            db.serialize(() => {
                db.run("UPDATE documentos SET archivo_firmado = ?, firmados_por = ?, estado = ?, csv = ? WHERE id = ?",
                    [rutaDestino, stringFirmados, nuevoEstado, csvGenerado, documentoId]);

                db.run("INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) VALUES (?, ?, 'FIRMA REALIZADA', ?)",
                    [documentoId, userDni, `Firma LTV aplicada con éxito. Estado: ${nuevoEstado}. CSV: ${csvGenerado || 'N/A'}`]);
            });

            console.log(`✅ Firma registrada correctamente: Doc #${documentoId} firmado por DNI ${userDni}`);
            return res.json({ success: true, message: 'Firma procesada y guardada correctamente.' });

        } catch (error) {
            console.error('❌ Error guardando la firma:', error);
            return res.status(500).json({ success: false, error: 'Fallo crítico al escribir el archivo en el servidor.' });
        }
    });
});

module.exports = router;