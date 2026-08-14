require('dotenv').config(); // 🛠️ Carga de variables de entorno (.env)
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const db = require('../database'); // 🔄 Apuntamos a database.js

// 🌍 URL Base de la plataforma para los botones de los correos electrónicos
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// 🛠️ CONFIGURACIÓN DE TRANSPORTE INTELIGENTE
const esProduccion = process.env.EMAIL_USER && process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport(
    esProduccion
        ? {
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // Tu app-password de 16 caracteres
            }
        }
        : {
            host: process.env.SMTP_HOST || 'localhost',
            port: process.env.SMTP_PORT || 1025,
            ignoreTLS: true
        }
);

if (esProduccion) {
    console.log('📧 Mailer configurado en modo PRODUCCIÓN (Gmail).');
} else {
    console.log('📧 Mailer configurado en modo DESARROLLO (Maildev - localhost:1025).');
}

/**
 * Envía un correo de aviso de firma, aplicando un diseño limpio y registrando la traza en la BD.
 */
const enviarAvisoFirma = (dni, nombreDoc, documentoId) => {
    if (!documentoId) {
        console.error(`❌ ERROR CRÍTICO EN MAILER: Se intentó enviar aviso a ${dni} para "${nombreDoc}", pero documentoId es nulo.`);
        return;
    }

    db.get("SELECT email, nombre FROM usuarios WHERE dni = ?", [dni], (err, user) => {
        if (err) {
            console.error("❌ Error al buscar datos de usuario para notificación:", err.message);
            return;
        }

        if (user && user.email) {
            const asunto = `[ConSabiFirma] Pendiente de firma: ${nombreDoc}`;
            const tipo = 'AVISO_FIRMA';
            const remitente = '"ConSabiFirma (No Responder)" <noreply-consabifirma@conservatorio.es>';

            const sqlInsert = `
                INSERT INTO notificaciones (documento_id, usuario_dni, email_destinatario, tipo, asunto)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.run(sqlInsert, [documentoId, dni, user.email, tipo, asunto], function (errInsert) {
                if (errInsert) {
                    console.error("❌ Error al registrar la traza de notificación en BD:", errInsert.message);
                    return;
                }

                const notificacionId = this.lastID;
                console.log(`✉️ Notificación #${notificacionId} registrada (PENDIENTE). Enviando...`);

                const mailOptions = {
                    from: remitente,
                    to: user.email,
                    subject: asunto,
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
                            <div style="background-color: #1a5276; padding: 20px; text-align: center; color: white;">
                                <h2 style="margin: 0; font-size: 20px;">Plataforma ConSabiFirma</h2>
                            </div>
                            <div style="padding: 25px; background-color: #ffffff;">
                                <p style="font-size: 16px; margin-top: 0;">Hola <strong>${user.nombre}</strong>,</p>
                                <p>Se ha generado un nuevo documento en el sistema que requiere tu firma electrónica:</p>
                                
                                <div style="background-color: #f4f6f7; border-left: 4px solid #1a5276; padding: 15px; margin: 20px 0; font-style: italic;">
                                    <strong>Documento:</strong> ${nombreDoc}
                                </div>
                                
                                <p>Por favor, accede a tu panel de usuario para proceder a su revisión y firma.</p>
                                
                                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                                    <a href="${BASE_URL}" style="background-color: #1a5276; color: white; padding: 12px 25px; text-align: center; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Acceder a ConSabiFirma</a>
                                </div>
                            </div>
                            <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #7f8c8d; border-top: 1px solid #eeeeee;">
                                <p style="margin: 0;">Conservatorio Profesional de Música de Sabiñánigo</p>
                                <p style="margin: 5px 0 0 0;">Este es un aviso automático desatendido. Por favor, no responda a esta dirección de correo.</p>
                            </div>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions, (errorMail, info) => {
                    if (errorMail) {
                        console.error(`❌ Error en el envío del email (Notificación #${notificacionId}):`, errorMail.message);
                        const sqlUpdateError = `
                            UPDATE notificaciones 
                            SET estado = 'FALLIDO', intentos = intentos + 1, error_log = ? 
                            WHERE id = ?
                        `;
                        db.run(sqlUpdateError, [errorMail.message, notificacionId]);
                        return;
                    }

                    console.log(`📧 Aviso de firma enviado con éxito a ${user.email} (Notificación #${notificacionId})`);
                    const sqlUpdateExito = `
                        UPDATE notificaciones 
                        SET estado = 'ENVIADO', intentos = intentos + 1, fecha_envio = (DATETIME('now', 'localtime'))
                        WHERE id = ?
                    `;
                    db.run(sqlUpdateExito, [notificacionId]);
                });
            });
        } else {
            console.log(`⚠️ No se pudo enviar el correo: El usuario con DNI ${dni} no existe o no tiene un email configurado.`);
        }
    });
};

/**
 * Envía la copia auténtica (documento finalizado) a un destinatario (interno o externo).
 */
const enviarCopiaFinal = (emailDestinatario, nombreDoc, mensajePersonalizado, archivoPath, documentoId) => {
    if (!emailDestinatario || !documentoId || !archivoPath) {
        console.error(`❌ ERROR CRÍTICO EN MAILER: Faltan datos para enviar la copia final de "${nombreDoc}". ID o email nulos.`);
        return;
    }

    // 1. Convertimos la ruta a absoluta para evitar resoluciones erróneas en el servidor
    const rutaAbsoluta = path.resolve(archivoPath);

    // 2. Comprobamos que el archivo realmente existe en disco
    if (!fs.existsSync(rutaAbsoluta)) {
        console.error(`❌ ERROR CRÍTICO EN MAILER: El archivo no existe en el disco: ${rutaAbsoluta}`);
        return;
    }

    // 3. Leemos el PDF en un Buffer y fijamos un nombre ASCII limpio para MailDev
    let pdfBuffer;
    try {
        pdfBuffer = fs.readFileSync(rutaAbsoluta);
    } catch (errRead) {
        console.error(`❌ ERROR Leyendo archivo PDF para adjunto:`, errRead);
        return;
    }

    const nombreAdjuntoMaildev = `copia_autentica_doc_${documentoId}.pdf`;

    const asunto = `El Conservatorio de Sabiñánigo envía el documento: ${nombreDoc}`;
    const tipo = 'DOCUMENTO_FINALIZADO';
    const remitente = '"ConSabiFirma (No Responder)" <noreply-consabifirma@conservatorio.es>';

    // 4. 📝 TRATAMIENTO MULTIPÁRRAFO INTELIGENTE
    const textoBase = (mensajePersonalizado && mensajePersonalizado.trim() !== '')
        ? mensajePersonalizado.trim()
        : `El Conservatorio Profesional de Música de Sabiñánigo le envía copia auténtica del documento: ${nombreDoc}.`;

    // Convertimos cada salto de línea en un párrafo HTML limpio
    const cuerpoFormateadoHTML = textoBase
        .split(/\r?\n+/)
        .map(p => `<p style="font-size: 15px; line-height: 1.6; color: #333333; margin-top: 0; margin-bottom: 15px;">${p.trim()}</p>`)
        .join('');

    const sqlInsert = `
        INSERT INTO notificaciones (documento_id, email_destinatario, tipo, asunto)
        VALUES (?, ?, ?, ?)
    `;

    db.run(sqlInsert, [documentoId, emailDestinatario, tipo, asunto], function (errInsert) {
        if (errInsert) {
            console.error("❌ Error al registrar traza de copia final en BD:", errInsert.message);
            return;
        }

        const notificacionId = this.lastID;
        console.log(`✉️ Notificación Copia Auténtica #${notificacionId} registrada (PENDIENTE). Enviando a ${emailDestinatario}...`);

        const mailOptions = {
            from: remitente,
            to: emailDestinatario,
            subject: asunto,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
                    <div style="background-color: #1a5276; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0; font-size: 20px;">Plataforma ConSabiFirma</h2>
                    </div>
                    <div style="padding: 25px; background-color: #ffffff;">
                        
                        <!-- SALUDO INICIAL -->
                        <p style="font-size: 15px; font-weight: bold; color: #1a5276; margin-top: 0; margin-bottom: 18px;">Buenos días:</p>
                        
                        <!-- CUERPO DE NOTA PERSONALIZADA (MULTINIVEL/MULTIPÁRRAFO) -->
                        ${cuerpoFormateadoHTML}
                        
                        <!-- BLOQUE DESTACADO DEL ADJUNTO -->
                        <div style="background-color: #f4f6f7; border-left: 4px solid #1a5276; padding: 15px; margin: 25px 0 15px 0; font-style: italic;">
                            <strong>📄 Documento adjunto:</strong> ${nombreDoc}.pdf
                        </div>
                        
                        <p style="font-size: 14px; color: #555; margin-bottom: 25px;">Puede descargar la copia auténtica del documento en los archivos adjuntos de este correo.</p>
                        
                        <!-- DESPEDIDA FORMAL -->
                        <p style="font-size: 15px; color: #333333; margin: 0;">Un saludo,</p>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #7f8c8d; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0;">Conservatorio Profesional de Música de Sabiñánigo</p>
                        <p style="margin: 5px 0 0 0;">Este es un mensaje automático del sistema de firmas. Por favor, no responda a esta dirección.</p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: nombreAdjuntoMaildev,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        transporter.sendMail(mailOptions, (errorMail, info) => {
            if (errorMail) {
                console.error(`❌ Error enviando copia final (Notificación #${notificacionId}):`, errorMail.message);
                const sqlUpdateError = `UPDATE notificaciones SET estado = 'FALLIDO', intentos = intentos + 1, error_log = ? WHERE id = ?`;
                db.run(sqlUpdateError, [errorMail.message, notificacionId]);
                return;
            }

            console.log(`✅ Copia auténtica enviada con éxito a ${emailDestinatario} (Notificación #${notificacionId})`);
            const sqlUpdateExito = `UPDATE notificaciones SET estado = 'ENVIADO', intentos = intentos + 1, fecha_envio = (DATETIME('now', 'localtime')) WHERE id = ?`;
            db.run(sqlUpdateExito, [notificacionId]);
        });
    });
};

/**
 * Envía una alerta al creador del documento informando que el circuito ha finalizado.
 */
const enviarAlertaFinalizacion = (emailDestinatario, nombreDoc, documentoId) => {
    if (!emailDestinatario || !documentoId) {
        console.error(`❌ ERROR CRÍTICO EN MAILER: Faltan datos para enviar la alerta de finalización de "${nombreDoc}".`);
        return;
    }

    const asunto = `[ConSabiFirma] Circuito Completado: ${nombreDoc}`;
    const tipo = 'ALERTA_CREADOR';
    const remitente = '"ConSabiFirma (No Responder)" <noreply-consabifirma@conservatorio.es>';

    const sqlInsert = `
        INSERT INTO notificaciones (documento_id, email_destinatario, tipo, asunto)
        VALUES (?, ?, ?, ?)
    `;

    db.run(sqlInsert, [documentoId, emailDestinatario, tipo, asunto], function (errInsert) {
        if (errInsert) {
            console.error("❌ Error al registrar traza de alerta creador en BD:", errInsert.message);
            return;
        }

        const notificacionId = this.lastID;
        console.log(`✉️ Alerta de Finalización #${notificacionId} registrada (PENDIENTE). Enviando a ${emailDestinatario}...`);

        const mailOptions = {
            from: remitente,
            to: emailDestinatario,
            subject: asunto,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
                    <div style="background-color: #1a5276; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0; font-size: 20px;">Plataforma ConSabiFirma</h2>
                    </div>
                    <div style="padding: 25px; background-color: #ffffff;">
                        <h3 style="color: #1a5276; margin-top: 0;">Circuito de firmas completado</h3>
                        <p style="font-size: 16px; line-height: 1.6;">El circuito de firmas para el documento <strong>${nombreDoc}</strong> se ha completado con éxito.</p>
                        <p style="font-size: 16px; line-height: 1.6;">Ya puedes acceder a la plataforma para revisar el estado y descargar la copia auténtica si lo necesitas.</p>
                        <p style="font-size: 16px;">Un saludo,</p>
                        
                        <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                            <a href="${BASE_URL}" style="background-color: #1a5276; color: white; padding: 12px 25px; text-align: center; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Acceder a ConSabiFirma</a>
                        </div>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #7f8c8d; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0;">Conservatorio Profesional de Música de Sabiñánigo</p>
                        <p style="margin: 5px 0 0 0;">Este es un aviso automático de la plataforma. Por favor, no responda a esta dirección.</p>
                    </div>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (errorMail, info) => {
            if (errorMail) {
                console.error(`❌ Error enviando alerta creador (Notificación #${notificacionId}):`, errorMail.message);
                const sqlUpdateError = `UPDATE notificaciones SET estado = 'FALLIDO', intentos = intentos + 1, error_log = ? WHERE id = ?`;
                db.run(sqlUpdateError, [errorMail.message, notificacionId]);
                return;
            }

            console.log(`✅ Alerta de finalización enviada con éxito a ${emailDestinatario} (Notificación #${notificacionId})`);
            const sqlUpdateExito = `UPDATE notificaciones SET estado = 'ENVIADO', intentos = intentos + 1, fecha_envio = (DATETIME('now', 'localtime')) WHERE id = ?`;
            db.run(sqlUpdateExito, [notificacionId]);
        });
    });
};

module.exports = { enviarAvisoFirma, enviarCopiaFinal, enviarAlertaFinalizacion };